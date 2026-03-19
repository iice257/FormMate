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

  // Auth/Cookie wall detection: return structured flags instead of throwing.
  const pageText = doc.body?.textContent || '';
  const authSignals = [
    "Can't access your Google Account",
    'Sign in to continue',
    'Sign in to Google',
    'Sign in - Google Accounts',
    'Sign in – Google Accounts',
    'You need permission',
    'This form can only be viewed by users in the owner'
  ];
  if (authSignals.some((signal) => pageText.includes(signal))) {
    return {
      title: 'Unknown Form',
      description: '',
      questions: [],
      requiresAuth: true,
      requiresRender: false
    };
  }

  // JS-rendered shell detection (forms that require client rendering).
  const shellSignals = [
    'enable javascript',
    'please enable javascript',
    'you need to enable javascript to run this app',
    'this application requires javascript',
    'javascript is disabled'
  ];
  const noscriptText = (doc.querySelector('noscript')?.textContent || '').toLowerCase();
  const lowerPage = String(pageText || '').toLowerCase();
  if (shellSignals.some((signal) => lowerPage.includes(signal) || noscriptText.includes(signal))) {
    formData.requiresRender = true;
  }

  // Best-effort title/description extraction.
  const titleEl = doc.querySelector('.F9yp7e')
    || doc.querySelector('div[role="heading"][aria-level="1"]')
    || doc.querySelector('.freebirdFormviewerViewHeaderTitle')
    || doc.querySelector('.Qr7Oae');
  if (titleEl) formData.title = titleEl.textContent.trim();

  const descEl = doc.querySelector('.wGQFbe')
    || doc.querySelector('.freebirdFormviewerViewHeaderDescription')
    || doc.querySelector('.cBGGJ');
  if (descEl) formData.description = descEl.textContent.trim();

  // Primary selector: Google Forms list items.
  let items = Array.from(doc.querySelectorAll('div[role="listitem"]'));

  // Secondary fallback: common field containers.
  if (items.length === 0) {
    items = Array.from(doc.querySelectorAll('.freebirdFormviewerViewItemsItemItem, .geS5n, .Qr7Oae, fieldset, .form-group'));
  }

  // Third fallback: derive containers from concrete controls.
  if (items.length === 0) {
    const forms = Array.from(doc.querySelectorAll('form'));
    const target = forms.sort((a, b) =>
      b.querySelectorAll('input,textarea,select').length - a.querySelectorAll('input,textarea,select').length
    )[0] || doc.body;

    const controls = Array.from(target?.querySelectorAll('input,textarea,select') || []).filter(isVisibleControl);

    const containerSet = new Set();
    controls.forEach((control) => {
      const container =
        control.closest('fieldset') ||
        control.closest('.form-group') ||
        control.closest('.field') ||
        control.closest('.input-group') ||
        control.closest('label') ||
        control.parentElement;
      if (container) containerSet.add(container);
    });

    items = Array.from(containerSet);
  }

  const seenChoiceGroups = new Set();
  let questionIndex = 1;

  items.forEach((item, index) => {
    const controls = Array.from(item.querySelectorAll('input, textarea, select')).filter(isVisibleControl);

    let text = resolveItemText(doc, item, controls, index);
    const requiredFromText = /\*\s*$/.test(text);
    text = stripRequiredMarker(text);

    let required = requiredFromText || Boolean(
      item.querySelector('[aria-required="true"], input[required], textarea[required], select[required]')
    );

    let type = controls.length > 0 ? 'short_text' : 'unknown_type';
    let options = [];

    const ariaRadios = Array.from(item.querySelectorAll('[role="radio"]'));
    const ariaChecks = Array.from(item.querySelectorAll('[role="checkbox"]'));
    if (ariaRadios.length > 0) {
      type = 'radio';
      options = ariaRadios
        .map((choice) => cleanText(choice.getAttribute('aria-label') || choice.textContent))
        .filter(Boolean);
    } else if (ariaChecks.length > 0) {
      type = 'checkbox';
      options = ariaChecks
        .map((choice) => cleanText(choice.getAttribute('aria-label') || choice.textContent))
        .filter(Boolean);
    }

    if (controls.length > 0) {
      const firstControl = controls[0];
      const tag = String(firstControl.tagName || '').toLowerCase();

      if (tag === 'textarea') {
        type = 'long_text';
      } else if (tag === 'select') {
        type = 'dropdown';
        options = Array.from(firstControl.querySelectorAll('option'))
          .map((option) => cleanText(option.textContent))
          .filter(Boolean);
      } else if (tag === 'input') {
        const inputType = normalizeInputType(firstControl.getAttribute('type'));
        if (inputType === 'radio' || inputType === 'checkbox') {
          const groupControls = resolveChoiceGroupControls(doc, controls, inputType);
          const groupKey = buildChoiceGroupKey(groupControls, inputType);
          if (seenChoiceGroups.has(groupKey)) {
            return;
          }
          seenChoiceGroups.add(groupKey);

          type = inputType;
          options = groupControls
            .map((choiceControl) => resolveControlLabel(doc, item, choiceControl))
            .map(cleanText)
            .filter(Boolean);

          if (!text || /^Question \d+$/i.test(text)) {
            text = resolveGroupQuestionText(doc, item, groupControls, index);
          }
          required = required || groupControls.some((choiceControl) => choiceControl.required || choiceControl.getAttribute('aria-required') === 'true');
        } else if (inputType === 'date') {
          type = 'date';
        } else if (inputType === 'email') {
          type = 'email';
        } else if (inputType === 'tel') {
          type = 'phone';
        } else if (inputType === 'number') {
          type = 'number';
        } else if (inputType === 'url') {
          type = 'url';
        } else {
          type = 'short_text';
        }
      }
    }

    // Google Forms listbox fallback.
    if (type === 'unknown_type' && item.querySelector('[role="listbox"]')) {
      type = 'dropdown';
      options = Array.from(item.querySelectorAll('[role="option"]'))
        .map((option) => cleanText(option.getAttribute('data-value') || option.textContent))
        .filter(Boolean);
    }

    // Linear scale heuristic.
    if (item.querySelectorAll('[role="radio"]').length > 3 && String(item.textContent || '').match(/\d+.*to.*\d+/i)) {
      type = 'linear_scale';
    }

    const normalizedOptions = dedupe(options.map((value) => String(value).trim()).filter((value) => value && value !== 'undefined'));
    const normalizedText = cleanText(text) || `Question ${questionIndex}`;

    formData.questions.push({
      id: String(questionIndex++),
      text: normalizedText,
      type,
      required,
      options: normalizedOptions
    });
  });

  return formData;
}

function isVisibleControl(element) {
  if (!element || element.disabled) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.closest('[hidden], [aria-hidden="true"]')) return false;

  if (String(element.tagName || '').toLowerCase() === 'input') {
    const inputType = normalizeInputType(element.getAttribute('type'));
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(inputType)) return false;
  }
  return true;
}

function normalizeInputType(rawType) {
  return String(rawType || 'text').toLowerCase();
}

function stripRequiredMarker(value) {
  return cleanText(String(value || '').replace(/\s*\*+\s*$/, ''));
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function dedupe(values) {
  return Array.from(new Set(values));
}

function resolveItemText(doc, item, controls, index) {
  const heading = item.querySelector('div[role="heading"], .M7eMe, .question-title');
  if (heading) return cleanText(heading.textContent);

  const legend = item.querySelector('legend');
  if (legend) return cleanText(legend.textContent);

  const directLabel = item.querySelector('label');
  if (directLabel) return cleanText(directLabel.textContent);

  if (controls.length > 0) {
    const label = resolveControlLabel(doc, item, controls[0]);
    if (label) return cleanText(label);
  }

  return `Question ${index + 1}`;
}

function resolveControlLabel(doc, item, control) {
  const ariaLabelledBy = control.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelText = ariaLabelledBy
      .split(/\s+/)
      .map((id) => cleanText(doc.getElementById(id)?.textContent || ''))
      .filter(Boolean)
      .join(' ');
    if (labelText) return labelText;
  }

  const ariaLabel = control.getAttribute('aria-label');
  if (ariaLabel) return cleanText(ariaLabel);

  if (control.id) {
    const scoped = item.querySelector(`label[for="${control.id}"]`);
    if (scoped) return cleanText(scoped.textContent);
    const globalLabel = doc.querySelector(`label[for="${control.id}"]`);
    if (globalLabel) return cleanText(globalLabel.textContent);
  }

  const wrappingLabel = control.closest('label');
  if (wrappingLabel) return cleanText(wrappingLabel.textContent);

  const placeholder = control.getAttribute('placeholder');
  if (placeholder) return cleanText(placeholder);

  const title = control.getAttribute('title');
  if (title) return cleanText(title);

  return '';
}

function resolveChoiceGroupControls(doc, controls, inputType) {
  const firstChoice = controls.find((control) =>
    String(control.tagName || '').toLowerCase() === 'input' && normalizeInputType(control.getAttribute('type')) === inputType
  );
  if (!firstChoice) return [];

  const groupName = cleanText(firstChoice.getAttribute('name') || '');
  if (!groupName) {
    return controls.filter((control) =>
      String(control.tagName || '').toLowerCase() === 'input' && normalizeInputType(control.getAttribute('type')) === inputType
    );
  }

  return Array.from(doc.querySelectorAll('input'))
    .filter((control) =>
      normalizeInputType(control.getAttribute('type')) === inputType &&
      cleanText(control.getAttribute('name') || '') === groupName &&
      isVisibleControl(control)
    );
}

function buildChoiceGroupKey(groupControls, inputType) {
  const first = groupControls[0];
  const name = cleanText(first?.getAttribute?.('name') || '');
  if (name) return `${inputType}:${name}`;

  const optionSignature = groupControls
    .map((control) => `${control.id || ''}:${control.value || ''}:${control.getAttribute('aria-label') || ''}`)
    .join('|');
  return `${inputType}:${optionSignature}`;
}

function resolveGroupQuestionText(doc, item, groupControls, index) {
  const legend = item.querySelector('legend');
  if (legend) return cleanText(legend.textContent);

  const first = groupControls[0];
  if (first) {
    const label = resolveControlLabel(doc, item, first);
    if (label) return cleanText(label);
    const name = cleanText(first.getAttribute('name') || '');
    if (name) return name.replace(/[_-]+/g, ' ');
  }

  return `Question ${index + 1}`;
}
