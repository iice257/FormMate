// @ts-nocheck
const DEFAULT_SCOPES = 'openid email profile';
const PKCE_VERIFIER_KEY = 'formmate_supabase_pkce_verifier';

let supabaseClient = null;

function getEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }
  return undefined;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function getSupabaseUrl() {
  return String(getEnv('VITE_SUPABASE_URL') || '').trim().replace(/\/+$/, '');
}

function getSupabaseAnonKey() {
  return String(getEnv('VITE_SUPABASE_ANON_KEY') || '').trim();
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function getAuthRedirectUrl() {
  if (!isBrowser()) return undefined;
  return `${window.location.origin}/auth`;
}

function authBaseHeaders(accessToken = null, contentType = false) {
  const headers = {
    apikey: getSupabaseAnonKey(),
    Authorization: `Bearer ${String(accessToken || getSupabaseAnonKey()).trim()}`,
    Accept: 'application/json',
  };

  if (contentType) headers['Content-Type'] = 'application/json';
  return headers;
}

async function authRequest(path, { method = 'GET', body = null, accessToken = null, form = false } = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase auth is not configured.');
  }

  const url = `${getSupabaseUrl()}${path}`;
  const options = {
    method,
    headers: authBaseHeaders(accessToken, body !== null && !form),
  };

  if (body !== null) {
    const sanitizedBody = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null));
    options.body = form ? new URLSearchParams(sanitizedBody) : JSON.stringify(sanitizedBody);
    if (form) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }

  const res = await fetch(url, options);
  const text = await res.text().catch(() => '');
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const message = data?.msg || data?.error_description || data?.error || text || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function createAuthAdapter() {
  return {
    async getSession() {
      return null;
    },

    async signUp({ email, password, options = {} }) {
      const data = await authRequest('/auth/v1/signup', {
        method: 'POST',
        body: {
          email,
          password,
          data: options.data || {},
          gotrue_meta_security: {
            captcha_token: options.captchaToken || undefined,
          },
        },
      });

      return normalizeAuthResponse(data);
    },

    async signInWithPassword({ email, password }) {
      const data = await authRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: { email, password },
        form: true,
      });

      return normalizeAuthResponse(data);
    },

    async signInWithOAuth({ provider, options = {} }) {
      const redirectTo = options.redirectTo || getAuthRedirectUrl();
      const verifier = createPkceVerifier();
      const challenge = await createPkceChallenge(verifier);

      if (isBrowser()) {
        sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
      }

      const url = new URL(`${getSupabaseUrl()}/auth/v1/authorize`);
      url.searchParams.set('provider', provider);
      if (redirectTo) url.searchParams.set('redirect_to', redirectTo);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('scope', options.scopes || DEFAULT_SCOPES);

      if (options.queryParams) {
        for (const [key, value] of Object.entries(options.queryParams)) {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        }
      }

      return { data: { url: url.toString() }, error: null };
    },

    async exchangeCodeForSession(code, redirectTo = getAuthRedirectUrl()) {
      const verifier = isBrowser() ? sessionStorage.getItem(PKCE_VERIFIER_KEY) : null;
      const data = await authRequest('/auth/v1/oauth/token', {
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
          code,
          code_verifier: verifier || undefined,
          redirect_uri: redirectTo || undefined,
        },
        form: true,
      });

      if (isBrowser()) {
        sessionStorage.removeItem(PKCE_VERIFIER_KEY);
      }

      return normalizeAuthResponse(data);
    },

    async refreshSession(refreshToken) {
      const data = await authRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        form: true,
      });

      return normalizeAuthResponse(data);
    },

    async getUser(accessToken) {
      return authRequest('/auth/v1/user', {
        accessToken,
      });
    },

    async updateUser({ accessToken, password, data }) {
      return authRequest('/auth/v1/user', {
        method: 'PUT',
        accessToken,
        body: {
          ...(data ? { data } : {}),
          ...(password ? { password } : {}),
        },
      });
    },

    async resetPasswordForEmail(email, { redirectTo } = {}) {
      return authRequest('/auth/v1/recover', {
        method: 'POST',
        body: {
          email,
          redirect_to: redirectTo || undefined,
        },
      });
    },

    async signOut(accessToken) {
      try {
        await authRequest('/auth/v1/logout', {
          method: 'POST',
          accessToken,
          body: {},
        });
      } catch (error) {
        // Logout should remain best-effort; local sign-out still clears state.
        console.warn('[SupabaseClient] Remote sign-out failed:', error);
      }
      return { error: null };
    },
  };
}

function normalizeAuthResponse(data) {
  const hasTokens = Boolean(data?.access_token || data?.refresh_token);
  const session = hasTokens ? normalizeSession(data) : null;
  return {
    data: {
      session,
      user: session?.user || data?.user || null,
    },
    error: null,
  };
}

function normalizeSession(raw) {
  if (!raw) return null;
  const user = raw.user || {};
  const metadata = user.user_metadata || {};
  const name = String(metadata.name || metadata.full_name || user.name || user.email || 'User').trim();
  const avatar = metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2298da&color=fff&bold=true`;

  return {
    access_token: raw.access_token || raw.accessToken || null,
    refresh_token: raw.refresh_token || raw.refreshToken || null,
    expires_in: raw.expires_in ?? raw.expiresIn ?? null,
    expires_at: raw.expires_at ?? raw.expiresAt ?? null,
    token_type: raw.token_type || raw.tokenType || 'bearer',
    user: {
      ...user,
      id: user.id,
      email: user.email || '',
      name,
      avatar,
      provider: user.app_metadata?.provider || user.app_metadata?.providers?.[0] || raw.provider || 'email',
      tier: user.app_metadata?.tier || metadata.tier || raw.tier || 'free',
    },
  };
}

function createPkceVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function createPkceChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!isSupabaseConfigured()) return null;

  supabaseClient = {
    auth: createAuthAdapter(),
  };

  return supabaseClient;
}
