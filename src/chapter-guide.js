import { bookChapters, chapterLabel, ordinals, subsectionLabels, subsectionStarts } from './data/book-chapters.js';
import { chapterFigures, chapterNotes, chapterPeople } from './data/chapter-notes.js';
import { localSites } from './data/local-sites.js';
import { placeMentions } from './data/place-mentions.js';
import { passageRecords } from './data/chapter-map-links.js';
import { chapterNumber, chapterPassages, chapterRecords } from './chapter-index.js';
import { bookCitation, sourcePage } from './data/citations.js';
import { fill, scrollToFragment } from './page-content.js';
import { createPdfLink } from './pdf-preview.js';
import { chapterHref, localizedHref, mapHref, recordsHref } from './routes.js';
import { localText, localizeTraditional } from './localization/locale.js';

const get = id => document.getElementById(id);
const index = bookChapters.findIndex(chapter => chapter.id === document.body.dataset.chapter);
const chapter = bookChapters[index];
const label = chapterLabel(chapter);
const sectionStarts = subsectionStarts[chapter.number - 1] ?? [];
const requested = Number(new URLSearchParams(location.search).get('section'));
const section = Number.isInteger(requested) && sectionStarts[requested - 1] ? requested : 0;
const startPage = section ? sectionStarts[section - 1] : chapter.page;
const endPage = (section ? sectionStarts[section] : undefined) ?? bookChapters[index + 1]?.page ?? 571;
const inSection = page => !section || (Number(page) >= startPage && Number(page) <= endPage);
const records = chapterRecords(chapter.number).filter(record => inSection(sourcePage(record.pages)));
const mentions = placeMentions.filter(mention => mention.chapterId === chapter.id && inSection(mention.page));
const recordsBySlug = new Map(records.map(record => [record.slug, record]));
const sitesByRecord = new Map();
for (const site of localSites) {
  for (const slug of site.records) {
    if (!recordsBySlug.has(slug)) continue;
    if (!sitesByRecord.has(slug)) sitesByRecord.set(slug, []);
    sitesByRecord.get(slug).push(site);
  }
}
const mapPassages = new Map();
const sectionLabels = subsectionLabels[chapter.number - 1] ?? [];

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function link(text, href) {
  const anchor = node('a', text);
  anchor.href = href;
  return anchor;
}

function placeLink(text, record, site) {
  const anchor = link(text, mapHref({ site: site.id, record: record.slug }));
  anchor.className = 'chapter-place-link';
  anchor.dataset.mapSite = site.id;
  anchor.dataset.mapRecord = record.slug;
  anchor.setAttribute('aria-label', '在地图上看：' + (text === '在地图上看' ? record.place : text));
  return anchor;
}

function connectPassage(card, slugs) {
  const places = slugs.flatMap(slug => {
    const sites = sitesByRecord.get(slug) ?? [];
    if (sites.length) mapPassages.set(slug, card.id);
    return sites.map(site => ({
      record: recordsBySlug.get(slug),
      site,
      name: sites.length > 1 ? site.name : recordsBySlug.get(slug).place,
    }));
  });
  if (!places.length) return;

  const paragraph = card.querySelector('.chapter-passage-text');
  const text = paragraph.textContent;
  const inline = places.map(place => {
    const name = text.includes(place.name) ? place.name : place.site.name;
    return { place, name, start: text.indexOf(name) };
  }).filter(item => item.start >= 0).sort((a, b) => a.start - b.start || b.name.length - a.name.length);

  const linked = new Set();
  const content = document.createDocumentFragment();
  let offset = 0;
  for (const { place, name, start } of inline) {
    if (start < offset) continue;
    content.append(text.slice(offset, start), placeLink(name, place.record, place.site));
    offset = start + name.length;
    linked.add(place);
  }
  if (linked.size) {
    content.append(text.slice(offset));
    paragraph.replaceChildren(content);
  }
  const otherPlaces = places.filter(place => !linked.has(place));
  if (otherPlaces.length) {
    const links = node('div', '', 'chapter-place-list');
    links.append(node('span', '地图上的地点'));
    links.append(...otherPlaces.map(({ name, record, site }) => placeLink(name, record, site)));
    paragraph.after(links);
  }
}

const sectionName = section && (sectionLabels[section - 1] || '第 ' + section + ' 节');
fill(document.querySelector('.chapter-hero'), {
  part: chapter.part,
  number: chapter.number ? '第' + ordinals[chapter.number - 1] + '章' : '《墓碑》· ' + chapter.part,
  title: sectionName || chapter.title,
  summary: section ? '这一节出自《' + chapter.title + '》。下方是本站的笔记和记录，也可以直接读原文。' : chapter.summary,
  pages: '2007 年 8 月参考版 · PDF 第 ' + startPage + ' 页起',
});
if (section) document.title = localText(sectionName + ' · ' + chapter.title + ' · 《墓碑》');
get('chapter-original').append(createPdfLink(startPage, section ? '打开本节原文' : '打开原著 · 第 ' + startPage + ' 页'));

if (sectionStarts.length) {
  const subnav = node('details', '', 'chapter-subsections');
  subnav.open = Boolean(section);
  subnav.append(node('summary', '本章小节（' + sectionStarts.length + ' 节）'));
  const links = node('div');
  links.append(link('整章导读', chapterHref(chapter.id)));
  sectionStarts.forEach((page, position) => {
    const title = sectionLabels[position] ?? '第 ' + (position + 1) + ' 节';
    const item = link(title + ' · 第 ' + page + ' 页', chapterHref(chapter.id) + '?section=' + (position + 1));
    if (section === position + 1) item.setAttribute('aria-current', 'page');
    links.append(item);
  });
  subnav.append(links);
  get('chapter-toc').after(subnav);
}

function renderTable(data) {
  const table = node('table', '', 'evidence-table');
  table.createCaption().textContent = data.caption;
  for (const title of data.headers) {
    const th = node('th', title);
    th.scope = 'col';
    (table.tHead?.rows[0] ?? table.createTHead().insertRow()).append(th);
  }
  const tbody = table.createTBody();
  for (const [key, value] of data.rows) {
    const row = tbody.insertRow();
    const th = node('th', key);
    th.scope = 'row';
    row.append(th, node('td', value));
  }
  return table;
}

function passage(title, text, pages, meta) {
  const card = node('article', '', 'evidence chapter-evidence');
  card.tabIndex = -1;
  if (meta) card.append(meta);
  card.append(node('h3', title), node('p', text, 'chapter-passage-text'));
  const source = node('div', bookCitation(label, pages), 'citation');
  card.append(source);
  const page = sourcePage(pages);
  if (page) card.append(createPdfLink(page));
  return { card, source };
}

const passages = get('chapter-passages');
const guidesShown = new Set();
for (const { reading, item, id } of chapterPassages(chapter.number)) {
  if (!inSection(sourcePage(item.pages))) continue;
  const region = node('p', reading.place, 'eyebrow');
  if (chapterNumber(reading.chapter) === chapter.number && !guidesShown.has(reading.slug)) {
    guidesShown.add(reading.slug);
    region.id = reading.slug;
  }
  const { card, source } = passage(item.title, item.text, item.pages, region);
  card.id = id;
  connectPassage(card, passageRecords[id] ?? []);
  if (item.quote) {
    const figure = node('figure');
    const quote = node('blockquote', '“' + item.quote + '”');
    quote.lang = 'zh-Hans';
    figure.append(quote, node('figcaption', item.voice));
    source.before(figure);
  }
  if (item.table) source.before(renderTable(item.table));
  if (item.source) {
    const external = link('对照出版社英文节选 ↗', item.source);
    external.className = 'evidence-source';
    external.target = '_blank';
    external.rel = 'noreferrer';
    card.append(external);
  }
  passages.append(card);
}
for (const [title, page, text] of chapterNotes[chapter.id] ?? []) {
  if (inSection(page)) passages.append(passage(title, text, '第 ' + page + ' 页').card);
}
if (!passages.childElementCount) {
  passages.append(passage('从原文读起', '这几页还没有单独的笔记。你可以直接打开原文，也可以先读整章导读。', '第 ' + startPage + ' 页').card);
}
for (const record of records) {
  if (!sitesByRecord.has(record.slug) || mapPassages.has(record.slug)) continue;
  const { card } = passage(record.place, record.measure + '：' + record.value + '。' + record.context,
    record.pages, node('p', '地方记录', 'eyebrow'));
  card.id = 'passage-' + record.slug;
  connectPassage(card, [record.slug]);
  passages.append(card);
}

const figures = (chapterFigures[chapter.id] ?? []).filter(figure => inSection(figure[3]));
const featured = chapter.id === '04'
  ? ['huaidong', 'anhui-wuwei-rate', 'wangge'].map(slug => records.find(record => record.slug === slug)).filter(Boolean)
  : [];
const ranked = [...featured, ...records.filter(record => !featured.includes(record))];
const highlightRecords = ranked.filter((record, position) => ranked.findIndex(other => other.measure === record.measure) === position).slice(0, 3);
for (const record of highlightRecords) {
  figures.push([record.value, record.place + ' · ' + record.measure, record.period, sourcePage(record.pages), record]);
}
for (const [value, title, scope, page, record] of figures) {
  const card = node('article', '', 'chapter-stat');
  card.append(node('h3', title), node('strong', value), node('p', scope));
  if (record) {
    card.append(node('p', record.context), link('查看完整记录 ↗', recordsHref('local-' + record.slug)));
    const sites = sitesByRecord.get(record.slug) ?? [];
    for (const site of sites) {
      card.append(placeLink(sites.length === 1 ? '在地图上看' : site.name, record, site));
    }
  }
  if (page) card.append(createPdfLink(page));
  get('chapter-figure-list').append(card);
}
for (const [name, page, role] of chapterPeople[chapter.id] ?? []) {
  if (!inSection(page)) continue;
  const card = node('article', '', 'chapter-person');
  card.append(node('h3', name), node('p', role), createPdfLink(page));
  get('chapter-person-list').append(card);
}
for (const [id, list] of [['chapter-figures', 'chapter-figure-list'], ['chapter-people', 'chapter-person-list']]) {
  if (!get(list).childElementCount) continue;
  get(id).hidden = false;
  get('chapter-toc').querySelector('[href="#' + id + '"]').hidden = false;
}

const neighbors = get('chapter-navigation');
if (index > 0) neighbors.append(link('← ' + chapterLabel(bookChapters[index - 1]), chapterHref(bookChapters[index - 1].id)));
neighbors.append(link(section ? '返回整章' : '返回原著目录', section ? chapterHref(chapter.id) : localizedHref('/read/')));
if (bookChapters[index + 1]) neighbors.append(link(chapterLabel(bookChapters[index + 1]) + ' →', chapterHref(bookChapters[index + 1].id)));

const mapNote = records.length
  ? '这里有 ' + records.length + ' 条地方记录。点地图圆点可找相关段落，点笔记里的地名可在地图上找到它。'
  : mentions.length ? ''
  : '本页暂未标出地方记录。你仍可搜索地名。';
get('chapter-map-note').textContent = mapNote + (mentions.length
  ? '地图标出 ' + mentions.length + ' 个书中地名。放大后点空心圆，可查看记录和页码。'
  : '');
localizeTraditional(document.querySelector('.chapter-page'));
const atlas = get('atlas');
let mapReady;
function loadMap() {
  mapObserver.disconnect();
  return mapReady ??= import('./national-map.js').then(({ mountNationalMap }) => mountNationalMap(atlas, {
    records: new Set(sitesByRecord.keys()),
    mentions,
    passages: mapPassages,
    focus: chapter.focus,
  })).catch(error => {
    get('atlas-loading').textContent = localText('这里的地图没能加载，可以试试全国地图。');
    console.error('Could not load chapter map:', error);
  });
}
const mapObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) loadMap();
}, { rootMargin: '160px' });
mapObserver.observe(atlas);

document.querySelector('.chapter-body').addEventListener('click', event => {
  const anchor = event.target.closest('a[data-map-site]');
  if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  get('map').scrollIntoView({ block: 'nearest' });
  loadMap().then(map => map?.focusRecord(anchor.dataset.mapRecord, anchor.dataset.mapSite));
});

scrollToFragment();
