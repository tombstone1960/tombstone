import { referencePageHref, referencePdf } from '../data/citations.js';
import { readFileSync } from 'node:fs';
import { guides } from './english-content.js';

const atlasControls = readFileSync(new URL('../atlas-controls.html', import.meta.url), 'utf8');

const site = 'Tombstone · A Reading Guide';
const original = (page, label = 'Original in Chinese') =>
  `<a href="${referencePageHref(page)}" target="_blank" rel="noreferrer">${label} · PDF p. ${page} ↗</a>`;

function section(title, intro, body) {
  return `<section class="page-section" aria-labelledby="localized-title">
    <div class="section-intro"><h1 id="localized-title">${title}</h1><p>${intro}</p></div>
    ${body}
  </section>`;
}

const guideLinks = Object.entries(guides).map(([id, guide]) =>
  `<li><a href="/en/read/${id}/"><strong>${guide.place}</strong><span>${guide.summary}</span></a></li>`).join('');

const home = `<section class="hero" aria-labelledby="home-title">
  <div class="hero-inner">
    <div class="hero-copy">
      <p class="eyebrow"><span class="eyebrow-line"></span> 1958–1962</p>
      <h1 id="home-title">Tombstone</h1>
      <p class="hero-subtitle">Local histories of the Great Chinese Famine</p>
      <p class="hero-description">Yang Jisheng begins with his father’s death during the famine and asks how the disaster came about. Find places mentioned in the book on the map and follow the page references to the original.</p>
      <div class="hero-actions">
        <a class="primary-link" href="/en/map/">Open the map <span aria-hidden="true">→</span></a>
        <a class="hero-text-link" href="/en/read/">Browse the guides <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <figure class="hero-stone">
      <img class="memorial" src="/stele-rubbing.webp" width="563" height="720" alt="Rubbing of a stele bearing the Chinese title of Tombstone">
      <figcaption>An independent guide to Yang Jisheng’s book</figcaption>
    </figure>
  </div>
</section>
<section class="page-section home-feature" aria-labelledby="feature-title">
  <div class="home-section-heading"><h2 id="feature-title">Village life during the famine</h2><a href="/en/sources/">Sources and map notes ↗</a></div>
  <div class="home-stories">${Object.entries(guides).map(([id, guide]) =>
    `<article><p class="eyebrow">${guide.place}</p><h3><a href="/en/read/${id}/">${guide.title}</a></h3><p>${guide.summary}</p></article>`).join('')}
  </div>
</section>`;

const sources = section('Sources', 'An independent reading guide to Yang Jisheng’s Tombstone. The notes below explain where the numbers and map locations come from and how to check the original.', `
  <dl class="source-list">
    <div id="book-source"><dt>The book and page numbers</dt><dd>Page numbers refer to the August 2007 Chinese reference PDF held by the China Unofficial Archives. If you have a different edition, look up the chapter title.
      <div class="source-links"><a href="${referencePdf}" target="_blank" rel="noreferrer">Reference PDF in Chinese ↗</a><a href="https://academic.macmillan.com/academictrade/9780374533991/tombstone/" target="_blank" rel="noreferrer">English edition and publisher’s Xinyang excerpt ↗</a></div></dd></div>
    <div id="estimate-source"><dt>Provincial death estimates</dt><dd>The map uses Cao Shuji’s estimates of excess deaths, meaning deaths above the expected level. The figures appear in Cao’s <i>The Great Famine: China’s Population in 1959–1961</i> (2005, p. 282) and in Table 14-1 of Chapter 13 of <i>Tombstone</i>. Cao’s study defines the years and areas covered. Yang disagrees with some of Cao’s methods and provincial rankings.
      <div class="source-links">${original(279, 'Table 14-1 in Chinese')}</div></dd></div>
    <div id="local-source"><dt>Local records</dt><dd>Local records come from Yang’s account and the reports, investigations, and recollections he cites. Some county, commune, and village records count the same people. Adding those figures can double-count them. A people’s commune was a collective administrative and economic unit that included multiple villages or production units.</dd></div>
    <div id="locality-source"><dt>Where markers are placed</dt><dd>Markers show approximate locations using present-day place names. When a precise location is unknown, the marker uses the surrounding village, town, or county. A numbered circle groups nearby places. Coordinates come from <a href="https://www.geonames.org/export/">GeoNames</a> under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</dd></div>
    <div><dt>Reading the map</dt><dd>For provincial estimates, circle size represents the estimated number of excess deaths by default. You can size the circles by excess deaths as a share of the population. Darker circles indicate a higher share. Hollow circles mark places named in the book. The basemap uses Protomaps and <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, with simplified Natural Earth provincial outlines. Historical reporting areas may cross current boundaries.</dd></div>
    <div><dt>Satellite imagery</dt><dd>The satellite basemap uses EOX’s mosaic of Sentinel-2 imagery from 2016 and 2017. <a href="https://cloudless.eox.at/license-non-commercial">Imagery and attribution ↗</a></dd></div>
    <div id="feedback"><dt>Corrections and feedback</dt><dd>Please include the page link, what should change, and the book chapter and page if available. GitHub submissions are public.
      <div class="source-links"><a href="https://github.com/tombstone1960/tombstone/issues/new">Send feedback on GitHub ↗</a></div></dd></div>
  </dl>`);

const index = section('Reading guides', 'Start with these three English guides. The full chapter index and additional records are available in Chinese.', `
  <div class="chapter-index"><section class="volume-group"><h2>Regional guides</h2><ul>${guideLinks}</ul></section></div>
  <p><a href="/read/" hreflang="zh-Hans">Full chapter index in Simplified Chinese ↗</a></p>
  <p><a href="/zh-hant/read/" hreflang="zh-Hant">Full chapter index in Traditional Chinese ↗</a></p>`);

const guidePage = (id, guide) => `
  <header class="chapter-hero"><div class="chapter-wrap">
    <nav class="chapter-breadcrumb" aria-label="Reading guides"><a href="/en/read/">Reading guides</a></nav>
    <p class="eyebrow">${guide.place}</p><h1>${guide.title}</h1><p class="chapter-summary">${guide.summary}</p>
    <div class="chapter-meta">${original(guide.page)} <a href="/en/map/?region=${guide.region}">Open the regional map ↗</a></div>
  </div></header>
  <div class="chapter-wrap chapter-body">
    <div class="chapter-columns">
      <section id="passages" aria-labelledby="guide-passages"><h2 id="guide-passages">Reading notes</h2><div class="evidence-list">
        ${guide.passages.map(([title, text, page, record]) => `<article class="evidence chapter-evidence"${record ? ` id="passage-${record}" tabindex="-1"` : ''}>
          <h3>${title}</h3><p>${text}</p><div class="chapter-place-list">
            ${original(page)} ${record ? `<a href="/en/map/?record=${record}" data-map-record="${record}">Find this record on the map ↗</a>` : ''}
          </div>
        </article>`).join('')}
      </div></section>
      <section id="chapter-map" class="chapter-map" aria-labelledby="chapter-map-title">
        <h2 id="chapter-map-title">Chapter map</h2>
        <p class="chapter-map-note">Select a marker to see the source page and, where available, the related reading note.</p>
        <div id="atlas" class="chapter-atlas">${atlasControls}</div>
        <a class="chapter-atlas-link" href="/en/map/?region=${guide.region}">Open the full map ↗</a>
      </section>
    </div>
    <nav class="chapter-navigation" aria-label="Related guides"><a href="/en/read/">All English guides</a><a href="/read/${id}/" hreflang="zh-Hans">Full chapter guide in Chinese ↗</a></nav>
  </div>`;

export const englishContent = {
  '/': { title: site, description: 'Explore local histories of the Great Chinese Famine through Yang Jisheng’s Tombstone.', body: home },
  '/map/': { title: 'Map of the Great Chinese Famine · Tombstone', description: 'Explore provincial estimates and find places and source pages in Tombstone.' },
  '/sources/': { title: 'Sources · ' + site, description: 'Find the book edition, the origins of the data, and a guide to reading the map.', body: sources },
  '/read/': { title: 'Reading guides · ' + site, description: 'Read English guides to Xinyang, Sichuan, and Anhui, with links to the Chinese original.', body: index },
  ...Object.fromEntries(Object.entries(guides).map(([id, guide]) => ['/read/' + id + '/', {
    title: guide.title + ' · ' + site, description: guide.summary, body: guidePage(id, guide), mainClass: 'chapter-page', hasMap: true,
  }])),
};
