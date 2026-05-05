const DISALLOWED_SELECTOR = 'script, iframe, object, embed, link[rel="import"], meta[http-equiv="refresh"]';
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const DATA_IMAGE_ATTRS = new Set(['src', 'poster']);

type SafeHtmlOptions = {
  allowedTags?: Set<string>;
  allowedAttributes?: Record<string, Set<string>>;
};

function isSafeUrlAttribute(name: string, value: string) {
  const raw = String(value || '').trim();
  if (!raw) return true;
  if (raw.startsWith('//')) return false;
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) return true;

  try {
    const parsed = new URL(raw, 'https://formmate.local');
    if (DATA_IMAGE_ATTRS.has(name) && parsed.protocol === 'data:') {
      return /^data:image\/(?:png|gif|jpe?g|webp|avif);base64,/i.test(raw);
    }
    return SAFE_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function scrubTree(root: ParentNode, options: SafeHtmlOptions = {}) {
  const allowedTags = options.allowedTags || null;
  const allowedAttributes = options.allowedAttributes || null;

  root.querySelectorAll(DISALLOWED_SELECTOR).forEach((element) => element.remove());

  root.querySelectorAll('*').forEach((element) => {
    const tagName = String(element.tagName || '').toLowerCase();

    if (allowedTags && !allowedTags.has(tagName)) {
      const parent = element.parentNode;
      if (parent) {
        while (element.firstChild) parent.insertBefore(element.firstChild, element);
        element.remove();
      }
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }

      if (URL_ATTRS.has(name) && !isSafeUrlAttribute(name, attribute.value)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (allowedAttributes) {
        const allowedForTag = allowedAttributes[tagName];
        const allowedForAll = allowedAttributes['*'];
        const isAllowed = Boolean(
          (allowedForTag && allowedForTag.has(name))
          || (allowedForAll && allowedForAll.has(name)),
        );
        if (!isAllowed) {
          element.removeAttribute(attribute.name);
        }
      }
    });
  });
}

export function createSafeHtmlFragment(html: string, options: SafeHtmlOptions = {}) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  scrubTree(template.content, options);
  return template.content.cloneNode(true) as DocumentFragment;
}

export function createSafeHtmlString(html: string, options: SafeHtmlOptions = {}) {
  const fragment = createSafeHtmlFragment(html, options);
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

export function replaceChildrenWithSafeHtml(target: Element | DocumentFragment | null | undefined, html: string, options: SafeHtmlOptions = {}) {
  if (!target) return;
  target.replaceChildren(createSafeHtmlFragment(html, options));
}
