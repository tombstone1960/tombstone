(() => {
  const key = 'tombstone-appearance';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  const readPreference = () => {
    try {
      const value = localStorage.getItem(key);
      if (value === 'light' || value === 'dark') return value;
    } catch {
      // The current tab can still use a theme if storage is unavailable.
    }
    return 'system';
  };
  let preference = readPreference();

  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.querySelectorAll('input[name="site-appearance"]').forEach(input => {
      input.checked = input.value === preference;
    });
    const [light, dark, label] = {
      en: ['Switch to light theme', 'Switch to dark theme', 'Theme'],
      'zh-Hant': ['切換至淺色', '切換至深色', '外觀'],
    }[root.lang] ?? ['切换到浅色', '切换到深色', '外观'];
    const action = theme === 'dark' ? light : dark;
    document.querySelectorAll('.site-appearance-toggle').forEach(button => {
      button.title = action;
      button.setAttribute('aria-label', label + ' · ' + action);
    });
    if (root.dataset.theme === theme) return;
    root.dataset.theme = theme;
    document.dispatchEvent(new Event('appearancechange'));
  }

  function setPreference(value) {
    preference = value;
    try { localStorage.setItem(key, value); } catch {}
    apply();
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply);
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = readPreference();
    apply();
  });
  document.addEventListener('toggle', event => {
    if (event.target.matches('.site-appearance-menu[open]')) apply();
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('.site-appearance-toggle');
    if (!button) return;
    button.closest('.site-appearance').querySelector('.site-appearance-menu').open = false;
    setPreference(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });
  document.addEventListener('change', event => {
    if (!event.target.matches('input[name="site-appearance"]')) return;
    setPreference(event.target.value);
  });
  document.addEventListener('pointerdown', event => {
    for (const menu of document.querySelectorAll('.site-appearance-menu[open]')) {
      if (!menu.contains(event.target)) menu.open = false;
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = event.target.closest('.site-appearance-menu[open]');
    if (!menu) return;
    event.preventDefault();
    event.stopPropagation();
    menu.open = false;
    menu.querySelector('summary').focus();
  }, true);
})();
