// @ts-nocheck
import net from 'node:net';
import dns from 'node:dns/promises';

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:4174',
  'http://127.0.0.1:4174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]);

const PRIVATE_HOST_PATTERNS = [
  'localhost',
  '.local',
  '.internal',
];
const LOCAL_ORIGIN_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SESSION_CACHE_TTL_MS = 60_000;
const MAX_SESSION_CACHE_ENTRIES = 256;
const AUTH_RATE_LIMIT = { max: 120, windowMs: 60_000 };
const sessionCache = new Map();
const authBuckets = new Map();

function readHeader(req, name) {
  return req?.headers?.[name] || req?.headers?.[name.toLowerCase()] || '';
}

function getEnv(key) {
  return String(process.env[key] || '').trim();
}

function normalizeBool(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

export function buildAllowedOrigins() {
  const allow = new Set(
    String(process.env.FORMMATE_ALLOWED_ORIGINS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  DEFAULT_ALLOWED_ORIGINS.forEach((origin) => allow.add(origin));

  if (process.env.VERCEL_URL) {
    allow.add(`https://${process.env.VERCEL_URL}`);
  }

  return allow;
}

export function getRequestOrigin(req) {
  const origin = String(readHeader(req, 'origin') || '').trim();
  if (origin) return origin;

  const referer = String(readHeader(req, 'referer') || '').trim();
  if (!referer) return '';

  try {
    return new URL(referer).origin;
  } catch {
    return '';
  }
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (buildAllowedOrigins().has(origin)) return true;

  // During local development, allow localhost/loopback origins on any port so Vite
  // strict-port fallback or parallel sessions don't break trusted requests.
  if (isDevAuthEnabled()) {
    return isLocalOrigin(origin);
  }

  return false;
}

function getBearerToken(req) {
  const authorization = String(readHeader(req, 'authorization') || '').trim();
  if (authorization.toLowerCase().startsWith('bearer ')) {
    const token = authorization.slice(7).trim();
    return token || '';
  }
  return '';
}

function hasSessionLikeHeader(req) {
  const sessionHeader = String(readHeader(req, 'x-formmate-session') || '').trim();
  return Boolean(
    getBearerToken(req) ||
      sessionHeader,
  );
}

function hasBrowserTrustSignal(req) {
  const origin = getRequestOrigin(req);
  const secFetchSite = String(readHeader(req, 'sec-fetch-site') || '').toLowerCase();
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return false;
  }

  const secFetchMode = String(readHeader(req, 'sec-fetch-mode') || '').toLowerCase();
  if (secFetchMode && !['cors', 'same-origin', 'navigate', 'no-cors'].includes(secFetchMode)) {
    return false;
  }

  if (origin) {
    return isAllowedOrigin(origin);
  }

  return Boolean(secFetchSite && ['same-origin', 'same-site', 'none'].includes(secFetchSite));
}

export function hasTrustedAppSignal(req) {
  return hasSessionLikeHeader(req);
}

async function validateSupabaseAccessToken(token) {
  if (!token) return null;

  pruneSessionCache();
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.session || null;
  }

  const supabaseUrl = getEnv('VITE_SUPABASE_URL').replace(/\/+$/, '');
  const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    let session = null;
    if (response.ok) {
      const payload = await response.json().catch(() => null);
      const userId = String(payload?.id || payload?.user?.id || '').trim();
      session = {
        userId,
        authKey: userId ? `user:${userId}` : `token:${token.slice(0, 24)}`,
      };
    }
    sessionCache.set(token, { session, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
    pruneSessionCache();
    return session;
  } catch {
    return null;
  }
}

export async function assertTrustedAppSignal(req, res, message = 'Access denied.') {
  const origin = getRequestOrigin(req);
  const devAuthHeader = String(readHeader(req, 'x-formmate-dev-auth') || '').trim().toLowerCase();
  if (['1', 'true'].includes(devAuthHeader)) {
    if (isLocalDevRequest(req, origin)) {
      req.formmateAuth = {
        userId: '',
        authKey: `dev:${getClientIp(req)}`,
        mode: 'dev',
      };
      return true;
    }
  }

  const authLimit = rateLimitAuth(req);
  if (!authLimit.allowed) {
    res.setHeader?.('Retry-After', String(authLimit.retryAfterSec || 2));
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please wait and retry.',
    });
    return false;
  }

  const bearerToken = getBearerToken(req);
  const session = bearerToken ? await validateSupabaseAccessToken(bearerToken) : null;
  if (session) {
    req.formmateAuth = {
      ...session,
      mode: 'supabase',
    };
    return true;
  }

  res.status(401).json({
    error: 'AUTH_REQUIRED',
    message,
  });

  return false;
}

function pruneSessionCache(now = Date.now()) {
  for (const [token, entry] of sessionCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      sessionCache.delete(token);
    }
  }

  while (sessionCache.size > MAX_SESSION_CACHE_ENTRIES) {
    const oldestKey = sessionCache.keys().next().value;
    if (!oldestKey) break;
    sessionCache.delete(oldestKey);
  }
}

function shouldTrustForwardedFor() {
  if (getEnv('VERCEL') || getEnv('VERCEL_URL')) return true;
  const explicit = normalizeBool(getEnv('FORMMATE_TRUST_PROXY'));
  return explicit === true;
}

function rateLimitAuth(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = authBuckets.get(ip);
  if (!entry || now >= entry.resetAt) {
    authBuckets.set(ip, { count: 1, resetAt: now + AUTH_RATE_LIMIT.windowMs });
    return { allowed: true };
  }
  if (entry.count >= AUTH_RATE_LIMIT.max) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

export function getClientIp(req) {
  const socketIp = String(req?.socket?.remoteAddress || '').trim();
  if (!shouldTrustForwardedFor()) {
    return socketIp || 'unknown';
  }

  const xff = String(readHeader(req, 'x-forwarded-for') || '').trim();
  if (xff) {
    return xff.split(',')[0].trim();
  }
  return socketIp || 'unknown';
}

function isLoopbackAddress(rawIp) {
  const normalized = String(rawIp || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === '::1' || normalized === '::ffff:127.0.0.1') return true;
  if (normalized.startsWith('127.')) return true;
  return false;
}

function isPrivateIpAddress(rawIp) {
  const normalized = String(rawIp || '').trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === '::1' || normalized === '::ffff:127.0.0.1') return true;

  const ipType = net.isIP(normalized);
  if (!ipType) return false;

  if (ipType === 6) {
    if (normalized.startsWith('::ffff:')) {
      return isPrivateIpAddress(normalized.replace(/^::ffff:/, ''));
    }
    if (normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80')) return true;
    return false;
  }

  const parts = normalized.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;

  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;

  return false;
}

function getOriginHost(origin) {
  if (!origin) return '';
  try {
    return String(new URL(origin).hostname || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

function isLocalOrigin(origin) {
  const host = getOriginHost(origin);
  return LOCAL_ORIGIN_HOSTS.has(host);
}

function isDevAuthEnabled() {
  const explicit = normalizeBool(getEnv('FORMMATE_ENABLE_DEV_AUTH'));
  if (explicit !== null) return explicit;
  return getEnv('NODE_ENV') !== 'production' && !getEnv('VERCEL_URL');
}

function isLocalDevRequest(req, origin) {
  if (!isDevAuthEnabled()) return false;
  if (!isLocalOrigin(origin)) return false;
  return isLoopbackAddress(getClientIp(req));
}

export function isPrivateHost(host) {
  if (!host) return true;

  const normalized = String(host).trim().toLowerCase();
  if (!normalized) return true;

  if (PRIVATE_HOST_PATTERNS.some((pattern) => normalized === pattern || normalized.endsWith(pattern))) {
    return true;
  }

  const ipType = net.isIP(normalized);
  if (!ipType) return false;

  return isPrivateIpAddress(normalized);
}

export function validateSafeHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ''));
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Unsupported protocol' };
  }

  const host = String(parsed.hostname || '').toLowerCase();
  if (!host) return { ok: false, reason: 'Invalid host' };
  if (isPrivateHost(host)) return { ok: false, reason: 'Blocked private address' };

  return { ok: true, url: parsed.toString(), host };
}

export async function validateResolvedSafeHttpUrl(rawUrl, lookup = dns.lookup) {
  const checked = validateSafeHttpUrl(rawUrl);
  if (!checked.ok) return checked;

  if (net.isIP(checked.host)) {
    return checked;
  }

  let records = [];
  try {
    records = await lookup(checked.host, {
      all: true,
      verbatim: true,
    });
  } catch {
    return { ok: false, reason: 'DNS lookup failed' };
  }

  if (!records.length) {
    return { ok: false, reason: 'DNS lookup returned no addresses' };
  }

  const blocked = records.find((record) => isPrivateIpAddress(record?.address));
  if (blocked) {
    return { ok: false, reason: 'Resolved to a private address' };
  }

  return {
    ...checked,
    addresses: records.map((record) => record.address),
  };
}

export function resolveSafeRedirect(currentUrl, locationHeader) {
  try {
    const nextUrl = new URL(String(locationHeader || ''), String(currentUrl || ''));
    return validateSafeHttpUrl(nextUrl.toString());
  } catch {
    return { ok: false, reason: 'Invalid redirect target' };
  }
}

export async function resolveResolvedSafeRedirect(currentUrl, locationHeader) {
  try {
    const nextUrl = new URL(String(locationHeader || ''), String(currentUrl || ''));
    return validateResolvedSafeHttpUrl(nextUrl.toString());
  } catch {
    return { ok: false, reason: 'Invalid redirect target' };
  }
}
