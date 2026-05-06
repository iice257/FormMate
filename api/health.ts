// @ts-nocheck
import { getRequestOrigin, isAllowedOrigin } from './_shared/request-security.js';

export const FORM_MATE_API_VERSION = '2026-04-18.1';

function getStorageMode() {
  const raw = String(process.env.VITE_STORAGE_PROVIDER || '').trim().toLowerCase();
  const supabaseConfigured = Boolean(
    String(process.env.VITE_SUPABASE_URL || '').trim() &&
    String(process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim(),
  );
  if (raw === 'supabase') return 'supabase';
  if (!raw && supabaseConfigured) return 'supabase';
  return 'local';
}

function buildConfigHealth() {
  const groqConfigured = Boolean(String(process.env.GROQ_API_KEY || '').trim());
  const supabaseConfigured = Boolean(
    String(process.env.VITE_SUPABASE_URL || '').trim() &&
    String(process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim(),
  );
  const storageMode = getStorageMode();
  const imageParserConfigured = groqConfigured;
  const authAvailable = supabaseConfigured;
  const syncAvailable = storageMode === 'supabase' && supabaseConfigured;
  const degradedMode = !groqConfigured || (storageMode === 'supabase' && !syncAvailable);
  return {
    apiReachable: true,
    groqConfigured,
    supabaseConfigured,
    authAvailable,
    syncAvailable,
    storageMode,
    imageParserConfigured,
    degradedMode,
  };
}

function shouldExposeConfigHealth() {
  const explicit = String(process.env.FORMMATE_EXPOSE_HEALTH_CONFIG || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(explicit)) return true;
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL_URL;
}

export default function handler(req, res) {
  const origin = getRequestOrigin(req);
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-FormMate-Session, X-FormMate-Dev-Auth');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const payload = {
    status: 'ok',
    uptime: 'ready',
    apiReachable: true,
    apiVersion: FORM_MATE_API_VERSION,
  };

  if (shouldExposeConfigHealth()) {
    payload.config = buildConfigHealth();
  }

  res.status(200).json(payload);
}
