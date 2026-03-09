import { getState } from '../state.js';

/**
 * Classify a field into one of three distinct categories:
 * 1. AI Generated (generatable) - requires written responses
 * 2. Autofillable (autofillable) - pulls from user profile
 * 3. Manual Input (manual_only) - requires explicit user selection
 * 
 * Also adds an interpretation tag to aid AI generation.
 */
export function categorizeField(question) {
  const { userProfile, vault, settings } = getState();
  const lowerText = (question.text || '').toLowerCase();
  const type = question.type || 'short_text';

  let category = 'generatable';
  let match = null;
  let interpretationTag = 'general';

  // 1. Structural Filter (Category 3: Manual Input)
  const manualTypes = ['radio', 'checkbox', 'dropdown', 'select', 'scale', 'linear_scale', 'rating', 'file_upload', 'date', 'time'];
  if (manualTypes.includes(type) || lowerText.includes('password') || lowerText.includes('ssn') || lowerText.includes('credit card')) {
    category = 'manual_only';
  }

  // 2. Keyword Filter (Category 2: Autofill)
  if (category !== 'manual_only') {
    if (lowerText.includes('name')) {
      category = 'autofillable';
      match = userProfile?.name || null;
      interpretationTag = 'name_identifier';
    } else if (lowerText.includes('email')) {
      category = 'autofillable';
      match = userProfile?.email || null;
      interpretationTag = 'email_identifier';
    } else if (lowerText.includes('phone') || lowerText.includes('mobile')) {
      category = 'autofillable';
      match = userProfile?.phone || null;
      interpretationTag = 'phone_identifier';
    } else if (lowerText.includes('linkedin')) {
      category = 'autofillable';
      match = userProfile?.commonInfo?.linkedin || null;
      interpretationTag = 'profile_link';
    } else if (lowerText.includes('github') || lowerText.includes('portfolio')) {
      category = 'autofillable';
      match = userProfile?.commonInfo?.portfolio || null;
      interpretationTag = 'portfolio_link';
    } else if (lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('city')) {
      category = 'autofillable';
      match = userProfile?.commonInfo?.location || null;
      interpretationTag = 'location_identifier';
    } else if (lowerText.includes('company') || lowerText.includes('organization')) {
      category = 'autofillable';
      match = userProfile?.commonInfo?.company || null;
      interpretationTag = 'organization_identifier';
    } else if (lowerText.includes('job title') || lowerText.includes('occupation')) {
      category = 'autofillable';
      match = userProfile?.occupation || null;
      interpretationTag = 'occupation_identifier';
    }

    // Check Vault for custom fields
    if (category !== 'autofillable' && vault) {
      for (const [key, val] of Object.entries(vault)) {
        if (lowerText.includes(key.toLowerCase())) {
          category = 'autofillable';
          match = val;
          interpretationTag = 'vault_data';
          break;
        }
      }
    }
  }

  // 3. Question Interpretation Layer (Step 5) for AI Generated fields
  if (category === 'generatable') {
    if (lowerText.includes('why do you want') || lowerText.includes('why are you interested') || lowerText.includes('motivation')) {
      interpretationTag = 'motivation_answer';
    } else if (lowerText.includes('describe your experience') || lowerText.includes('background') || lowerText.includes('past work')) {
      interpretationTag = 'experience_summary';
    } else if (lowerText.includes('expectations') || lowerText.includes('salary')) {
      interpretationTag = 'expectation_answer';
    } else if (lowerText.includes('challenge') || lowerText.includes('overcome') || lowerText.includes('difficult')) {
      interpretationTag = 'challenge_solution';
    }
  }

  // Obey global user settings for autofill
  if (category === 'autofillable' && !settings?.personalization?.autoFillPersonal) {
    category = 'generatable'; // Revert back to generatable if user disabled autofill
    match = null;
  }

  return { category, match, interpretationTag };
}
