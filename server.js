// ═══════════════════════════════════════════
// FormMate — Backend Proxy Server
// ═══════════════════════════════════════════
//
// Express server that:
// 1. Proxies AI requests to Groq (API key stays server-side)
// 2. Serves the Vite dev build in production
// 3. Adds CSP headers
// 4. Rate-limits API endpoints
//
// Usage:
//   Development:  node server.js   (runs on :3001, Vite dev on :5173 proxies to it)
//   Production:   node server.js   (serves dist/ and API)
// ═══════════════════════════════════════════

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE = 'https://api.groq.com/openai/v1';

if (!GROQ_API_KEY) {
  console.error('❌  GROQ_API_KEY not set in .env');
  process.exit(1);
}

// ─── Middleware ───────────────────────────────

app.use(express.json({ limit: '1mb' }));

// CSP Headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' http://localhost:* ws://localhost:*",
    "font-src 'self' data:",
    "media-src 'self' blob:",
  ].join('; '));
  next();
});

// ─── Server-Side Rate Limiter ────────────────

const rateLimitMap = new Map();
const RATE_WINDOW = 60_000; // 1 minute
const RATE_MAX = 30; // requests per window

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(t => t > now - RATE_WINDOW);
  rateLimitMap.set(ip, timestamps);

  if (timestamps.length >= RATE_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
  }

  timestamps.push(now);
  next();
}

// ─── AI Chat Proxy ───────────────────────────

app.post('/api/ai/chat', rateLimit, async (req, res) => {
  try {
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
    });

    const data = await groqRes.text();
    res.status(groqRes.status).type('json').send(data);

  } catch (err) {
    console.error('[Proxy] Chat error:', err.message);
    res.status(500).json({ error: 'Proxy error' });
  }
});

// ─── AI Audio Transcription Proxy ────────────

app.post('/api/ai/transcribe', rateLimit, async (req, res) => {
  try {
    // Forward the multipart form data to Groq
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks);

      const groqRes = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': req.headers['content-type'],
        },
        body: buffer,
      });

      const data = await groqRes.text();
      res.status(groqRes.status).type('json').send(data);
    });
  } catch (err) {
    console.error('[Proxy] Transcribe error:', err.message);
    res.status(500).json({ error: 'Proxy error' });
  }
});

// ─── Web Scraping Proxy ───────────────────────

app.get('/api/proxy/scrape', rateLimit, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log(`[Scrape] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch URL: ${response.statusText}` });
    }

    const html = await response.text();

    // Basic Cleaning: Strip scripts, styles, and comments to save tokens
    const cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    res.send(cleanedHtml);
  } catch (err) {
    console.error('[Scrape] Error:', err.message);
    res.status(500).json({ error: 'Failed to scrape the provided URL' });
  }
});

// ─── Google Forms Multi-Strategy Proxy ────────

app.get('/api/proxy/google-form', rateLimit, async (req, res) => {
  try {
    const { formId } = req.query;
    if (!formId) return res.status(400).json({ error: 'formId is required' });

    console.log(`[GoogleForm] Fetching form: ${formId}`);

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const fetchOpts = {
      headers: fetchHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    };

    // Auth signal detection
    const authSignals = [
      "Sign in to continue",
      "Sign in to Google",
      "Sign in – Google Accounts",
      "You need permission",
      "Can't access your Google Account",
      "This form can only be viewed by users in the owner"
    ];

    const isAuthWall = (html) => authSignals.some(signal => html.includes(signal));

    // ── Strategy 1: Standard viewform ──
    const viewformUrl = `https://docs.google.com/forms/d/${formId}/viewform`;
    console.log(`[GoogleForm] Strategy 1: ${viewformUrl}`);

    let response = await fetch(viewformUrl, fetchOpts);
    let html = await response.text();

    if (response.ok && !isAuthWall(html)) {
      console.log(`[GoogleForm] Strategy 1 succeeded (viewform)`);
      const cleaned = cleanHtml(html);
      return res.json({ html: cleaned, strategy: 'viewform', authRequired: false });
    }

    console.log(`[GoogleForm] Strategy 1 failed (auth wall or bad response). Trying formResponse...`);

    // ── Strategy 2: formResponse URL ──
    // Google Forms renders some structure at the formResponse endpoint
    const formResponseUrl = `https://docs.google.com/forms/d/${formId}/formResponse`;
    console.log(`[GoogleForm] Strategy 2: ${formResponseUrl}`);

    try {
      response = await fetch(formResponseUrl, fetchOpts);
      html = await response.text();

      if (response.ok && !isAuthWall(html)) {
        console.log(`[GoogleForm] Strategy 2 succeeded (formResponse)`);
        const cleaned = cleanHtml(html);
        return res.json({ html: cleaned, strategy: 'formResponse', authRequired: false });
      }
    } catch (e) {
      console.log(`[GoogleForm] Strategy 2 fetch error: ${e.message}`);
    }

    // ── Strategy 3: Extract FB_PUBLIC_LOAD_DATA_ ──
    // Google sometimes embeds form structure as a JS variable even on auth-gated pages
    console.log(`[GoogleForm] Strategy 3: Checking for FB_PUBLIC_LOAD_DATA_...`);

    // Re-use the viewform HTML we already have
    const fbDataMatch = html.match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
    if (fbDataMatch) {
      console.log(`[GoogleForm] Strategy 3 succeeded — found FB_PUBLIC_LOAD_DATA_`);
      return res.json({
        fbPublicLoadData: fbDataMatch[1],
        strategy: 'fb_public_load_data',
        authRequired: true,
        html: cleanHtml(html)
      });
    }

    // All strategies exhausted
    console.log(`[GoogleForm] All strategies failed for form ${formId}`);
    return res.json({
      html: cleanHtml(html),
      strategy: 'fallback',
      authRequired: true
    });

  } catch (err) {
    console.error('[GoogleForm] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Google Form', authRequired: true });
  }
});

function cleanHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Health Check ────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-32b', 'llama-3.1-8b-instant', 'whisper-large-v3'] });
});

// ─── Static Files (Production) ───────────────

app.use(express.static(join(__dirname, 'dist')));
app.get('{*path}', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  }
});

// ─── Start ───────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  🚀 FormMate API Server running on http://localhost:${PORT}`);
  console.log(`  🔑 Groq API key: ${GROQ_API_KEY.substring(0, 8)}...${GROQ_API_KEY.slice(-4)}`);
  console.log(`  📡 Proxy: /api/ai/chat → Groq\n`);
});
