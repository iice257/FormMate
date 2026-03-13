// /api/ai/transcribe.js
export const config = {
  maxDuration: 10,
  api: {
    bodyParser: false, // We need to handle the raw multipart form data
  },
};

const RATE_LIMIT = { max: 10, windowMs: 60_000 }; // best-effort per instance
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const buckets = new Map(); // ip -> { count, resetAt }

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
      .map(s => s.trim())
      .filter(Boolean)
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

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_BASE = 'https://api.groq.com/openai/v1';

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Missing API Key configuration' });
    }

    // Forward the multipart form data directly to Groq
    const chunks = [];
    let total = 0;
    let abortedForSize = false;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        if (!res.headersSent) res.status(413).json({ error: 'Upload too large' });
        abortedForSize = true;
        try { req.destroy(); } catch { /* noop */ }
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

        const groqRes = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': req.headers['content-type'],
          },
          body: buffer,
          signal: AbortSignal.timeout(9000)
        });

        const data = await groqRes.text();
        res.status(groqRes.status).setHeader('Content-Type', 'application/json').send(data);
      } catch (innerErr) {
        console.error('[Proxy] Transcribe fetch error:', innerErr.message);
        res.status(500).json({ error: 'Proxy fetch error or Timeout' });
      }
    });

    req.on('error', (e) => {
      console.error('[Proxy] Transcribe stream error:', e?.message || e);
    });

  } catch (err) {
    console.error('[Proxy] Transcribe error:', err.message);
    res.status(500).json({ error: 'Proxy handler error' });
  }
}
