export function parseDOM(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const formData = {
    title: doc.title || 'Unknown Form',
    description: '',
    questions: [],
    requiresAuth: false,
    requiresRender: false,
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
      requiresAuth: true,
      requiresRender: false
    };
  }

  // JS-rendered shell detection (client-side forms that won't parse reliably from HTML snapshots)
  const shellSignals = [
    'enable javascript',
    'please enable javascript',
    'you need to enable javascript to run this app',
    'this application requires javascript',
    'javascript is disabled'
  ];
  const noscriptText = (doc.querySelector('noscript')?.textContent || '').toLowerCase();
  const lowerPage = String(pageText || '').toLowerCase();
  if (shellSignals.some(s => lowerPage.includes(s) || noscriptText.includes(s))) {
    formData.requiresRender = true;
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

  // Third fallback: derive containers from actual form controls (generic web forms)
  if (items.length === 0) {
    const forms = Array.from(doc.querySelectorAll('form'));
    const target = forms.sort((a, b) =>
      b.querySelectorAll('input,textarea,select').length - a.querySelectorAll('input,textarea,select').length
    )[0] || doc.body;

    const controls = Array.from(target?.querySelectorAll('input,textarea,select') || []).filter((el) => {
      if (!el || el.disabled) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (el.tagName?.toLowerCase() === 'input') {
        const t = String(el.getAttribute('type') || '').toLowerCase();
        if (['hidden', 'submit', 'button', 'reset', 'image'].includes(t)) return false;
      }
      return true;
    });

    const containerSet = new Set();
    controls.forEach((el) => {
      const container =
        el.closest('fieldset') ||
        el.closest('.form-group') ||
        el.closest('.field') ||
        el.closest('.input-group') ||
        el.closest('label') ||
        el.parentElement;
      if (container) containerSet.add(container);
    });

    items = Array.from(containerSet);
  }

  items.forEach((item, index) => {
    // Extract question text
    let textEl = item.querySelector('div[role="heading"]')
      || item.querySelector('.M7eMe')
      || item.querySelector('label')
      || item.querySelector('.question-title');

    const rawText = textEl ? textEl.textContent.trim() : `Question ${index + 1}`;
    const requiredFromText = /\*\s*$/.test(rawText);
    let text = rawText.replace(/\s*\*\s*$/, '').trim(); // Remove required star

    // Determine required (avoid item.innerHTML heuristics)
    const required = requiredFromText || Boolean(
      item.querySelector('[aria-required="true"], input[required], textarea[required], select[required]')
    );

    // Determine field type
    let type = 'short_text';
    let options = [];

    // Google Forms ARIA-based radio/checkbox extraction (preferred)
    const ariaRadios = Array.from(item.querySelectorAll('[role="radio"]'));
    const ariaChecks = Array.from(item.querySelectorAll('[role="checkbox"]'));
    if (ariaRadios.length > 0) {
      type = 'radio';
      options = ariaRadios.map(i => i.getAttribute('aria-label') || i.textContent.trim()).filter(Boolean);
    } else if (ariaChecks.length > 0) {
      type = 'checkbox';
      options = ariaChecks.map(i => i.getAttribute('aria-label') || i.textContent.trim()).filter(Boolean);
    }

    const inputs = Array.from(item.querySelectorAll('input, textarea, select'));
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
          options = inputs
            .filter(i => i.tagName?.toLowerCase() === 'input' && String(i.getAttribute('type') || '').toLowerCase() === 'radio')
            .map(i => item.querySelector(`label[for="${i.id}"]`)?.textContent || i.value)
            .filter(Boolean);
        } else if (inputType === 'checkbox') {
          type = 'checkbox';
          options = inputs
            .filter(i => i.tagName?.toLowerCase() === 'input' && String(i.getAttribute('type') || '').toLowerCase() === 'checkbox')
            .map(i => item.querySelector(`label[for="${i.id}"]`)?.textContent || i.value)
            .filter(Boolean);
        } else if (inputType === 'date') {
          type = 'date';
        } else {
          type = 'short_text';
        }
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
