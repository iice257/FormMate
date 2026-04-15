// @ts-nocheck

import { EVIDENCE_SOURCE } from './schema';
import { simpleStableHash } from './normalize';

export function createEvidence(source, value, weight = 0.5, notes = '') {
  const normalizedSource = source || EVIDENCE_SOURCE.MODEL;
  const normalizedValue = String(value || '').trim();
  return {
    id: `ev_${simpleStableHash(`${normalizedSource}|${normalizedValue}|${notes}`)}`,
    source: normalizedSource,
    value: normalizedValue,
    weight: clamp(weight, 0, 1),
    notes: notes ? String(notes) : undefined,
  };
}

export function appendEvidence(evidenceList, evidence) {
  const next = Array.isArray(evidenceList) ? evidenceList : [];
  if (!evidence || !evidence.id) return next;
  if (next.some((entry) => entry.id === evidence.id)) return next;
  next.push(evidence);
  return next;
}

export function aggregateEvidenceConfidence(evidenceList, fallback = 0.5) {
  const entries = Array.isArray(evidenceList) ? evidenceList : [];
  if (entries.length === 0) return clamp(fallback, 0, 1);

  const sum = entries.reduce((total, entry) => total + clamp(entry?.weight ?? 0, 0, 1), 0);
  return clamp(sum / entries.length, 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

