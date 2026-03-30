// @ts-nocheck
export const config = {
  maxDuration: 10,
  api: {
    bodyParser: false,
  },
};

const RATE_LIMIT = { max: 10, windowMs: 60_000 };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
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

export default async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rl = rateLimit(req);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSec || 2));
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    if (req.headers.origin && !allowedOrigin) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const groqBase = 'https://api.groq.com/openai/v1';

    if (!groqApiKey) {
      return res.status(500).json({ error: 'Missing API Key configuration' });
    }

    const chunks: Buffer[] = [];
    let total = 0;
    let abortedForSize = false;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        if (!res.headersSent) res.status(413).json({ error: 'Upload too large' });
        abortedForSize = true;
        try {
          req.destroy();
        } catch {
          // noop
        }
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        if (abortedForSize || res.headersSent) return;
        if (total > MAX_UPLOAD_BYTES) return;
        if (!req.headers['content-type']) {
          return res.status(400).json({ error: 'Missing content-type' });
        }

        const buffer = Buffer.concat(chunks);

        const groqRes = await fetch(`${groqBase}/audio/transcriptions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': req.headers['content-type'],
          },
          body: buffer,
          signal: AbortSignal.timeout(9000),
        });

        const data = await groqRes.text();
        res.status(groqRes.status).setHeader('Content-Type', 'application/json').send(data);
      } catch (innerError) {
        const message = innerError instanceof Error ? innerError.message : String(innerError);
        console.error('[Proxy] Transcribe fetch error:', message);
        res.status(500).json({ error: 'Proxy fetch error or Timeout' });
      }
    });

    req.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[Proxy] Transcribe stream error:', message);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Proxy] Transcribe error:', message);
    res.status(500).json({ error: 'Proxy handler error' });
  }
}
