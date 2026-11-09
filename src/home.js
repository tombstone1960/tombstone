import { localizedHref, mapHref, readingHref, recordsHref } from './routes.js';

const fragment = location.hash.slice(1);
const legacySections = new Map([
  ['atlas', mapHref()],
  ['anhui-pilot', mapHref({ region: 'AH' })],
  ['readings', localizedHref('/read/')],
  ['local-records', localizedHref('/records/')],
  ['sources', localizedHref('/sources/')],
]);
const sourceIds = ['book-source', 'estimate-source', 'local-source', 'locality-source'];

if (legacySections.has(fragment)) {
  location.replace(legacySections.get(fragment));
} else if (/^(?:local|records)-/u.test(fragment) && !sourceIds.includes(fragment)) {
  location.replace(recordsHref(fragment));
} else if (sourceIds.includes(fragment)) {
  location.replace(localizedHref('/sources/#' + fragment));
} else if (fragment && fragment !== 'top') {
  const { readings } = await import('./data/readings.js');
  if (readings.some(reading => reading.slug === fragment ||
    'evidence-' + reading.slug === fragment || reading.evidence.some(item => item.anchor === fragment))) {
    location.replace(readingHref(fragment));
  }
}
