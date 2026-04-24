// @ts-nocheck

const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCRIPT_ID = 'formmate-google-identity-services';

let googleScriptPromise = null;

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }
  return undefined;
}

export function getGoogleClientId() {
  return String(
    getEnv('VITE_GOOGLE_CLIENT_ID') ||
    getEnv('VITE_GOOGLE_OAUTH_CLIENT_ID') ||
    '',
  ).trim();
}

export function isGoogleIdentityConfigured() {
  return Boolean(getGoogleClientId());
}

export async function initializeGoogleIdentity({
  autoSelect = false,
  context = 'signin',
  onCredential,
  cancelOnTapOutside = true,
} = {}) {
  if (!isBrowser()) return { google: null, nonce: null };

  const clientId = getGoogleClientId();
  if (!clientId) {
    console.info('[GoogleOneTap] Skipping initialization because VITE_GOOGLE_CLIENT_ID is not configured.');
    return { google: null, nonce: null };
  }

  if (typeof onCredential !== 'function') {
    console.warn('[GoogleOneTap] Skipping initialization because no credential handler was provided.');
    return { google: null, nonce: null };
  }

  const google = await loadGoogleIdentityScript();
  if (!google?.accounts?.id) {
    console.warn('[GoogleOneTap] Google Identity Services did not initialize.');
    return { google: null, nonce: null };
  }

  const { nonce, hashedNonce } = await generateNoncePair();

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      onCredential(response, { nonce, autoSelect });
    },
    auto_select: Boolean(autoSelect),
    context,
    nonce: hashedNonce,
    cancel_on_tap_outside: Boolean(cancelOnTapOutside),
    itp_support: true,
    use_fedcm_for_prompt: true,
  });

  return { google, nonce };
}

export async function promptGoogleOneTap({
  autoSelect = false,
  context = 'signin',
  onCredential,
  onPromptMoment,
  cancelOnTapOutside = true,
} = {}) {
  if (!isBrowser()) return { started: false, reason: 'not_browser' };
  const { google } = await initializeGoogleIdentity({
    autoSelect,
    context,
    onCredential,
    cancelOnTapOutside,
  });
  if (!google?.accounts?.id) {
    return {
      started: false,
      reason: isGoogleIdentityConfigured() ? 'script_unavailable' : 'missing_client_id',
    };
  }

  google.accounts.id.prompt((notification) => {
    try {
      onPromptMoment?.(normalizePromptNotification(notification));
    } catch (error) {
      console.warn('[GoogleOneTap] Prompt moment handler failed:', error);
    }
  });

  return { started: true };
}

export async function renderGoogleSignInButton(
  parent,
  {
    context = 'signin',
    text = 'signin_with',
    theme = 'outline',
    size = 'large',
    shape = 'pill',
    width,
    logoAlignment = 'left',
    onCredential,
  } = {},
) {
  if (!parent || !isBrowser()) {
    return { rendered: false, reason: 'missing_parent' };
  }

  const { google } = await initializeGoogleIdentity({
    autoSelect: false,
    context,
    onCredential,
    cancelOnTapOutside: true,
  });

  if (!google?.accounts?.id) {
    parent.replaceChildren();
    return {
      rendered: false,
      reason: isGoogleIdentityConfigured() ? 'script_unavailable' : 'missing_client_id',
    };
  }

  parent.replaceChildren();
  google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme,
    size,
    text,
    shape,
    logo_alignment: logoAlignment,
    width,
  });

  return { rendered: true };
}

export function cancelGoogleOneTap() {
  if (!isBrowser()) return;
  try {
    window.google?.accounts?.id?.cancel?.();
  } catch (error) {
    console.warn('[GoogleOneTap] Could not cancel prompt:', error);
  }
}

export function disableGoogleAutoSelect() {
  if (!isBrowser()) return;
  try {
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch (error) {
    console.warn('[GoogleOneTap] Could not disable auto-select:', error);
  }
}

function loadGoogleIdentityScript() {
  if (!isBrowser()) return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Identity Services failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Google Identity Services failed to load.'));
    document.head.appendChild(script);
  }).catch((error) => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
}

async function generateNoncePair() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));
  const encoded = new TextEncoder().encode(nonce);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const hashedNonce = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return { nonce, hashedNonce };
}

function normalizePromptNotification(notification) {
  if (!notification) return { momentType: 'unknown' };
  const safeCall = (method) => {
    try {
      return typeof notification[method] === 'function' ? notification[method]() : undefined;
    } catch {
      return undefined;
    }
  };

  return {
    momentType: safeCall('getMomentType'),
    displayed: safeCall('isDisplayed'),
    skipped: safeCall('isSkippedMoment'),
    dismissed: safeCall('isDismissedMoment'),
    displayReason: safeCall('getNotDisplayedReason'),
    skippedReason: safeCall('getSkippedReason'),
    dismissedReason: safeCall('getDismissedReason'),
  };
}
