export function fill(container, values) {
  for (const [field, value] of Object.entries(values)) {
    container.querySelector('[data-field="' + field + '"]').textContent = value;
  }
}

export function scrollToFragment() {
  // The browser may have looked for the fragment before the templates were filled.
  document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
