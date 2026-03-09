export function parseDOM(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const formData = {
    title: doc.title || 'Unknown Form',
    description: '',
    questions: [],
  };

  // Auth / Cookie Wall Detection — don't throw, return a flag so callers can retry
  const pageText = doc.body?.textContent || '';
  const authSignals = [
    "Can't access your Google Account",
    "Sign in to continue",
    "Sign in to Google",
    "Sign in – Google Accounts",
    "You need permission",
    "This form can only be viewed by users in the owner"
  ];
  if (authSignals.some(signal => pageText.includes(signal))) {
    return {
      title: 'Unknown Form',
      description: '',
      questions: [],
      requiresAuth: true
    };
  }

  // Attempt to find actual form title and description if it's Google Forms
  const titleEl = doc.querySelector('.F9yp7e')
    || doc.querySelector('div[role="heading"][aria-level="1"]')
    || doc.querySelector('.freebirdFormviewerViewHeaderTitle')
    || doc.querySelector('.Qr7Oae');
  if (titleEl) formData.title = titleEl.textContent.trim();

  const descEl = doc.querySelector('.wGQFbe')
    || doc.querySelector('.freebirdFormviewerViewHeaderDescription')
    || doc.querySelector('.cBGGJ');
  if (descEl) formData.description = descEl.textContent.trim();

  // Primary selector: role="listitem" (Google Forms primarily)
  let items = Array.from(doc.querySelectorAll('div[role="listitem"]'));

  // Secondary fallback: typical field containers if not Google Forms
  if (items.length === 0) {
    items = Array.from(doc.querySelectorAll('.freebirdFormviewerViewItemsItemItem, .geS5n, .Qr7Oae, fieldset, .form-group'));
  }

  // Third fallback: Just grab all labels and associate inputs
  if (items.length === 0) {
    const labels = Array.from(doc.querySelectorAll('label'));
    items = labels.map(label => label.parentElement);
  }

  items.forEach((item, index) => {
    // Extract question text
    let textEl = item.querySelector('div[role="heading"]')
      || item.querySelector('.M7eMe')
      || item.querySelector('label')
      || item.querySelector('.question-title');

    let text = textEl ? textEl.textContent.trim() : `Question ${index + 1}`;
    text = text.replace(/\s*\*\s*$/, ''); // Remove required star

    // Determine required
    const required = item.innerHTML.includes('aria-required="true"') ||
      item.innerHTML.includes('required') ||
      item.innerHTML.includes('*');

    // Determine field type
    let type = 'short_text';
    let options = [];

    const inputs = Array.from(item.querySelectorAll('input, textarea, select, [role="radio"], [role="checkbox"]'));
    if (inputs.length > 0) {
      const firstInput = inputs[0];
      const tag = firstInput.tagName.toLowerCase();

      if (tag === 'textarea') {
        type = 'long_text';
      } else if (tag === 'select') {
        type = 'dropdown';
        options = Array.from(firstInput.querySelectorAll('option')).map(o => o.textContent.trim()).filter(Boolean);
      } else if (tag === 'input') {
        const inputType = firstInput.getAttribute('type');
        if (inputType === 'radio') {
          type = 'radio';
          options = inputs.map(i => item.querySelector(`label[for="${i.id}"]`)?.textContent || i.value).filter(Boolean);
        } else if (inputType === 'checkbox') {
          type = 'checkbox';
          options = inputs.map(i => item.querySelector(`label[for="${i.id}"]`)?.textContent || i.value).filter(Boolean);
        } else if (inputType === 'date') {
          type = 'date';
        } else {
          type = 'short_text';
        }
      }

      // Google Forms ARIA-based radio/checkbox extraction
      const role = firstInput.getAttribute('role');
      if (role === 'radio') {
        type = 'radio';
        options = inputs.map(i => i.getAttribute('aria-label') || i.textContent.trim()).filter(Boolean);
      } else if (role === 'checkbox') {
        type = 'checkbox';
        options = inputs.map(i => i.getAttribute('aria-label') || i.textContent.trim()).filter(Boolean);
      }
    } else {
      type = 'unknown_type';
    }

    // Attempt to extract options for Google Forms complex drop downs
    if (type === 'unknown_type' && item.querySelector('[role="listbox"]')) {
      type = 'dropdown';
      options = Array.from(item.querySelectorAll('[role="option"]')).map(o => o.getAttribute('data-value') || o.textContent).filter(Boolean);
    }

    // Scale heuristic
    if (item.querySelectorAll('[role="radio"]').length > 3 && item.textContent.match(/\d+.*to.*\d+/i)) {
      type = 'linear_scale';
    }

    // Clean up options (if any are just 'undefined' or empty)
    options = options.map(o => String(o).trim()).filter(o => o && o !== 'undefined');

    formData.questions.push({
      id: String(index + 1),
      text,
      type,
      required,
      options
    });
  });

  return formData;
}
