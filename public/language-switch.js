for (const link of document.querySelectorAll('.language-switch [hreflang]')) {
  if (link.hasAttribute('data-language-fallback')) continue;
  link.addEventListener('click', () => {
    link.search = location.search;
    link.hash = location.hash;
  });
}

// A map may change its query string after its first render.
function syncLanguageLinks() {
  for (const link of document.querySelectorAll('.language-switch [hreflang]:not([data-language-fallback])')) {
    link.search = location.search;
    link.hash = location.hash;
  }
}
const menu = document.querySelector('.language-switch');
menu?.addEventListener('toggle', syncLanguageLinks);
document.addEventListener('pointerdown', event => {
  if (menu?.open && !menu.contains(event.target)) menu.open = false;
});
menu?.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !menu.open) return;
  event.stopPropagation();
  menu.open = false;
  menu.querySelector('summary').focus();
});
window.addEventListener('hashchange', syncLanguageLinks);
syncLanguageLinks();
