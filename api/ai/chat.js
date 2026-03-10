// /api/ai/chat.js
export const config = {
  maxDuration: 10,
};

export default async function handler(req, res) {
  // CORS & OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    const GROQ_BASE = 'https://api.groq.com/openai/v1';

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Missing API Key configuration' });
    }

    const { model, messages, temperature, max_tokens, response_format } = req.body;

    if (!model || !messages) {
      return res.status(400).json({ error: 'model and messages are required' });
    }

    // Input length validation
    const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    if (totalChars > 20_000) {
      return res.status(400).json({ error: 'Input too long' });
    }

    const body = { model, messages, temperature: temperature || 0.7, max_tokens: max_tokens || 1024 };
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
