import { bookCitation, sourcePage } from './data/citations.js';
import { createPdfLink } from './pdf-preview.js';
import { mapHref, recordsHref } from './routes.js';

function createShareLink(record, site) {
  const share = document.createElement('details');
  share.className = 'record-share';
  const summary = document.createElement('summary');
  summary.textContent = '分享地图链接';
  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.value = new URL(mapHref({ site, record: record.slug }), location.href).href;
  input.setAttribute('aria-label', record.place + '的地图链接');
  input.addEventListener('focus', () => input.select());
  share.append(summary, input);
  if (navigator.clipboard?.writeText) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '复制链接';
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        status.textContent = '已复制';
      } catch {
        input.focus();
        status.textContent = '链接已选中，可手动复制。';
      }
    });
    share.append(copy, status);
  }
  return share;
}

export function createLocalityRecordEntry(record, chapter, site, selected, passageId) {
  const entry = document.createElement('article');
  entry.className = 'locality-entry' + (selected ? ' is-selected-record' : '');
  entry.dataset.record = record.slug;

  const heading = document.createElement('h4');
  heading.textContent = record.place;
  const context = document.createElement('p');
  context.textContent = record.period + ' · ' + record.measure + '：' + record.value;
  const background = document.createElement('p');
  background.className = 'locality-record-context';
  background.textContent = record.context;
  const citation = document.createElement('a');
  citation.href = recordsHref('local-' + record.slug);
  citation.textContent = bookCitation(record.chapter ?? chapter, record.pages);
  citation.setAttribute('aria-label', '查看' + record.place + '的完整记录：' + citation.textContent);
  entry.append(heading, context, background, citation);
  if (passageId) {
    const passage = document.createElement('a');
    passage.className = 'locality-passage-link';
    passage.href = '#' + passageId;
    passage.textContent = '跳到相关段落 ↗';
    entry.append(passage);
  }

  const page = sourcePage(record.pages);
  if (page) entry.append(createPdfLink(page));
  entry.append(createShareLink(record, site));
  return entry;
}
