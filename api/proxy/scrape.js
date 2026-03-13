// /api/proxy/scrape.js
export const config = {
  maxDuration: 10,
};

import net from 'node:net';

const RATE_LIMIT = { max: 60, windowMs: 60_000 }; // best-effort per instance
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

function isPrivateIp(host) {
  const ipType = net.isIP(host);
  if (!ipType) return false;

  const lower = host.toLowerCase();
  if (ipType === 6) {
    if (lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7
    if (lower.startsWith('fe80')) return true; // link-local
    return false;
  }

  const parts = host.split('.').map(n => parseInt(n, 10));
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;

  return false;
}

function validateTargetUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ''));
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Unsupported protocol' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) return { ok: false, reason: 'Invalid host' };
  if (host === 'localhost' || host.endsWith('.local')) return { ok: false, reason: 'Blocked host' };
  if (isPrivateIp(host)) return { ok: false, reason: 'Blocked private address' };

  return { ok: true, url: parsed.toString() };
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
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    if (req.headers.origin && !allowedOrigin) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const checked = validateTargetUrl(url);
    if (!checked.ok) {
      return res.status(400).json({ error: `Blocked URL: ${checked.reason}` });
    }

    console.log(`[Scrape] Fetching: ${checked.url}`);

    const response = await fetch(checked.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      // 8.5s to ensure it completes before Vercel 10s timeout
      signal: AbortSignal.timeout(8500)
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch URL: ${response.statusText}` });
    }

    let html = await response.text();
    // Soft-cap to reduce memory/tokens on extremely large pages.
    if (html.length > 900_000) html = html.slice(0, 900_000);

    // Basic Cleaning: Strip scripts, styles, and comments to save tokens
    const cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    res.setHeader('Content-Type', 'text/html').send(cleanedHtml);
  } catch (err) {
    console.error('[Scrape] Error:', err.message);
    res.status(500).json({ error: 'Failed to scrape the provided URL or timed out' });
  }
}
