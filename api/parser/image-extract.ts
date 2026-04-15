// @ts-nocheck
import { assertTrustedAppSignal, getRequestOrigin, isAllowedOrigin } from '../_shared/request-security';

export const config = {
  maxDuration: 10,
};

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-FormMate-Session, X-FormMate-Dev-Auth');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST is supported for image extraction.',
    });
  }

  try {
    if (!(await assertTrustedAppSignal(req, res, 'Access denied.'))) {
      return;
    }

    const images = Array.isArray(req.body?.images) ? req.body.images.filter(Boolean) : [];
    if (!images.length) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'images[] is required.',
      });
    }

    // Lightweight boundary endpoint:
    // OCR/image parser integration can be wired here without changing client contracts.
    return res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: 'Image extraction backend is not implemented yet.',
      nextStepRequired: true,
      nextStepHint: 'Use Assisted Capture for now, or upload additional screenshots after OCR service is enabled.',
      canonicalForm: null,
      legacyFormData: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ImageExtract] Error:', message);
    return res.status(500).json({
      error: 'IMAGE_EXTRACT_ERROR',
      message: 'Unexpected image extraction failure.',
    });
  }
}

