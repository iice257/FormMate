const DISALLOWED_SELECTOR = 'script, iframe, object, embed, link[rel="import"], meta[http-equiv="refresh"]';
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);
const BLOCKED_PROTOCOL_PREFIXES = ['javascript:', 'vbscript:', 'data:text/html'];

function isBlockedUrl(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return BLOCKED_PROTOCOL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function scrubTree(root: ParentNode) {
  root.querySelectorAll(DISALLOWED_SELECTOR).forEach((element) => element.remove());

  root.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }

      if (URL_ATTRS.has(name) && isBlockedUrl(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

export function createSafeHtmlFragment(html: string) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  scrubTree(template.content);
  return template.content.cloneNode(true) as DocumentFragment;
}

export function replaceChildrenWithSafeHtml(target: Element | DocumentFragment | null | undefined, html: string) {
  if (!target) return;
  target.replaceChildren(createSafeHtmlFragment(html));
}
