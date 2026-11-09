import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist/build/pdf.min.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { mountPdfSearch } from './pdf-search.js';

GlobalWorkerOptions.workerSrc = workerUrl;

const zoomLevels = [0.75, 1, 1.25, 1.5, 2, 2.5];
const fitZoom = zoomLevels.indexOf(1);
const pageInset = 12;

export async function readPdf(reader, initialPage, signal, onPageChange, text) {
  const task = getDocument({ url: '/reference/tombstone.pdf', enableXfa: false });
  signal.addEventListener('abort', () => task.destroy().catch(() => {}), { once: true });
  const book = await task.promise;
  if (signal.aborted) return;

  const toolbar = reader.querySelector('.pdf-reader-toolbar');
  const previous = toolbar.querySelector('[data-page-step="-1"]');
  const next = toolbar.querySelector('[data-page-step="1"]');
  const pageForm = toolbar.querySelector('form');
  const pageInput = pageForm.elements.page;
  const zoomOut = toolbar.querySelector('[data-zoom-step="-1"]');
  const zoomIn = toolbar.querySelector('[data-zoom-step="1"]');
  const zoomFit = toolbar.querySelector('[data-zoom-fit]');
  const zoomLabel = toolbar.querySelector('[data-zoom-level]');
  const scroller = reader.querySelector('.pdf-preview-content');
  const paper = reader.querySelector('.pdf-reader-paper');
  const status = reader.querySelector('.pdf-reader-status');
  let pageNumber = Math.min(initialPage, book.numPages);
  let zoomIndex = fitZoom;
  let width = 0;
  let scrollFrame = 0;

  const firstPage = await book.getPage(pageNumber);
  if (signal.aborted) return;
  const firstViewport = firstPage.getViewport({ scale: 1 });
  const defaultRatio = firstViewport.height / firstViewport.width;
  paper.style.setProperty('--pdf-page-ratio', defaultRatio);

  // Reserve each page's space so the scrollbar and page jumps work before pages render.
  const sheets = Array.from({ length: book.numPages }, (_, index) => {
    const sheet = document.createElement('div');
    sheet.className = 'pdf-reader-sheet';
    sheet.dataset.pageNumber = index + 1;
    return sheet;
  });
  const rendered = new Map();
  const search = mountPdfSearch(reader, book, signal, () => pageNumber, goToPage, text);

  status.classList.add('visually-hidden');
  paper.replaceChildren(...sheets);
  toolbar.querySelector('[data-page-count]').textContent = book.numPages;
  pageInput.max = book.numPages;
  toolbar.disabled = false;

  const sheetTop = number => paper.offsetTop + sheets[number - 1].offsetTop;

  function pageAt(offset) {
    let first = 1;
    let last = book.numPages;
    while (first < last) {
      const middle = Math.ceil((first + last) / 2);
      if (sheetTop(middle) <= offset) first = middle;
      else last = middle - 1;
    }
    return first;
  }

  function updatePage(number) {
    pageNumber = number;
    pageInput.value = number;
    previous.disabled = number <= 1;
    next.disabled = number >= book.numPages;
    status.textContent = '第 ' + number + ' 页，共 ' + book.numPages + ' 页';
    onPageChange(number);
  }

  function sizeEnd() {
    // Leave enough space to align the last page even in a tall viewport.
    paper.style.paddingBottom = Math.max(pageInset, scroller.clientHeight - sheets.at(-1).offsetHeight - pageInset) + 'px';
  }

  function releasePage(number) {
    const state = rendered.get(number);
    rendered.delete(number);
    state.cancel?.();
    state.page?.cleanup();
    search.hidePage(number);
    sheets[number - 1].replaceChildren();
  }

  async function renderPage(number) {
    if (rendered.has(number)) return;
    const state = {};
    rendered.set(number, state);
    const sheet = sheets[number - 1];
    const isCurrent = () => !signal.aborted && rendered.get(number) === state;

    try {
      const page = await book.getPage(number);
      if (!isCurrent()) return;
      state.page = page;
      const original = page.getViewport({ scale: 1 });
      const ratio = original.height / original.width;
      if (ratio !== defaultRatio && !sheet.style.getPropertyValue('--pdf-page-ratio')) {
        const anchor = sheetTop(pageNumber);
        sheet.style.setProperty('--pdf-page-ratio', ratio);
        if (number === book.numPages) sizeEnd();
        if (number < pageNumber) scroller.scrollTop += sheetTop(pageNumber) - anchor;
      }
      const viewport = page.getViewport({ scale: width / original.width });
      sheet.style.setProperty('--total-scale-factor', viewport.scale * page.userUnit);

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(12_000_000 / (viewport.width * viewport.height)));
      canvas.width = Math.ceil(viewport.width * density);
      canvas.height = Math.ceil(viewport.height * density);

      const text = document.createElement('div');
      text.className = 'pdf-reader-text';
      const canvasTask = page.render({
        canvas, viewport, transform: [density, 0, 0, density, 0, 0],
      });
      const textLayer = new TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport });
      state.cancel = () => {
        canvasTask.cancel();
        textLayer.cancel();
      };
      await Promise.all([canvasTask.promise, textLayer.render()]);
      if (!isCurrent()) return;

      state.cancel = undefined;
      sheet.replaceChildren(canvas, text);
      search.showPage(number, sheet, textLayer);
    } catch (error) {
      if (!isCurrent()) return;
      state.cancel?.();
      state.cancel = undefined;
      const message = document.createElement('p');
      message.className = 'pdf-page-error';
      message.textContent = '此页暂时无法显示。可通过档案馆查阅原文。';
      sheet.replaceChildren(message);
      console.error('Could not render reference PDF page:', error);
    }
  }

  function renderNearby() {
    const first = Math.max(1, pageAt(scroller.scrollTop) - 1);
    const last = Math.min(book.numPages, pageAt(scroller.scrollTop + scroller.clientHeight) + 1);
    for (const number of rendered.keys()) {
      if (number < first || number > last) releasePage(number);
    }
    renderPage(pageNumber);
    for (let number = first; number <= last; number++) renderPage(number);
  }

  function goToPage(number) {
    if (!Number.isInteger(number) || number < 1 || number > book.numPages) return;
    if (number !== pageNumber) updatePage(number);
    scroller.scrollTop = sheetTop(number) - pageInset;
    renderNearby();
  }

  function updateSize() {
    const zoom = zoomLevels[zoomIndex];
    const nextWidth = Math.min(Math.max(scroller.clientWidth - pageInset * 2, 1), 820) * zoom;
    const progress = width ? (scroller.scrollTop - sheetTop(pageNumber) + pageInset) / width : 0;
    if (nextWidth !== width) {
      width = nextWidth;
      paper.style.setProperty('--pdf-page-width', width + 'px');
      for (const number of rendered.keys()) releasePage(number);
    }
    sizeEnd();
    scroller.scrollTop = sheetTop(pageNumber) - pageInset + progress * width;
    renderNearby();
  }

  function setZoom(index) {
    if (index === zoomIndex) return;
    zoomIndex = index;
    if (index === fitZoom) scroller.scrollLeft = 0;
    zoomOut.disabled = index === 0;
    zoomIn.disabled = index === zoomLevels.length - 1;
    zoomLabel.textContent = Math.round(zoomLevels[index] * 100) + '%';
    updateSize();
  }

  previous.addEventListener('click', () => goToPage(pageNumber - 1), { signal });
  next.addEventListener('click', () => goToPage(pageNumber + 1), { signal });
  pageForm.addEventListener('submit', event => {
    event.preventDefault();
    goToPage(pageInput.valueAsNumber);
  }, { signal });
  zoomOut.addEventListener('click', () => setZoom(zoomIndex - 1), { signal });
  zoomIn.addEventListener('click', () => setZoom(zoomIndex + 1), { signal });
  zoomFit.addEventListener('click', () => setZoom(fitZoom), { signal });
  scroller.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const number = pageAt(scroller.scrollTop + pageInset + 4);
      if (number !== pageNumber) updatePage(number);
      renderNearby();
    });
  }, { signal, passive: true });

  const resize = new ResizeObserver(updateSize);
  resize.observe(scroller);
  signal.addEventListener('abort', () => {
    resize.disconnect();
    cancelAnimationFrame(scrollFrame);
    for (const number of rendered.keys()) releasePage(number);
  }, { once: true });

  updatePage(pageNumber);
  updateSize();
}
