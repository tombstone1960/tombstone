import { referencePageHref } from './data/citations.js';
import { bookHref } from './routes.js';
import appearanceControl from './appearance-control.html?raw';
import { english, localText as t, localizeTraditional } from './localization/locale.js';
import './pdf-preview.css';

let dialog;
let session;
const archiveOnly = import.meta.env.VITE_ARCHIVE_PDF_ONLY === '1'
  && import.meta.env.VITE_HOST_REFERENCE_PDF !== '1';

function fillReader(viewer, { modal }) {
  const heading = modal ? 'h2' : 'h1';
  viewer.setAttribute('aria-labelledby', 'pdf-reader-title');
  viewer.innerHTML = `
    <header class="pdf-preview-header">
      <div>
        <${heading} id="pdf-reader-title">《墓碑》原文</${heading}>
        <p>杨继绳 著 · 2007 年 8 月参考版 · 民间档案馆藏</p>
      </div>
      <div class="pdf-preview-actions">
        ${modal ? '<a data-full-reader target="_blank" rel="noreferrer">在新标签页打开 ↗</a>' : ''}
        <a data-archive-link target="_blank" rel="noreferrer">打开档案馆 PDF ↗</a>
        ${modal ? '<form method="dialog"><button type="submit" autofocus>关闭预览</button></form>' : appearanceControl}
      </div>
    </header>
    <fieldset class="pdf-reader-toolbar" disabled>
      <legend class="visually-hidden">原文阅读工具</legend>
      <form class="pdf-reader-pages" aria-label="页码">
        <button type="button" data-page-step="-1" aria-label="上一页">‹</button>
        <input name="page" type="number" min="1" inputmode="numeric" required aria-label="页码，按回车跳转">
        <span>/ <span data-page-count></span></span>
        <button type="button" data-page-step="1" aria-label="下一页">›</button>
      </form>
      <div class="pdf-reader-zoom" role="group" aria-label="缩放">
        <button type="button" data-zoom-step="-1" aria-label="缩小">−</button>
        <span data-zoom-level></span>
        <button type="button" data-zoom-step="1" aria-label="放大">+</button>
        <button type="button" data-zoom-fit>适应宽度</button>
      </div>
      <button type="button" data-search-toggle aria-expanded="false" aria-controls="pdf-search-panel">搜索原文</button>
    </fieldset>
    <form id="pdf-search-panel" class="pdf-reader-search" role="search" aria-label="搜索原文" hidden>
      <div class="pdf-search-query">
        <input name="query" type="search" aria-label="地名或词句" placeholder="输入地名或词句" autocomplete="off">
        <button type="submit">搜索</button>
      </div>
      <div class="pdf-search-actions">
        <button type="button" data-search-step="-1" disabled>上一个</button>
        <button type="button" data-search-step="1" disabled>下一个</button>
        <button type="button" data-search-close>关闭搜索</button>
      </div>
      <span class="pdf-search-status" role="status"></span>
    </form>
    <div class="pdf-preview-content" tabindex="0" role="region" aria-label="原文阅读区">
      <p class="pdf-reader-status" role="status"></p>
      <div class="pdf-reader-paper"></div>
    </div>
  `;
  localizeTraditional(viewer);
}

function createDialog() {
  const viewer = document.createElement('dialog');
  viewer.className = 'pdf-preview';
  fillReader(viewer, { modal: true });
  viewer.addEventListener('close', () => {
    if (viewer.open) return;
    session?.abort();
    viewer.querySelector('.pdf-reader-paper').replaceChildren();
  });
  document.body.append(viewer);
  return viewer;
}

function startReader(viewer, page, signal, onPageChange, text) {
  viewer.querySelector('.pdf-reader-toolbar').disabled = true;
  viewer.querySelector('.pdf-reader-paper').replaceChildren();
  viewer.querySelector('input[name="page"]').value = page;
  viewer.querySelector('[data-page-count]').textContent = '…';
  viewer.querySelector('[data-zoom-level]').textContent = '100%';
  viewer.querySelector('#pdf-search-panel').hidden = true;
  viewer.querySelector('[data-search-toggle]').setAttribute('aria-expanded', 'false');
  viewer.querySelector('.pdf-preview-content').scrollTo(0, 0);
  const status = viewer.querySelector('.pdf-reader-status');
  status.classList.remove('visually-hidden');
  status.textContent = t('正在打开原文…');
  onPageChange(page);
  import('./pdf-reader.js')
    .then(({ readPdf }) => {
      if (!signal.aborted) return readPdf(viewer, page, signal, onPageChange, text);
    })
    .catch(error => {
      if (signal.aborted) return;
      const archive = document.createElement('a');
      archive.href = referencePageHref(page);
      archive.target = '_blank';
      archive.rel = 'noreferrer';
      archive.textContent = t('在档案馆打开原文 ↗');
      status.replaceChildren(t('原文没能打开。'), archive);
      console.error('Could not open reference PDF:', error);
    });
}

function openPreview(event) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();

  const page = Number(event.currentTarget.dataset.pdfPage);
  const text = event.currentTarget.dataset.pdfText;
  dialog ??= createDialog();
  dialog.querySelector('h2').textContent = t('《墓碑》原文 · 第 ' + page + ' 页');
  const fullPage = dialog.querySelector('[data-full-reader]');
  const archive = dialog.querySelector('[data-archive-link]');
  session?.abort();
  session = new AbortController();
  dialog.showModal();
  startReader(dialog, page, session.signal, number => {
    fullPage.href = bookHref(number, number === page ? text : undefined);
    archive.href = referencePageHref(number);
  }, text);
}

export function mountBookReader(viewer) {
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('page'));
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  if (archiveOnly) {
    location.replace(referencePageHref(page));
    return;
  }
  fillReader(viewer, { modal: false });
  const text = params.get('text');
  const archive = viewer.querySelector('[data-archive-link]');
  startReader(viewer, page, new AbortController().signal, number => {
    archive.href = referencePageHref(number);
    const url = bookHref(number, number === page ? text : undefined);
    if (location.pathname + location.search !== url) history.replaceState(history.state, '', url);
    document.title = t('《墓碑》原文 · 第 ' + number + ' 页');
  }, text);
}

export function createPdfLink(page, label = t('查看原文 · 第 ' + page + ' 页', 'Original in Chinese · p. ' + page), text) {
  const link = document.createElement('a');
  link.className = 'pdf-preview-link';
  link.href = archiveOnly || english ? referencePageHref(page) : bookHref(page, text);
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = t(label);
  if (!archiveOnly && !english && typeof HTMLDialogElement !== 'undefined' && HTMLDialogElement.prototype.showModal) {
    link.dataset.pdfPage = page;
    if (text) link.dataset.pdfText = text;
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', openPreview);
  }
  return link;
}
