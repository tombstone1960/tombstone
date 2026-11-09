export const locale = document.documentElement.lang;
export const english = locale === 'en';
const toTraditional = locale === 'zh-Hant' ? (await import('./traditional.js')).traditional : null;

export function localText(chinese, translation = chinese) {
  return english ? translation : toTraditional ? toTraditional(chinese) : chinese;
}

export function localizeTraditional(root) {
  if (!toTraditional) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeType === Node.ELEMENT_NODE && node.getAttribute('lang') === 'zh-Hans'
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) node.nodeValue = toTraditional(node.nodeValue);
    else for (const name of ['aria-label', 'title', 'placeholder']) {
      if (node.hasAttribute(name)) node.setAttribute(name, toTraditional(node.getAttribute(name)));
    }
  }
}
