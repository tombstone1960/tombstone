// A PDF can split a Chinese phrase across runs or lines. Keep offsets back
// into the original runs so the highlights still land on the printed text.
function searchText(text, offsets) {
  let normalized = '';
  let offset = 0;
  for (const character of text) {
    const folded = character.normalize('NFKC').toLowerCase().replace(/[\s\u00ad\u200b]/gu, '');
    normalized += folded;
    if (offsets) {
      for (let i = 0; i < folded.length; i++) offsets.push({ start: offset, end: offset + character.length });
    }
    offset += character.length;
  }
  return normalized;
}

async function readTextIndex(book, signal, onProgress) {
  const pages = [];
  for (let number = 1; number <= book.numPages; number++) {
    signal.throwIfAborted();
    const page = await book.getPage(number);
    const { items } = await page.getTextContent();
    pages.push(searchText(items.map(item => item.str ?? '').join('')));
    if (number % 30 === 0) onProgress(number);
  }
  return pages;
}

function findMatches(pages, query) {
  const matches = [];
  pages.forEach((text, pageIndex) => {
    for (let start = text.indexOf(query); start !== -1; start = text.indexOf(query, start + query.length)) {
      matches.push({ page: pageIndex + 1, start, end: start + query.length });
    }
  });
  return matches;
}

function drawMatches(sheet, textLayer, matches, selected) {
  sheet.querySelector('.pdf-search-highlights')?.remove();
  if (!matches.length) return null;

  const layer = document.createElement('div');
  layer.className = 'pdf-search-highlights';
  layer.setAttribute('aria-hidden', 'true');
  const sheetRect = sheet.getBoundingClientRect();
  const range = document.createRange();
  const runs = [];
  let offset = 0;
  textLayer.textContentItemsStr.forEach((text, index) => {
    const offsets = [];
    searchText(text, offsets);
    if (!offsets.length) return;
    const node = textLayer.textDivs[index].firstChild;
    const end = offset + offsets.length;
    if (node?.isConnected) runs.push({ node, offsets, start: offset, end });
    offset = end;
  });

  let firstRun = 0;
  let activeMarker = null;
  for (const match of matches) {
    while (runs[firstRun]?.end <= match.start) firstRun++;
    for (let i = firstRun; runs[i]?.start < match.end; i++) {
      const { node, offsets, start, end } = runs[i];
      const from = offsets[Math.max(match.start, start) - start];
      const to = offsets[Math.min(match.end, end) - start - 1];
      range.setStart(node, from.start);
      range.setEnd(node, to.end);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        const marker = document.createElement('span');
        if (match === selected) {
          marker.className = 'is-current';
          activeMarker ??= marker;
        }
        Object.assign(marker.style, {
          left: rect.left - sheetRect.left + 'px',
          top: rect.top - sheetRect.top + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
        });
        layer.append(marker);
      }
    }
  }
  sheet.append(layer);
  return activeMarker;
}

export function mountPdfSearch(reader, book, signal, currentPage, goToPage, passageText) {
  const toggle = reader.querySelector('[data-search-toggle]');
  const form = reader.querySelector('.pdf-reader-search');
  const input = form.elements.query;
  const previous = form.querySelector('[data-search-step="-1"]');
  const next = form.querySelector('[data-search-step="1"]');
  const status = form.querySelector('.pdf-search-status');
  const scroller = reader.querySelector('.pdf-preview-content');
  let index;
  let query = '';
  let matches = [];
  let selectedIndex = 0;
  let request = 0;
  let searching = false;
  const renderedPages = new Map();
  const passageTerm = searchText(passageText ?? '');
  let passage = passageTerm ? { page: currentPage(), term: passageTerm } : null;
  let scrollToMatch = Boolean(passage);

  function redrawPage(page, { sheet, textLayer }) {
    let selected = matches[selectedIndex];
    let pageMatches = matches.filter(match => match.page === page);
    if (passage?.page === page) {
      const content = searchText(textLayer.textContentItemsStr.join(''));
      const start = content.indexOf(passage.term);
      if (start >= 0) {
        selected = { page, start, end: start + passage.term.length };
        pageMatches = [selected];
      }
    }
    const marker = drawMatches(sheet, textLayer, pageMatches, selected);
    if (!scrollToMatch || selected?.page !== page) return;
    scrollToMatch = false;
    if (!marker) return;
    const view = scroller.getBoundingClientRect();
    const hit = marker.getBoundingClientRect();
    const pageTop = sheet.getBoundingClientRect().top - view.top;
    scroller.scrollBy({
      top: Math.max(pageTop - 12, hit.top + hit.height / 2 - view.top - scroller.clientHeight / 2),
      left: hit.left + hit.width / 2 - view.left - scroller.clientWidth / 2,
      behavior: 'instant',
    });
  }

  function redraw() {
    for (const [page, content] of renderedPages) redrawPage(page, content);
  }

  function selectMatch(position) {
    selectedIndex = (position + matches.length) % matches.length;
    const match = matches[selectedIndex];
    status.textContent = '第 ' + (selectedIndex + 1) + ' 项，共 ' + matches.length + ' 项';
    scrollToMatch = true;
    goToPage(match.page);
    redraw();
  }

  function clearMatches() {
    request++;
    passage = null;
    query = '';
    matches = [];
    searching = scrollToMatch = false;
    previous.disabled = next.disabled = true;
    status.textContent = '';
    redraw();
  }

  async function submitSearch() {
    const term = searchText(input.value);
    if (term === query && matches.length) {
      selectMatch(selectedIndex + 1);
      return;
    }
    clearMatches();
    if (!term) return;
    query = term;
    searching = true;
    status.textContent = '正在搜索全书…';
    const current = request;
    try {
      index ??= readTextIndex(book, signal, page => {
        if (searching && !signal.aborted) status.textContent = '正在读取第 ' + page + ' / ' + book.numPages + ' 页…';
      }).catch(error => {
        index = undefined;
        throw error;
      });
      const pages = await index;
      if (signal.aborted || current !== request) return;
      searching = false;
      matches = findMatches(pages, term);
      if (!matches.length) {
        status.textContent = '没有找到这段文字';
        return;
      }
      previous.disabled = next.disabled = matches.length === 1;
      const first = matches.findIndex(match => match.page >= currentPage());
      selectMatch(Math.max(first, 0));
    } catch (error) {
      if (signal.aborted || current !== request) return;
      searching = false;
      status.textContent = '没能搜索原文，请再试一次。';
      console.error('Could not search reference PDF:', error);
    }
  }

  function openSearch() {
    form.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    input.focus();
    input.select();
  }

  function closeSearch() {
    clearMatches();
    input.value = '';
    form.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  input.value = '';
  previous.disabled = next.disabled = true;
  status.textContent = '';
  toggle.addEventListener('click', () => (form.hidden ? openSearch() : closeSearch()), { signal });
  form.querySelector('[data-search-close]').addEventListener('click', closeSearch, { signal });
  form.addEventListener('submit', event => {
    event.preventDefault();
    submitSearch();
  }, { signal });
  input.addEventListener('input', clearMatches, { signal });
  previous.addEventListener('click', () => selectMatch(selectedIndex - 1), { signal });
  next.addEventListener('click', () => selectMatch(selectedIndex + 1), { signal });
  form.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    } else if (event.target === input && event.key === 'Enter' && event.shiftKey && matches.length) {
      event.preventDefault();
      selectMatch(selectedIndex - 1);
    }
  }, { signal });
  document.addEventListener('keydown', event => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'f' || reader.matches('dialog:not([open])')) return;
    event.preventDefault();
    openSearch();
  }, { signal });

  return {
    showPage(page, sheet, textLayer) {
      const content = { sheet, textLayer };
      renderedPages.set(page, content);
      redrawPage(page, content);
    },
    hidePage(page) {
      renderedPages.delete(page);
    },
  };
}
