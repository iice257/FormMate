// /api/ai/chat.js
export const config = {
  maxDuration: 10,
};

const RATE_LIMIT = { max: 30, windowMs: 60_000 }; // best-effort per instance
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

const ALLOWED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'llama3-8b-8192',
]);

export default async function handler(req, res) {
  // CORS & OPTIONS (restricted)
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

    const { model, messages, temperature, max_tokens, response_format } = req.body || {};

    if (!model || !messages) {
      return res.status(400).json({ error: 'model and messages are required' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    if (messages.length > 64) {
      return res.status(400).json({ error: 'Too many messages' });
    }

    if (!ALLOWED_MODELS.has(model)) {
      return res.status(400).json({ error: 'Model not allowed' });
    }

    // Input length validation
    const totalChars = messages.reduce((sum, m) => sum + (typeof m?.content === 'string' ? m.content.length : 0), 0);
    if (totalChars > 20_000) {
      return res.status(400).json({ error: 'Input too long' });
    }

    const temp = typeof temperature === 'number' ? temperature : 0.7;
    const body = { model, messages, temperature: Math.max(0, Math.min(temp, 2)), max_tokens: max_tokens || 1024 };
    if (response_format) body.response_format = response_format;

    const groqRes = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Setting a slightly shorter signal so it fails gracefully before Vercel 10s kill
      signal: AbortSignal.timeout(9000)
    });

    const data = await groqRes.text();
    res.status(groqRes.status).setHeader('Content-Type', 'application/json').send(data);

  } catch (err) {
    console.error('[Proxy] Chat error:', err.message);
    res.status(500).json({ error: 'Proxy error or Timeout' });
  }
}
