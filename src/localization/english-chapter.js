import { chapterRecords } from '../chapter-index.js';
import { placeMentions } from '../data/place-mentions.js';
import { guides } from './english-content.js';

const id = document.body.dataset.chapter;
const atlas = document.querySelector('#atlas');
const places = document.querySelectorAll('[data-map-record]');
const passages = new Map(Array.from(places, link => [link.dataset.mapRecord, link.closest('article').id]));
let mapReady;

function loadMap() {
  observer.disconnect();
  return mapReady ??= import('../national-map.js').then(({ mountNationalMap }) => mountNationalMap(atlas, {
    focus: guides[id].region,
    records: new Set(chapterRecords(Number(id)).map(record => record.slug)),
    mentions: placeMentions.filter(mention => mention.chapterId === id),
    passages,
  })).catch(error => {
    atlas.querySelector('#atlas-loading').textContent = 'The chapter map could not load. Try the national map.';
    console.error('Could not load chapter map:', error);
  });
}

const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) loadMap();
}, { rootMargin: '160px' });
observer.observe(atlas);

document.querySelector('.chapter-body').addEventListener('click', event => {
  const link = event.target.closest('[data-map-record]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  atlas.scrollIntoView({ block: 'nearest' });
  loadMap().then(map => map?.focusRecord(link.dataset.mapRecord));
});
