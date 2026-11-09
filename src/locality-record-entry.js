import { bookCitation, sourcePage } from './data/citations.js';
import { createPdfLink } from './pdf-preview.js';
import { mapHref, recordsHref } from './routes.js';
import { english, localText as t } from './localization/locale.js';
import { recordBackground, recordMeasure, recordName, recordValue } from './localization/atlas-copy.js';

function createShareLink(record, site) {
  const share = document.createElement('details');
  share.className = 'record-share';
  const summary = document.createElement('summary');
  summary.textContent = t('分享地图链接', 'Share map link');
  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.value = new URL(mapHref({ site, record: record.slug }), location.href).href;
  input.setAttribute('aria-label', t(record.place + '的地图链接', 'Map link for ' + recordName(record)));
  input.addEventListener('focus', () => input.select());
  share.append(summary, input);
  if (navigator.clipboard?.writeText) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = t('复制链接', 'Copy link');
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        status.textContent = t('已复制', 'Link copied');
      } catch {
        input.focus();
        status.textContent = t('链接已选中，可手动复制。', 'The link is selected. You can copy it.');
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
  heading.textContent = recordName(record);
  const context = document.createElement('p');
  context.textContent = english
    ? recordMeasure(record) + ' · ' + recordValue(record)
    : t(record.period + ' · ' + record.measure + '：' + record.value);
  const background = document.createElement('p');
  background.className = 'locality-record-context';
  background.textContent = recordBackground(record);
  const citation = document.createElement('a');
  citation.href = recordsHref('local-' + record.slug);
  citation.textContent = t(bookCitation(record.chapter ?? chapter, record.pages), 'Full record in Chinese ↗');
  citation.setAttribute('aria-label', t('查看' + record.place + '的完整记录：' + citation.textContent,
    'Full record in Chinese for ' + recordName(record)));
  entry.append(heading, context, background, citation);
  if (passageId) {
    const passage = document.createElement('a');
    passage.className = 'locality-passage-link';
    passage.href = '#' + passageId;
    passage.textContent = t('跳到相关段落 ↗', 'Go to the related passage ↗');
    entry.append(passage);
  }

  const page = sourcePage(record.pages);
  if (page) entry.append(createPdfLink(page));
  entry.append(createShareLink(record, site));
  return entry;
}
