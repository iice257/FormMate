// /api/ai/transcribe.js
export const config = {
  maxDuration: 10,
  api: {
    bodyParser: false, // We need to handle the raw multipart form data
  },
};

export default async function handler(req, res) {
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

    // Forward the multipart form data directly to Groq
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));

    req.on('end', async () => {
      try {
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

  } catch (err) {
    console.error('[Proxy] Transcribe error:', err.message);
    res.status(500).json({ error: 'Proxy handler error' });
  }
}
