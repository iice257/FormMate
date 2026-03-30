// @ts-nocheck
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

  const pageText = doc.body?.textContent || '';
  const normalizedPageText = pageText.replace(/[\u2013\u2014]/g, '-');
  const authSignals = [
    "Can't access your Google Account",
    'Sign in to continue',
    'Sign in to Google',
    'Sign in - Google Accounts',
    'You need permission',
    'This form can only be viewed by users in the owner'
  ];
  if (authSignals.some((signal) => pageText.includes(signal) || normalizedPageText.includes(signal))) {
    return {
      title: 'Unknown Form',
      description: '',
      questions: [],
      requiresAuth: true,
      requiresRender: false
    };
  }

  const shellSignals = [
    'enable javascript',
    'please enable javascript',
    'you need to enable javascript to run this app',
    'this application requires javascript',
    'javascript is disabled'
  ];
  const noscriptText = cleanText(doc.querySelector('noscript')?.textContent || '').toLowerCase();
  const lowerPage = String(pageText || '').toLowerCase();
  if (shellSignals.some((signal) => lowerPage.includes(signal) || noscriptText.includes(signal))) {
    formData.requiresRender = true;
  }

  const titleEl = doc.querySelector('.F9yp7e')
    || doc.querySelector('div[role="heading"][aria-level="1"]')
    || doc.querySelector('.freebirdFormviewerViewHeaderTitle')
    || doc.querySelector('.Qr7Oae');
  if (titleEl) formData.title = cleanText(titleEl.textContent);

  const descEl = doc.querySelector('.wGQFbe')
    || doc.querySelector('.freebirdFormviewerViewHeaderDescription')
    || doc.querySelector('.cBGGJ');
  if (descEl) formData.description = cleanText(descEl.textContent);

  let items = Array.from(doc.querySelectorAll('div[role="listitem"]'));

  if (items.length === 0) {
    items = Array.from(doc.querySelectorAll('.freebirdFormviewerViewItemsItemItem, .geS5n, .Qr7Oae, fieldset, .form-group, .field, .input-group, [role="group"]'));
  }

  if (items.length === 0) {
    const forms = Array.from(doc.querySelectorAll('form'));
    const target = forms.sort((a, b) =>
      b.querySelectorAll('input,textarea,select').length - a.querySelectorAll('input,textarea,select').length
    )[0] || doc.body;

    const controls = Array.from(target?.querySelectorAll('input,textarea,select') || []).filter(isVisibleControl);
    const containerSet = new Set();

    controls.forEach((control) => {
      const container = findBestControlContainer(control);
      if (container) containerSet.add(container);
    });

    items = Array.from(containerSet);
  }

  const seenChoiceGroups = new Set();
  let questionIndex = 1;

  items.forEach((item, index) => {
    const controls = getItemControls(item);

    let text = resolveItemText(doc, item, controls, index);
    const requiredFromText = /\*\s*$/.test(text) || /\(\s*required\s*\)\s*$/i.test(text);
    text = stripRequiredMarker(text);

    let required = requiredFromText || itemMatchesOrContains(item, '[aria-required="true"], input[required], textarea[required], select[required], [data-required="true"]');

    let type = controls.length > 0 ? 'short_text' : 'unknown_type';
    let options = [];

    const ariaRadios = Array.from(queryAllWithinOrSelf(item, '[role="radio"]'));
    const ariaChecks = Array.from(queryAllWithinOrSelf(item, '[role="checkbox"]'));
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
          .filter((option) => option && !/^select( an)? option$/i.test(option));
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

    if (type === 'unknown_type' && itemMatchesOrContains(item, '[role="listbox"]')) {
      type = 'dropdown';
      options = Array.from(queryAllWithinOrSelf(item, '[role="option"]'))
        .map((option) => cleanText(option.getAttribute('data-value') || option.textContent))
        .filter(Boolean);
    }

    if (queryAllWithinOrSelf(item, '[role="radio"]').length > 3 && String(item.textContent || '').match(/\d+.*to.*\d+/i)) {
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

function isControlElement(element) {
  if (!element?.matches) return false;
  return element.matches('input, textarea, select');
}

function getItemControls(item) {
  if (isControlElement(item)) {
    return isVisibleControl(item) ? [item] : [];
  }
  return Array.from(item.querySelectorAll('input, textarea, select')).filter(isVisibleControl);
}

function queryAllWithinOrSelf(item, selector) {
  const matches = [];
  if (item?.matches?.(selector)) {
    matches.push(item);
  }
  if (item?.querySelectorAll) {
    matches.push(...item.querySelectorAll(selector));
  }
  return matches;
}

function itemMatchesOrContains(item, selector) {
  return Boolean(item?.matches?.(selector) || item?.querySelector?.(selector));
}

function stripRequiredMarker(value) {
  return cleanText(
    String(value || '')
      .replace(/\s*\*+\s*$/, '')
      .replace(/\(\s*required\s*\)\s*$/i, '')
  );
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function dedupe(values) {
  return Array.from(new Set(values));
}

function resolveItemText(doc, item, controls, index) {
  const heading = item.querySelector?.('div[role="heading"], .M7eMe, .question-title');
  if (heading) return cleanText(heading.textContent);

  const legend = item.querySelector?.('legend');
  if (legend) return cleanText(legend.textContent);

  const labelledContainer = item.getAttribute?.('aria-labelledby');
  if (labelledContainer) {
    const labelledText = labelledContainer
      .split(/\s+/)
      .map((id) => cleanText(doc.getElementById(id)?.textContent || ''))
      .filter(Boolean)
      .join(' ');
    if (labelledText) return labelledText;
  }

  const directLabel = item.querySelector?.('label');
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
    const scoped = item.querySelector?.(`label[for="${control.id}"]`);
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

function findBestControlContainer(control) {
  const choiceType = normalizeInputType(control.getAttribute('type'));
  const groupedChoice = choiceType === 'radio' || choiceType === 'checkbox';
  const candidates = [
    control.closest('fieldset'),
    control.closest('[role="group"]'),
    control.closest('.form-group'),
    control.closest('.field'),
    control.closest('.input-group'),
    control.closest('.question'),
    control.closest('[data-question]'),
    control.closest('[data-field]'),
    control.closest('label'),
    control.parentElement,
    control
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (groupedChoice && (candidate.matches?.('fieldset') || candidate.getAttribute?.('role') === 'group')) {
      return candidate;
    }

    const containedControls = Array.from(candidate.querySelectorAll?.('input, textarea, select') || []).filter(isVisibleControl);
    if (containedControls.length <= 1) {
      return candidate;
    }
  }

  return control;
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
  const legend = item.querySelector?.('legend');
  if (legend) return cleanText(legend.textContent);

  const groupLabelledBy = item.getAttribute?.('aria-labelledby');
  if (groupLabelledBy) {
    const text = groupLabelledBy
      .split(/\s+/)
      .map((id) => cleanText(doc.getElementById(id)?.textContent || ''))
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  const first = groupControls[0];
  if (first) {
    const label = resolveControlLabel(doc, item, first);
    if (label) return cleanText(label);
    const name = cleanText(first.getAttribute('name') || '');
    if (name) return name.replace(/[_-]+/g, ' ');
  }

  return `Question ${index + 1}`;
}
