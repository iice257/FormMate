// @ts-nocheck
export const config = {
  maxDuration: 10,
};

const RATE_LIMIT = { max: 60, windowMs: 60_000 };
const buckets = new Map();

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry || now >= entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT.max) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;

  const allow = new Set(
    String(process.env.FORMMATE_ALLOWED_ORIGINS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  allow.add('http://localhost:5173');
  allow.add('http://127.0.0.1:5173');
  allow.add('http://localhost:5174');
  allow.add('http://127.0.0.1:5174');

  if (process.env.VERCEL_URL) {
    allow.add(`https://${process.env.VERCEL_URL}`);
  }

  return allow.has(origin) ? origin : null;
}

function cleanHtml(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rl = rateLimit(req);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSec || 2));
      return res.status(429).json({ error: 'Rate limit exceeded', authRequired: false });
    }

    if (req.headers.origin && !allowedOrigin) {
      return res.status(403).json({ error: 'Origin not allowed', authRequired: false });
    }

    const { formId } = req.query;
    if (!formId) return res.status(400).json({ error: 'formId is required' });

    console.log(`[GoogleForm] Fetching form: ${formId}`);

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const fetchOpts = {
      headers: fetchHeaders,
      redirect: 'follow' as RequestRedirect,
      signal: AbortSignal.timeout(8500),
    };

    const authSignals = [
      'Sign in to continue',
      'Sign in to Google',
      'Sign in – Google Accounts',
      'You need permission',
      "Can't access your Google Account",
      'This form can only be viewed by users in the owner',
    ];
    const isAuthWall = (html: string) => authSignals.some((signal) => html.includes(signal));

    const viewformUrl = `https://docs.google.com/forms/d/${formId}/viewform`;
    let response = await fetch(viewformUrl, fetchOpts);
    let html = await response.text();

    if (response.ok && !isAuthWall(html)) {
      return res.status(200).json({ html: cleanHtml(html), strategy: 'viewform', authRequired: false });
    }

    const formResponseUrl = `https://docs.google.com/forms/d/${formId}/formResponse`;
    try {
      response = await fetch(formResponseUrl, fetchOpts);
      html = await response.text();

      if (response.ok && !isAuthWall(html)) {
        return res.status(200).json({ html: cleanHtml(html), strategy: 'formResponse', authRequired: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[GoogleForm] Strategy 2 setup fetch error: ${message}`);
    }

    const fbDataMatch = html.match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
    if (fbDataMatch) {
      return res.status(200).json({
        fbPublicLoadData: fbDataMatch[1],
        strategy: 'fb_public_load_data',
        authRequired: true,
        html: cleanHtml(html),
      });
    }

    return res.status(200).json({
      html: cleanHtml(html),
      strategy: 'fallback',
      authRequired: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GoogleForm] Error:', message);
    res.status(500).json({ error: 'Failed to fetch Google Form or timed out', authRequired: true });
  }
}
