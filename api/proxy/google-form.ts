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

function cleanHtml(html) {
  return String(html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGoogleFormIdFromUrl(url) {
  const normalized = String(url || '');
  const embedMatch = normalized.match(/docs\.google\.com\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];

  const longMatch = normalized.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (longMatch) return longMatch[1];

  return null;
}

function normalizeGoogleFormUrl(rawUrl, formId) {
  if (formId) {
    return `https://docs.google.com/forms/d/${formId}/viewform`;
  }

  const parsed = new URL(String(rawUrl || ''));
  if (parsed.hostname === 'forms.gle') {
    return parsed.toString();
  }

  const extracted = extractGoogleFormIdFromUrl(parsed.toString());
  if (extracted) {
    return parsed.pathname.includes('/forms/d/e/')
      ? `https://docs.google.com/forms/d/e/${extracted}/viewform`
      : `https://docs.google.com/forms/d/${extracted}/viewform`;
  }

  return parsed.toString();
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

    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const formId = typeof req.query.formId === 'string' ? req.query.formId : '';
    if (!rawUrl && !formId) {
      return res.status(400).json({ error: 'url or formId is required', authRequired: false });
    }

    const normalizedUrl = normalizeGoogleFormUrl(rawUrl, formId);

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const fetchOpts = {
      headers: fetchHeaders,
      redirect: 'follow',
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
    const isAuthWall = (html) => authSignals.some((signal) => String(html || '').includes(signal));

    let response = await fetch(normalizedUrl, fetchOpts);
    let html = await response.text();
    let finalUrl = response.url || normalizedUrl;
    const resolvedFormId = extractGoogleFormIdFromUrl(finalUrl) || extractGoogleFormIdFromUrl(normalizedUrl);

    if (response.ok && !isAuthWall(html)) {
      return res.status(200).json({
        html: cleanHtml(html),
        strategy: 'viewform',
        authRequired: false,
        normalizedUrl,
        finalUrl,
        httpStatus: response.status,
        resolvedFormId,
      });
    }

    if (resolvedFormId) {
      const formResponseUrl = finalUrl.includes('/forms/d/e/')
        ? `https://docs.google.com/forms/d/e/${resolvedFormId}/formResponse`
        : `https://docs.google.com/forms/d/${resolvedFormId}/formResponse`;
      try {
        response = await fetch(formResponseUrl, fetchOpts);
        html = await response.text();
        finalUrl = response.url || formResponseUrl;

        if (response.ok && !isAuthWall(html)) {
          return res.status(200).json({
            html: cleanHtml(html),
            strategy: 'formResponse',
            authRequired: false,
            normalizedUrl,
            finalUrl,
            httpStatus: response.status,
            resolvedFormId,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[GoogleForm] Strategy 2 setup fetch error: ${message}`);
      }
    }

    const fbDataMatch = String(html || '').match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
    if (fbDataMatch) {
      return res.status(200).json({
        fbPublicLoadData: fbDataMatch[1],
        strategy: 'fb_public_load_data',
        authRequired: isAuthWall(html),
        html: cleanHtml(html),
        normalizedUrl,
        finalUrl,
        httpStatus: response.status,
        resolvedFormId,
      });
    }

    return res.status(200).json({
      html: cleanHtml(html),
      strategy: 'fallback',
      authRequired: isAuthWall(html),
      normalizedUrl,
      finalUrl,
      httpStatus: response.status,
      resolvedFormId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GoogleForm] Error:', message);
    res.status(500).json({ error: 'Failed to fetch Google Form or timed out', authRequired: false });
  }
}
