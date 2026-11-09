import { ordinals } from './data/book-chapters.js';
import { readings } from './data/readings.js';
import { localRecords } from './data/local-records.js';

export function chapterNumber(chapter) {
  const match = /^第(.+?)章/u.exec(chapter);
  return ordinals.indexOf(match?.[1]) + 1;
}

const readingByRegion = new Map(readings.map(reading => [reading.region, reading]));
const passages = new Map();
const records = new Map();
const destinations = new Map();

for (const reading of readings) {
  const main = chapterNumber(reading.chapter);
  destinations.set(reading.slug, { number: main, fragment: reading.slug });
  destinations.set('evidence-' + reading.slug, { number: main, fragment: reading.slug });
  reading.evidence.forEach((item, index) => {
    const number = chapterNumber(item.chapter ?? reading.chapter);
    const id = item.anchor ?? 'evidence-' + reading.slug + '-' + (index + 1);
    if (!passages.has(number)) passages.set(number, []);
    passages.get(number).push({ reading, item, id });
    destinations.set(id, { number, fragment: id });
  });
}

for (const record of localRecords) {
  const reading = readingByRegion.get(record.region);
  const number = chapterNumber(record.chapter ?? reading?.chapter);
  if (!number) continue;
  if (!records.has(number)) records.set(number, []);
  records.get(number).push(record);
}

export const chapterPassages = number => passages.get(number) ?? [];
export const chapterRecords = number => records.get(number) ?? [];
export const readingDestination = fragment => destinations.get(fragment);
