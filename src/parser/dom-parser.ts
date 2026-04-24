// @ts-nocheck
export function parseDOM(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(htmlString || ''), 'text/html');
  const pageText = doc.body?.textContent || '';
  const normalizedPageText = pageText.replace(/[\u2013\u2014]/g, '-');
  const lowerPageText = normalizedPageText.toLowerCase();
  const allControls = Array.from(doc.querySelectorAll('input, textarea, select'));
  const visibleControls = allControls.filter(isVisibleControl);
  const hiddenControlCount = Math.max(0, allControls.length - visibleControls.length);
  const hiddenSectionCount = doc.querySelectorAll('[hidden], [aria-hidden="true"], [style*="display:none"]').length;
  const nextStepSignal = detectNextStepSignal(doc, lowerPageText);

  const formData = {
    title: doc.title || 'Unknown Form',
    description: '',
    questions: [],
    requiresAuth: false,
    requiresRender: false,
    meta: {
      visibleControlCount: visibleControls.length,
      hiddenControlCount,
      hiddenSectionCount,
      formElementCount: doc.querySelectorAll('form').length,
      nextStepRequired: nextStepSignal.required,
      nextStepHint: nextStepSignal.hint,
      groupedChoiceCount: 0,
      fileUploadCount: 0,
      placeholderLabelCount: 0,
      ariaLabelCount: 0,
      generatedLabelCount: 0,
      unknownTypeCount: 0,
    },
  };

  const authSignals = [
    "Can't access your Google Account",
    'Sign in to continue',
    'Sign in to Google',
    'Sign in - Google Accounts',
    'You need permission',
    'This form can only be viewed by users in the owner',
    'Sign in',
    'Login required',
  ];
  if (authSignals.some((signal) => pageText.includes(signal) || normalizedPageText.includes(signal))) {
    return {
      ...formData,
      title: 'Unknown Form',
      description: '',
      questions: [],
      requiresAuth: true,
      requiresRender: false,
    };
  }

  const shellSignals = [
    'enable javascript',
    'please enable javascript',
    'you need to enable javascript to run this app',
    'this application requires javascript',
    'javascript is disabled',
  ];
  const noscriptText = cleanText(doc.querySelector('noscript')?.textContent || '').toLowerCase();
  if (shellSignals.some((signal) => lowerPageText.includes(signal) || noscriptText.includes(signal))) {
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

  const items = resolveItems(doc, visibleControls);
  const seenChoiceGroups = new Set();
  let questionIndex = 1;

  items.forEach((item, index) => {
    const controls = getItemControls(item);
    const itemLabel = resolveItemLabelInfo(doc, item, controls, index);
    let text = itemLabel.text;
    let labelSource = itemLabel.source;
    const requiredFromText = /\*\s*$/.test(text) || /\(\s*required\s*\)\s*$/i.test(text);
    text = stripRequiredMarker(text);

    let required = requiredFromText || itemMatchesOrContains(item, '[aria-required="true"], input[required], textarea[required], select[required], [data-required="true"]');
    let type = controls.length > 0 ? 'short_text' : 'unknown_type';
    let options = [];
    let groupedChoice = false;

    const ariaRadios = Array.from(queryAllWithinOrSelf(item, '[role="radio"]'));
    const ariaChecks = Array.from(queryAllWithinOrSelf(item, '[role="checkbox"]'));
    if (ariaRadios.length > 0) {
      type = 'radio';
      groupedChoice = true;
      options = ariaRadios
        .map((choice) => cleanText(choice.getAttribute('aria-label') || choice.textContent))
        .filter(Boolean);
    } else if (ariaChecks.length > 0) {
      type = 'checkbox';
      groupedChoice = true;
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

          groupedChoice = true;
          formData.meta.groupedChoiceCount += 1;
          type = inputType;
          options = groupControls
            .map((choiceControl) => resolveControlLabelInfo(doc, item, choiceControl))
            .map((entry) => cleanText(entry.text))
            .filter(Boolean);

          if (!text || /^Question \d+$/i.test(text)) {
            const groupLabel = resolveGroupQuestionLabelInfo(doc, item, groupControls, index);
            text = groupLabel.text;
            labelSource = groupLabel.source;
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
        } else if (inputType === 'file') {
          type = 'file_upload';
          formData.meta.fileUploadCount += 1;
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
    const parserHints = {
      labelSource,
      groupedChoice,
      controlCount: controls.length,
      placeholderLabel: labelSource === 'placeholder',
      ariaLabelUsed: labelSource === 'aria_label' || labelSource === 'aria_labelledby',
      generatedLabel: labelSource === 'generated',
      nextStepVisible: Boolean(formData.meta.nextStepRequired),
    };

    if (parserHints.placeholderLabel) formData.meta.placeholderLabelCount += 1;
    if (parserHints.ariaLabelUsed) formData.meta.ariaLabelCount += 1;
    if (parserHints.generatedLabel) formData.meta.generatedLabelCount += 1;
    if (groupedChoice && type !== 'radio' && type !== 'checkbox') formData.meta.groupedChoiceCount += 1;
    if (type === 'unknown_type') formData.meta.unknownTypeCount += 1;

    formData.questions.push({
      id: String(questionIndex++),
      text: normalizedText,
      type,
      required,
      options: normalizedOptions,
      parserHints,
    });
  });

  if (!formData.meta.nextStepRequired && formData.meta.hiddenControlCount > 0) {
    formData.meta.nextStepRequired = true;
    formData.meta.nextStepHint = 'Hidden or conditional fields were detected and may require more interaction.';
  }

  return formData;
}

function resolveItems(doc, visibleControls) {
  let items = Array.from(doc.querySelectorAll('div[role="listitem"]'));

  if (items.length === 0) {
    items = Array.from(doc.querySelectorAll('.freebirdFormviewerViewItemsItemItem, .geS5n, .Qr7Oae, fieldset, .form-group, .field, .input-group, [role="group"]'));
  }

  if (items.length > 0) return items;

  const forms = Array.from(doc.querySelectorAll('form'));
  const target = forms.sort((a, b) =>
    b.querySelectorAll('input,textarea,select').length - a.querySelectorAll('input,textarea,select').length
  )[0] || doc.body;

  const controls = visibleControls.length
    ? visibleControls.filter((control) => target.contains(control))
    : Array.from(target?.querySelectorAll('input,textarea,select') || []).filter(isVisibleControl);
  const containerSet = new Set();

  controls.forEach((control) => {
    const container = findBestControlContainer(control);
    if (container) containerSet.add(container);
  });

  return Array.from(containerSet);
}

function detectNextStepSignal(doc, lowerPageText) {
  const buttonLikeText = Array.from(doc.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]'))
    .map((element) => cleanText(element.textContent || element.getAttribute('value') || ''))
    .filter(Boolean)
    .join(' ');
  const combined = `${lowerPageText} ${buttonLikeText.toLowerCase()}`;
  const required = /(next|continue|save and continue|step\s+\d+\s+of\s+\d+|page\s+\d+\s+of\s+\d+)/i.test(combined);
  return {
    required,
    hint: required ? 'This form appears to have additional steps beyond the current visible stage.' : '',
  };
}

function isVisibleControl(element) {
  if (!element || element.disabled) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.closest('[hidden], [aria-hidden="true"], [style*="display:none"]')) return false;

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
      .replace(/\(\s*required\s*\)\s*$/i, ''),
  );
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function dedupe(values) {
  return Array.from(new Set(values));
}

function getLabelSourcePriority(source) {
  switch (source) {
    case 'label_for':
    case 'wrapping_label':
    case 'label':
      return 5;
    case 'aria_labelledby':
      return 4;
    case 'aria_label':
      return 3;
    case 'legend':
    case 'heading':
      return 2;
    case 'title':
    case 'placeholder':
      return 1;
    default:
      return 0;
  }
}

function resolveItemLabelInfo(doc, item, controls, index) {
  const singleControlLabel = controls.length === 1
    ? resolveControlLabelInfo(doc, item, controls[0])
    : null;
  const singleControlText = cleanText(singleControlLabel?.text);
  const singlePriority = getLabelSourcePriority(singleControlLabel?.source);
  const heading = item.querySelector?.('div[role="heading"], .M7eMe, .question-title');
  const legend = item.querySelector?.('legend');
  const headingText = cleanText(heading?.textContent);
  const legendText = cleanText(legend?.textContent);

  if (singleControlText) {
    const headingPriority = headingText ? getLabelSourcePriority('heading') : 0;
    const legendPriority = legendText ? getLabelSourcePriority('legend') : 0;

    if (headingText && singleControlText.toLowerCase() !== headingText.toLowerCase() && singlePriority >= headingPriority) {
      return singleControlLabel;
    }
    if (legendText && singleControlText.toLowerCase() !== legendText.toLowerCase() && singlePriority >= legendPriority) {
      return singleControlLabel;
    }
  }

  if (headingText && (!singleControlText || getLabelSourcePriority('heading') > singlePriority)) {
    return { text: headingText, source: 'heading' };
  }

  if (legendText && (!singleControlText || getLabelSourcePriority('legend') > singlePriority)) {
    return { text: legendText, source: 'legend' };
  }

  const labelledContainer = item.getAttribute?.('aria-labelledby');
  if (labelledContainer) {
    const labelledText = labelledContainer
      .split(/\s+/)
      .map((id) => cleanText(doc.getElementById(id)?.textContent || ''))
      .filter(Boolean)
      .join(' ');
    if (labelledText) return { text: labelledText, source: 'aria_labelledby' };
  }

  const directLabel = item.querySelector?.('label');
  if (directLabel) return { text: cleanText(directLabel.textContent), source: 'label' };

  if (controls.length > 0) {
    const labelInfo = singleControlLabel || resolveControlLabelInfo(doc, item, controls[0]);
    if (labelInfo.text) return labelInfo;
  }

  return { text: `Question ${index + 1}`, source: 'generated' };
}

function resolveControlLabelInfo(doc, item, control) {
  const ariaLabelledBy = control.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelText = ariaLabelledBy
      .split(/\s+/)
      .map((id) => cleanText(doc.getElementById(id)?.textContent || ''))
      .filter(Boolean)
      .join(' ');
    if (labelText) return { text: labelText, source: 'aria_labelledby' };
  }

  const ariaLabel = control.getAttribute('aria-label');
  if (ariaLabel) return { text: cleanText(ariaLabel), source: 'aria_label' };

  if (control.id) {
    const scoped = item.querySelector?.(`label[for="${control.id}"]`);
    if (scoped) return { text: cleanText(scoped.textContent), source: 'label_for' };
    const globalLabel = doc.querySelector(`label[for="${control.id}"]`);
    if (globalLabel) return { text: cleanText(globalLabel.textContent), source: 'label_for' };
  }

  const wrappingLabel = control.closest('label');
  if (wrappingLabel) return { text: cleanText(wrappingLabel.textContent), source: 'wrapping_label' };

  const placeholder = control.getAttribute('placeholder');
  if (placeholder) return { text: cleanText(placeholder), source: 'placeholder' };

  const title = control.getAttribute('title');
  if (title) return { text: cleanText(title), source: 'title' };

  return { text: '', source: '' };
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
    control,
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
    String(control.tagName || '').toLowerCase() === 'input' && normalizeInputType(control.getAttribute('type')) === inputType,
  );
  if (!firstChoice) return [];

  const groupName = cleanText(firstChoice.getAttribute('name') || '');
  if (!groupName) {
    return controls.filter((control) =>
      String(control.tagName || '').toLowerCase() === 'input' && normalizeInputType(control.getAttribute('type')) === inputType,
    );
  }

  return Array.from(doc.querySelectorAll('input'))
    .filter((control) =>
      normalizeInputType(control.getAttribute('type')) === inputType
      && cleanText(control.getAttribute('name') || '') === groupName
      && isVisibleControl(control),
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

function resolveGroupQuestionLabelInfo(doc, item, groupControls, index) {
  const legend = item.querySelector?.('legend');
  if (legend) return { text: cleanText(legend.textContent), source: 'legend' };

  const groupLabelledBy = item.getAttribute?.('aria-labelledby');
  if (groupLabelledBy) {
    const text = groupLabelledBy
      .split(/\s+/)
      .map((id) => cleanText(doc.getElementById(id)?.textContent || ''))
      .filter(Boolean)
      .join(' ');
    if (text) return { text, source: 'aria_labelledby' };
  }

  const first = groupControls[0];
  if (first) {
    const labelInfo = resolveControlLabelInfo(doc, item, first);
    if (labelInfo.text) return labelInfo;
    const name = cleanText(first.getAttribute('name') || '');
    if (name) return { text: name.replace(/[_-]+/g, ' '), source: 'name_attr' };
  }

  return { text: `Question ${index + 1}`, source: 'generated' };
}
