// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin, resolveSafeRedirect, validateSafeHttpUrl } from '../_shared/request-security';

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
  const origin = getRequestOrigin(req);
  return isAllowedOrigin(origin) ? origin : null;
}

export default async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-FormMate-Session, X-FormMate-Dev-Auth');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!(await assertTrustedAppSignal(req, res, 'Access denied.'))) {
      return;
    }

    const rl = rateLimit(req);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSec || 2));
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Rate limit exceeded.' });
    }

    if (req.headers.origin && !allowedOrigin) {
      return res.status(403).json({ error: 'AUTH_REQUIRED', message: 'Access denied.' });
    }

    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'BAD_REQUEST', message: 'URL is required.' });

    const checked = validateSafeHttpUrl(url);
    if (!checked.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: `Blocked URL: ${checked.reason}` });
    }

    let currentUrl = checked.url;
    let response = null;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    };

    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(currentUrl, {
        headers: fetchHeaders,
        redirect: 'manual',
        signal: AbortSignal.timeout(8500),
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) {
        break;
      }

      const location = response.headers.get('location');
      if (!location) {
        return res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'Redirect target is missing.',
          normalizedUrl: checked.url,
          finalUrl: currentUrl,
          httpStatus: response.status,
        });
      }

      const nextTarget = resolveSafeRedirect(currentUrl, location);
      if (!nextTarget.ok) {
        return res.status(400).json({
          error: 'BAD_REQUEST',
          message: `Blocked redirect target: ${nextTarget.reason}`,
          normalizedUrl: checked.url,
          finalUrl: currentUrl,
          httpStatus: response.status,
        });
      }

      currentUrl = nextTarget.url;
    }

    if (!response) {
      return res.status(500).json({ error: 'PROXY_ERROR', message: 'No response received.' });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'UPSTREAM_ERROR',
        message: 'Failed to fetch the provided URL.',
        normalizedUrl: checked.url,
        finalUrl: currentUrl,
        httpStatus: response.status,
      });
    }

    let html = await response.text();
    if (html.length > 900_000) html = html.slice(0, 900_000);

    const cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return res.status(200).json({
      html: cleanedHtml,
      normalizedUrl: checked.url,
      finalUrl: currentUrl,
      httpStatus: response.status,
      fetchStrategy: 'direct_html',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Scrape] Error:', message);
    res.status(500).json({ error: 'PROXY_ERROR', message: 'Failed to scrape the provided URL or timed out.' });
  }
}
