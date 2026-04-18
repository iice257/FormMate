// @ts-nocheck
import { getRequestOrigin, isAllowedOrigin } from './_shared/request-security.js';

export const FORM_MATE_API_VERSION = '2026-04-18.1';

function getStorageMode() {
  const raw = String(process.env.VITE_STORAGE_PROVIDER || '').trim().toLowerCase();
  const supabaseConfigured = Boolean(
    String(process.env.VITE_SUPABASE_URL || '').trim() &&
    String(process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  );
  if (raw === 'supabase') return 'supabase';
  if (!raw && supabaseConfigured) return 'supabase';
  return 'local';
}

function buildConfigHealth() {
  const groqConfigured = Boolean(String(process.env.GROQ_API_KEY || '').trim());
  const supabaseConfigured = Boolean(
    String(process.env.VITE_SUPABASE_URL || '').trim() &&
    String(process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  );
  const storageMode = getStorageMode();
  const imageParserConfigured = groqConfigured;
  const degradedMode = !supabaseConfigured;
  return {
    groqConfigured,
    supabaseConfigured,
    storageMode,
    imageParserConfigured,
    degradedMode,
  };
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

  res.status(200).json({
    status: 'ok',
    uptime: 'ready',
    apiVersion: FORM_MATE_API_VERSION,
    config: buildConfigHealth(),
  });
}
