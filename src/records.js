import { readings } from './data/readings.js';
import { localRecords } from './data/local-records.js';
import { localSites } from './data/local-sites.js';
import { bookCitation, sourcePage } from './data/citations.js';
import provinces from './data/provinces.json';
import { fill, scrollToFragment } from './page-content.js';
import { createPdfLink } from './pdf-preview.js';
import { mapHref, readingHref } from './routes.js';
import { localizeTraditional } from './localization/locale.js';

const localIndex = document.querySelector('#local-index');
const localList = document.querySelector('#local-list');
const localGroupTemplate = document.querySelector('#local-group-template');
const localRecordTemplate = document.querySelector('#local-record-template');
const regionNames = new Map(provinces.features.map(({ properties: { id, name } }) => [id, name]));
const mappedSlugs = new Set(localSites.flatMap(site => site.records));
const nameOrder = new Intl.Collator('zh-CN', { collation: 'pinyin' });

function renderLocalRecords(reading, records) {
  const { slug, region, chapter } = reading;
  const groupId = 'records-' + slug;
  const name = regionNames.get(region);
  const indexLink = document.createElement('a');
  indexLink.href = '#' + groupId;
  indexLink.textContent = name;
  localIndex.append(indexLink);

  const group = localGroupTemplate.content.cloneNode(true);
  const section = group.querySelector('section');
  const heading = group.querySelector('h2');
  section.id = groupId;
  heading.id = groupId + '-title';
  section.setAttribute('aria-labelledby', heading.id);
  fill(group, { name });
  group.querySelector('[data-reading-link]').href = readingHref(slug);
  const grid = group.querySelector('.local-grid');
  for (const record of records) {
    const card = localRecordTemplate.content.cloneNode(true);
    const { level, place, period, measure, value, context, pages } = record;
    card.querySelector('article').id = 'local-' + record.slug;
    if (mappedSlugs.has(record.slug)) {
      const mapLink = card.querySelector('[data-local-map]');
      mapLink.href = mapHref({ record: record.slug });
      mapLink.hidden = false;
    }
    const page = sourcePage(pages);
    if (page) card.querySelector('.citation').after(createPdfLink(page));
    fill(card, { level, place, period, measure, value, context, citation: bookCitation(record.chapter ?? chapter, pages) });
    grid.append(card);
  }
  localList.append(group);
}

for (const reading of [...readings].sort((a, b) =>
  nameOrder.compare(regionNames.get(a.region), regionNames.get(b.region)))) {
  const records = localRecords.filter(record => record.region === reading.region);
  if (records.length) renderLocalRecords(reading, records);
}

localizeTraditional(localIndex);
localizeTraditional(localList);
scrollToFragment();
