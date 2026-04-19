// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin, resolveSafeRedirect, validateSafeHttpUrl } from '../_shared/request-security.js';

export const config = {
  maxDuration: 10,
};

const RATE_LIMIT = { max: 60, windowMs: 60_000 };
const buckets = new Map();
const GOOGLE_FORM_HOSTS = new Set(['docs.google.com', 'forms.gle']);

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
  const host = String(parsed.hostname || '').toLowerCase();
  if (!GOOGLE_FORM_HOSTS.has(host)) {
    return null;
  }

  if (host === 'forms.gle') {
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

export function validateGoogleFormUrl(rawUrl) {
  const checked = validateSafeHttpUrl(rawUrl);
  if (!checked.ok) return checked;

  try {
    const parsed = new URL(checked.url);
    const host = String(parsed.hostname || '').toLowerCase();
    if (!GOOGLE_FORM_HOSTS.has(host)) {
      return { ok: false, reason: 'Only Google Forms URLs are allowed.' };
    }
    if (host === 'docs.google.com' && !parsed.pathname.startsWith('/forms/')) {
      return { ok: false, reason: 'Unsupported Google Forms path.' };
    }
    return { ok: true, url: parsed.toString(), host };
  } catch {
    return { ok: false, reason: 'Invalid Google Forms URL.' };
  }
}

export function resolveGoogleFormRedirect(currentUrl, locationHeader) {
  const nextTarget = resolveSafeRedirect(currentUrl, locationHeader);
  if (!nextTarget.ok) return nextTarget;
  return validateGoogleFormUrl(nextTarget.url);
}

async function fetchGoogleFormHtml(startUrl, fetchHeaders) {
  let currentUrl = startUrl;
  let response = null;

  for (let hop = 0; hop < 5; hop += 1) {
    response = await fetch(currentUrl, {
      headers: fetchHeaders,
      redirect: 'manual',
      signal: AbortSignal.timeout(8500),
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      const html = await response.text();
      return { response, html, finalUrl: currentUrl };
    }

    const location = response.headers.get('location');
    if (!location) {
      return {
        error: {
          status: 400,
          payload: {
            error: 'BAD_REQUEST',
            message: 'Redirect target is missing.',
            authRequired: false,
            normalizedUrl: startUrl,
            finalUrl: currentUrl,
            httpStatus: response.status,
          }
        }
      };
    }

    const nextTarget = resolveGoogleFormRedirect(currentUrl, location);
    if (!nextTarget.ok) {
      return {
        error: {
          status: 400,
          payload: {
            error: 'BAD_REQUEST',
            message: `Blocked redirect target: ${nextTarget.reason}`,
            authRequired: false,
            normalizedUrl: startUrl,
            finalUrl: currentUrl,
            httpStatus: response.status,
          }
        }
      };
    }

    currentUrl = nextTarget.url;
  }

  return {
    error: {
      status: 400,
      payload: {
        error: 'BAD_REQUEST',
        message: 'Too many redirects while fetching the Google Form.',
        authRequired: false,
        normalizedUrl: startUrl,
        finalUrl: currentUrl,
      }
    }
  };
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
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Rate limit exceeded.', authRequired: false });
    }

    if (req.headers.origin && !allowedOrigin) {
      return res.status(403).json({ error: 'AUTH_REQUIRED', message: 'Access denied.', authRequired: false });
    }

    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const formId = typeof req.query.formId === 'string' ? req.query.formId : '';
    if (!rawUrl && !formId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'url or formId is required.', authRequired: false });
    }

    const normalizedUrl = normalizeGoogleFormUrl(rawUrl, formId);
    if (!normalizedUrl) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Only Google Forms URLs are allowed.', authRequired: false });
    }
    const checkedUrl = validateGoogleFormUrl(normalizedUrl);
    if (!checkedUrl.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: checkedUrl.reason, authRequired: false });
    }

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
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

    let fetchResult = await fetchGoogleFormHtml(checkedUrl.url, fetchHeaders);
    if (fetchResult.error) {
      return res.status(fetchResult.error.status).json(fetchResult.error.payload);
    }

    let response = fetchResult.response;
    let html = fetchResult.html;
    let finalUrl = fetchResult.finalUrl || checkedUrl.url;
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
        fetchResult = await fetchGoogleFormHtml(formResponseUrl, fetchHeaders);
        if (fetchResult.error) {
          return res.status(fetchResult.error.status).json(fetchResult.error.payload);
        }

        response = fetchResult.response;
        html = fetchResult.html;
        finalUrl = fetchResult.finalUrl || formResponseUrl;

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
    res.status(500).json({ error: 'PROXY_ERROR', message: 'Failed to fetch Google Form or timed out.', authRequired: false });
  }
}
