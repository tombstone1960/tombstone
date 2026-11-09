const normalized = value => value.normalize('NFKC').trim().toLocaleLowerCase();

export function createPlaceSearch(container, items, onSelect) {
  const input = container.querySelector('input');
  const popover = container.querySelector('.atlas-search-popover');
  const list = popover.querySelector('[role="listbox"]');
  const empty = popover.querySelector('.atlas-search-empty');
  const entries = items.map(item => ({ ...item, indexText: normalized([item.name, ...item.aliases].join(' ')) }));
  let matches = [];
  let active = -1;
  let selectedName = '';

  function highlight(index) {
    if (active >= 0) list.children[active].setAttribute('aria-selected', 'false');
    active = index;
    if (active < 0) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    const option = list.children[active];
    option.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  function show() {
    const query = normalized(input.value);
    const words = query.split(/\s+/u);
    highlight(-1);
    matches = query ? entries.filter(entry => words.every(word => entry.indexText.includes(word)))
      .sort((a, b) => Number(normalized(b.name) === query) - Number(normalized(a.name) === query))
      : entries.filter(entry => entry.type === 'region');
    list.replaceChildren(...matches.map((item, index) => {
      const option = document.createElement('li');
      option.id = 'atlas-search-option-' + index;
      option.dataset.index = index;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      const name = document.createElement('span');
      name.textContent = item.name;
      const label = document.createElement('small');
      label.textContent = item.label;
      option.append(name, label);
      return option;
    }));
    list.scrollTop = 0;
    empty.hidden = matches.length > 0;
    popover.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    highlight(-1);
    popover.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.value = selectedName;
  }

  input.addEventListener('focus', () => { input.select(); show(); });
  input.addEventListener('click', () => { if (popover.hidden) show(); });
  input.addEventListener('input', event => { if (!event.isComposing) show(); });
  input.addEventListener('compositionend', show);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape' && !popover.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (popover.hidden) show();
      if (!matches.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      highlight(active < 0 ? (step > 0 ? 0 : matches.length - 1)
        : (active + step + matches.length) % matches.length);
    } else if (event.key === 'Enter' && !popover.hidden && matches.length) {
      event.preventDefault();
      onSelect(matches[Math.max(active, 0)]);
    }
  });
  list.addEventListener('mousedown', event => event.preventDefault());
  list.addEventListener('click', event => {
    const option = event.target.closest('[role="option"]');
    if (option) onSelect(matches[Number(option.dataset.index)]);
  });

  return {
    setSelection(name) {
      selectedName = name;
      close();
    },
  };
}
