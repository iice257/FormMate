import { getState } from '../state.js';

export function categorizeField(question) {
  const { userProfile, vault, settings } = getState();
  const lowerText = (question.text || '').toLowerCase();

  let category = 'generatable';
  let match = null;

  // 1. Autofillable
  if (lowerText.includes('first name') || lowerText.includes('full name') || lowerText === 'name' || lowerText.includes('last name')) {
    if (userProfile?.name) { category = 'autofillable'; match = userProfile.name; }
  } else if (lowerText.includes('email')) {
    if (userProfile?.email) { category = 'autofillable'; match = userProfile.email; }
  } else if (lowerText.includes('phone') || lowerText.includes('mobile')) {
    if (userProfile?.phone) { category = 'autofillable'; match = userProfile.phone; }
  } else if (lowerText.includes('occupation') || lowerText.includes('job title')) {
    if (userProfile?.occupation) { category = 'autofillable'; match = userProfile.occupation; }
  }

  if (category !== 'autofillable' && vault) {
    for (const [key, val] of Object.entries(vault)) {
      if (lowerText.includes(key.toLowerCase())) {
        category = 'autofillable';
        match = val;
        break;
      }
    }
  }

  // 2. Manual-only
  if (question.type === 'file_upload' || lowerText.includes('password') || lowerText.includes('credit card') || lowerText.includes('signature') || lowerText.includes('ssn') || lowerText.includes('id number') || lowerText.includes('security code')) {
    category = 'manual_only';
    match = null;
  }

  // Only allow autofill if settings permit
  if (category === 'autofillable' && !settings?.personalization?.autoFillPersonal) {
    category = 'generatable';
    match = null;
  }

  return { category, match };
}
