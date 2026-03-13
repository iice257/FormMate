// /api/health.js
export default function handler(req, res) {
  const origin = req.headers.origin;
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

  if (origin && allow.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'ok',
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-32b', 'llama-3.1-8b-instant', 'whisper-large-v3'],
    environment: 'vercel-serverless'
  });
}
