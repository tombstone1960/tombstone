import { AJAXError, Map as MapLibreMap, LngLatBounds, NavigationControl, addProtocol, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PMTiles, Protocol } from 'pmtiles';
import { estimates } from './data/estimates.js';
import { readings } from './data/readings.js';
import { localRecords } from './data/local-records.js';
import { localSites } from './data/local-sites.js';
import { placeMentions } from './data/place-mentions.js';
import { bookChapters, chapterLabel } from './data/book-chapters.js';
import provinces from './data/provinces.json';
import { createLocalityRecordEntry } from './locality-record-entry.js';
import { createPlaceSearch } from './atlas-search.js';
import { createPdfLink } from './pdf-preview.js';
import { chapterHref, localizedHref, mapHref, readingHref, recordsHref } from './routes.js';
import { english, locale, localText as t } from './localization/locale.js';
import { recordMeasure, recordValue, regionName, regionScope, siteName } from './localization/atlas-copy.js';
import { englishGuides } from './localization/routes.js';
import { guides } from './localization/english-content.js';
import { atlasLayer, atlasOverlays, basemapLayers, estimateColors, estimateLayers, estimateRadius, fadeEnd, fadeStart, mentionZoom, recordLayers } from './atlas-style.js';

const chinaBounds = [[73.2, 18], [135.1, 53.7]];
const atlasBounds = [[-20, -12], [180, 76]];
const satelliteId = 'satellite';
const satelliteSource = {
  type: 'raster',
  tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg'],
  tileSize: 256, maxzoom: 14,
  attribution: '<a href="https://cloudless.eox.at" target="_blank" rel="noreferrer">EOxCloudless</a> by <a href="https://eox.at" target="_blank" rel="noreferrer">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016 &amp; 2017) · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>',
};
const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
const nameOrder = new Intl.Collator(english ? 'en' : 'zh-u-co-pinyin');
const deathText = record => english ? number.format(Math.round(record.deaths * 10_000)) : t(number.format(record.deaths) + ' 万人');
const rateText = record => record.rate.toFixed(2) + '%';
const regionHasEstimate = region => 'deaths' in region;
const provinceById = new Map(provinces.features.map(feature => [feature.properties.id, feature]));
const regionByProvince = new Map(provinces.features.map(({ properties }) => [properties.id, properties]));
const regionOptions = new Map(regionByProvince);
for (const estimate of estimates) {
  regionOptions.set(estimate.id, estimate);
  for (const id of [estimate.id, ...(estimate.members ?? [])]) {
    regionByProvince.set(id, estimate);
    if (id !== estimate.id) regionOptions.delete(id);
  }
}

const readingByRegion = new Map(readings.map(reading => [reading.region, reading]));
const recordBySlug = new Map(localRecords.map(record => [record.slug, record]));
const siteByRecord = new Map();
const sitesByRegion = new Map();
for (const site of localSites) {
  const regions = new Set();
  for (const slug of site.records) {
    if (!siteByRecord.has(slug)) siteByRecord.set(slug, site);
    regions.add(recordBySlug.get(slug).region);
  }
  for (const id of regions) {
    if (!sitesByRegion.has(id)) sitesByRegion.set(id, []);
    sitesByRegion.get(id).push(site);
  }
}

const siteProperties = site => ({ siteId: site.id, name: siteName(site) });
const siteData = pointCollection(localSites, siteProperties);
const estimateData = pointCollection(estimates, region => ({
  id: region.id, name: regionName(region), deaths: region.deaths, rate: region.rate,
}));
const maximum = { deaths: Math.max(...estimates.map(x => x.deaths)), rate: Math.max(...estimates.map(x => x.rate)) };
const modernLayers = ['places_locality', 'places_subplace', 'places_region'];
const placeKinds = {
  city: t('城市', 'City'), town: t('城镇', 'Town'), village: t('村落', 'Village'), hamlet: t('小村落', 'Hamlet'),
  suburb: t('城区', 'Suburb'), quarter: t('社区', 'Neighborhood'), province: t('省区', 'Province'),
};
const nearbyPlaces = count => t('附近 ' + count + ' 个地点', count + ' nearby places');
const localRecordsTitle = t('《墓碑》 · 地方记录', 'Tombstone · Local records');
const guideHref = reading => english
  ? englishGuides[reading.slug] ? chapterHref(englishGuides[reading.slug]) : '/read/#' + reading.slug
  : readingHref(reading.slug);
const searchItems = [
  ...[...regionOptions.values()].map(region => ({
    type: 'region', id: region.id, name: regionName(region), label: t('省区', 'Province or region'),
    aliases: [region.id, region.name, ...(region.members ?? []).flatMap(id => {
      const province = provinceById.get(id).properties;
      return [province.name, regionName(province)];
    })],
  })),
  ...localSites.map(site => {
    const records = site.records.map(slug => recordBySlug.get(slug));
    const regions = [...new Set(records.map(record => regionOptions.get(record.region)))];
    return {
      type: 'site', id: site.id, name: siteName(site),
      label: regions.map(regionName).join(english ? ', ' : '、') + t(' · 地方记录', ' · Local records'),
      aliases: [site.id, site.id.replaceAll('-', ' '), site.name, ...regions.flatMap(region => [region.name, regionName(region)]),
        ...records.flatMap(record => [record.place, t(record.place)])],
    };
  }),
  ...placeMentions.map(mention => ({
    type: 'mention', id: mention.id, name: siteName(mention),
    label: t('书中地名 · 第 ' + mention.page + ' 页', 'Place in book · p. ' + mention.page),
    aliases: [mention.name, mention.modern, t(mention.modern), mention.area, t(mention.area), mention.id,
      ...(mention.area === '亳州' ? ['亳县', t('亳县')] : [])],
  })),
].sort((a, b) => Number(b.type === 'region') - Number(a.type === 'region') || nameOrder.compare(a.name, b.name));

function pointCollection(items, properties) {
  return {
    type: 'FeatureCollection',
    features: items.map(item => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: item.location }, properties: properties(item),
    })),
  };
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = t(value);
  if (className) node.className = className;
  return node;
}

function link(label, href) {
  const node = element('a', label);
  node.href = href;
  return node;
}

function regionBounds(region) {
  const bounds = new LngLatBounds();
  for (const id of [region.id, ...(region.members ?? [])]) {
    const geometry = provinceById.get(id).geometry;
    const points = geometry.coordinates.flat(geometry.type === 'Polygon' ? 1 : 2);
    for (const point of points) bounds.extend(point);
  }
  for (const site of sitesByRegion.get(region.id) ?? []) bounds.extend(site.location);
  return bounds;
}

async function localBasemap() {
  const path = import.meta.env.VITE_PMTILES_URL || import.meta.env.BASE_URL + 'tiles/china-atlas.pmtiles';
  const archiveUrl = new URL(path, location.origin).href;
  const archive = new PMTiles(archiveUrl);
  try {
    await archive.getHeader();
  } catch (error) {
    console.warn('Local Protomaps archive is unavailable:', error);
    return null;
  }
  const protocol = new Protocol();
  protocol.add(archive);
  addProtocol('pmtiles', async (request, controller) => {
    const response = await protocol.tile(request, controller);
    // A missing detail tile should use the nearest overview tile.
    if (response.data instanceof Uint8Array && response.data.byteLength === 0) {
      throw new AJAXError(404, 'Tile not found', request.url, new Blob());
    }
    return response;
  });
  return {
    type: 'vector', url: 'pmtiles://' + archiveUrl, sparse: true,
    attribution: '<a href="https://protomaps.com/" target="_blank" rel="noreferrer">Protomaps</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
  };
}

export async function mountNationalMap(section, chapter) {
  const get = id => section.querySelector('#' + id);
  const container = get('map');
  const status = get('atlas-loading');
  const controls = get('atlas-layers');
  const settings = get('atlas-settings');
  const settingsLabel = settings.querySelector('summary');
  const metric = get('atlas-metric');
  const basemapControls = get('atlas-basemap');
  const basemapStatus = get('atlas-basemap-status');
  const reset = get('atlas-reset');
  const close = get('atlas-close-details');
  const kind = get('atlas-detail-kind');
  const title = get('atlas-detail-title');
  const details = get('atlas-detail-content');
  const panel = details.closest('.atlas-details');
  const sites = chapter ? localSites.map(site => ({
    ...site, records: site.records.filter(slug => chapter.records.has(slug)),
  })).filter(site => site.records.length) : localSites;
  const siteById = new Map(sites.map(site => [site.id, site]));
  const mentions = chapter?.mentions ?? placeMentions;
  const mentionById = new Map(mentions.map(mention => [mention.id, mention]));
  let viewBounds = chinaBounds;
  if (chapter) {
    controls.hidden = true;
    settingsLabel.querySelector('.atlas-settings-title').textContent = t('底图', 'Basemap');
    reset.title = t('本章范围', 'Reset to chapter area');
    reset.setAttribute('aria-label', reset.title);
    const focus = regionByProvince.get(chapter.focus);
    const places = sites.length ? sites : mentions;
    if (places.length) {
      viewBounds = places.reduce((bounds, place) => bounds.extend(place.location), new LngLatBounds());
    } else if (focus) {
      viewBounds = regionBounds(focus);
    }
  }
  const announcement = get('atlas-announcement');
  const tooltip = get('atlas-tooltip');
  const [tooltipName, tooltipLine, tooltipSource] = tooltip.children;
  const availablePlaces = searchItems.filter(item => item.type === 'region' || siteById.has(item.id) || mentionById.has(item.id));
  const search = createPlaceSearch(get('atlas-search'), availablePlaces, result => {
    if (result.type === 'region') openRegion(result.id);
    else if (result.type === 'mention') {
      openMention(mentionById.get(result.id));
      title.focus({ preventScroll: true });
    }
    else openSite(siteById.get(result.id));
  });
  const prefersMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = () => prefersMotion.matches ? 0 : 480;
  const basemap = await localBasemap();
  const appearance = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const mapLayers = theme => [
    ...(basemap ? basemapLayers(theme) : [{
      id: 'background', type: 'background', paint: { 'background-color': theme === 'dark' ? '#16232d' : '#e3eaf0' },
    }]),
    ...atlasOverlays(maximum.deaths, Boolean(basemap), theme),
  ];
  let theme = appearance();
  const initialLayers = mapLayers(theme);
  const firstClassicLabel = basemap && initialLayers.find(layer => layer.type === 'symbol');
  setWorkerUrl(workerUrl);

  const map = new MapLibreMap({
    container, bounds: viewBounds, fitBoundsOptions: { padding: 25, maxZoom: 9 },
    maxBounds: atlasBounds, maxZoom: 15,
    dragRotate: false, pitchWithRotate: false, cooperativeGestures: Boolean(chapter), renderWorldCopies: false,
    style: {
      version: 8,
      sources: {
        ...(basemap ? { protomaps: basemap } : {}),
        regions: { type: 'geojson', data: provinces, promoteId: 'id' },
        estimates: { type: 'geojson', data: estimateData },
        historical: { type: 'geojson', data: chapter ? pointCollection(sites, siteProperties) : siteData, cluster: true, clusterRadius: 37, clusterMaxZoom: 11 },
        mentions: { type: 'geojson', data: pointCollection(mentions, mention => ({ mentionId: mention.id, name: siteName(mention) })) },
      },
      layers: initialLayers,
    },
    locale: {
      'NavigationControl.ZoomIn': t('放大', 'Zoom in'),
      'NavigationControl.ZoomOut': t('缩小', 'Zoom out'),
      'CooperativeGesturesHandler.WindowsHelpText': t('按住 Ctrl 并滚动以缩放', 'Hold Ctrl and scroll to zoom'),
      'CooperativeGesturesHandler.MacHelpText': t('按住 ⌘ 并滚动以缩放', 'Hold ⌘ and scroll to zoom'),
      'CooperativeGesturesHandler.MobileHelpText': t('用双指移动地图', 'Use two fingers to move the map'),
      'AttributionControl.ToggleAttribution': t('显示或隐藏地图来源', 'Toggle map attribution'),
    },
  });
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  map.touchZoomRotate.disableRotation();
  map.getCanvas().setAttribute('aria-label', chapter ? t('本章地图 · 《墓碑》地方记录', 'Chapter map · Local records')
    : t('中国大饥荒地图 · 各省死亡估计和地方记录', 'Great Chinese Famine map · Provincial estimates and local records'));

  let mode = 'auto';
  let hoveredRegion = null;
  let hoveredKey = '';
  let selectedRegion = null;
  let selectionVersion = 0;

  function applyAppearance() {
    const next = appearance();
    if (next === theme) return;
    theme = next;
    for (const { id, paint } of mapLayers(theme)) {
      for (const [property, value] of Object.entries(paint ?? {})) {
        if (property.endsWith('-color')) map.setPaintProperty(id, property, value);
      }
    }
  }

  function setBasemap(value) {
    basemapControls.querySelector('input[value="' + value + '"]').checked = true;
    basemapStatus.hidden = true;
    const satellite = value === 'satellite';
    if (satellite && !map.getSource(satelliteId)) {
      map.addSource(satelliteId, satelliteSource);
      map.addLayer({ id: satelliteId, type: 'raster', source: satelliteId }, firstClassicLabel?.id ?? atlasLayer.estimate);
    }
    if (map.getLayer(satelliteId)) {
      map.setLayoutProperty(satelliteId, 'visibility', satellite ? 'visible' : 'none');
    }
    status.hidden = satellite || Boolean(basemap);
    if (!status.hidden) status.textContent = t('经典底图未能加载。仍可查看省区和地方记录。',
      'The classic basemap could not load. Provincial outlines and records are still available.');
  }

  function updateLegend() {
    const zoom = map.getZoom();
    const estimateVisible = mode === 'estimates' || (mode === 'auto' && zoom < fadeEnd);
    const recordsVisible = mode === 'records' || (mode === 'auto' && zoom > fadeStart);
    get('atlas-estimate-key').hidden = !estimateVisible;
    get('atlas-record-key').hidden = !recordsVisible || !sites.length;
    get('atlas-mention-key').hidden = !recordsVisible || !mentions.length;
    metric.hidden = !estimateVisible;
  }

  function setMode(next) {
    mode = next;
    controls.querySelector('input[value="' + mode + '"]').checked = true;
    for (const [layer, property] of estimateLayers) {
      map.setPaintProperty(layer, property, mode === 'auto'
        ? ['interpolate', ['linear'], ['zoom'], fadeStart, 1, fadeEnd, 0] : Number(mode === 'estimates'));
    }
    for (const [layer, property] of recordLayers) {
      map.setPaintProperty(layer, property, mode === 'auto'
        ? ['interpolate', ['linear'], ['zoom'], fadeStart, 0, fadeEnd, 1] : Number(mode === 'records'));
    }
    for (const layer of [atlasLayer.mention, atlasLayer.mentionLabel]) {
      map.setLayoutProperty(layer, 'visibility', mode === 'estimates' ? 'none' : 'visible');
    }
    clearHover();
    updateLegend();
  }

  function regionState(region, state, value) {
    if (!region) return;
    for (const id of [region.id, ...(region.members ?? [])]) {
      map.setFeatureState({ source: 'regions', id }, { [state]: value });
    }
  }

  function setSelection({ region = null, site, record, mention } = {}) {
    selectionVersion++;
    regionState(selectedRegion, 'selected', false);
    selectedRegion = region;
    regionState(selectedRegion, 'selected', true);
    search.setSelection(mention || site ? siteName(mention ?? site) : region ? regionName(region) : '');
    map.setFilter(atlasLayer.selected, ['==', ['get', 'siteId'], site?.id ?? '']);
    if (!chapter) {
      const url = mapHref({ region: region?.id, site: site?.id, record, mention: mention?.id });
      if (location.pathname + location.search !== url) history.replaceState(history.state, '', url);
    }
    clearHover();
  }

  function showDetails(label, name, nodes) {
    kind.textContent = t(label);
    title.textContent = t(name);
    details.replaceChildren(...nodes);
    if (chapter && panel.hidden) map.cooperativeGestures.disable();
    panel.hidden = false;
    panel.scrollTop = details.scrollTop = 0;
    announcement.textContent = t(label + ' · ' + name);
  }

  function clearDetails() {
    if (panel.contains(document.activeElement)) map.getCanvas().focus({ preventScroll: true });
    setSelection();
    if (chapter && !panel.hidden) map.cooperativeGestures.enable();
    panel.hidden = true;
    details.replaceChildren();
    announcement.textContent = '';
  }

  function showRegion(region) {
    setSelection({ region });
    if (chapter) {
      showDetails(t('地理背景', 'Geographic context'), regionName(region), [
        element('p', t('本页地图标出本章相关地点。各省的死亡估计和其他地方的记录，请看全国地图。',
          'This map shows places related to the chapter. Open the full map for provincial death estimates and records from other chapters.'), 'atlas-detail-context'),
        link(t('在全国地图查看 ↗', 'See this region on the full map ↗'), mapHref({ region: region.id })),
      ]);
      return;
    }
    const reading = readingByRegion.get(region.id);
    const nodes = [];
    if (regionHasEstimate(region)) {
      const stats = element('dl', '', 'atlas-stats');
      for (const [label, value] of [
        [t('估计非正常死亡人数', 'Estimated excess deaths'), deathText(region)],
        [t('非正常死亡占人口比例', 'Excess deaths as a share of the population'), rateText(region)],
      ]) {
        const stat = document.createElement('div');
        stat.append(element('dt', label), element('dd', value));
        stats.append(stat);
      }
      nodes.push(stats, element('p', t('这些数字来自曹树基的估算，指比平常多出的死亡人数。各地报告的年份和地区范围可能不同。',
        'Cao Shuji estimated excess deaths, meaning deaths above the expected level. Local reports may cover different years and areas.'), 'atlas-detail-context'));
      if (region.scope) nodes.push(element('p', regionScope(region), 'atlas-detail-context'));
      if (!english && reading?.estimateNote) nodes.push(element('p', reading.estimateNote, 'atlas-detail-context'));
    } else {
      nodes.push(element('p', t('《墓碑》表 14-1 没有单独列出这个地区的估计。',
        'Table 14-1 of Tombstone gives no separate estimate for this area.'), 'atlas-detail-context'));
    }
    const translatedGuide = guides[englishGuides[reading?.slug]];
    if (english && translatedGuide) {
      nodes.push(element('h4', translatedGuide.title), element('p', translatedGuide.summary, 'atlas-detail-context'));
    } else if (!english && reading) {
      nodes.push(element('h4', reading.title), element('p', reading.summary, 'atlas-detail-context'));
      const evidence = reading.evidence[0];
      if (evidence) nodes.push(element('p', evidence.text, 'atlas-detail-context'));
    }
    const actions = element('div', '', 'atlas-detail-actions');
    const focus = element('button', t('放大到该地区', 'Zoom to this region'), 'focus-button');
    focus.type = 'button';
    focus.addEventListener('click', () => map.fitBounds(regionBounds(region), { padding: 35, maxZoom: 9, duration: duration() }));
    actions.append(focus);
    if (reading) actions.append(link(t('地区导读 ↗', translatedGuide ? 'Regional guide ↗' : 'Regional guide in Chinese ↗'), guideHref(reading)));
    if (reading && sitesByRegion.has(region.id)) actions.append(link(t('地方记录 ↗', 'Local records in Chinese ↗'), recordsHref('records-' + reading.slug)));
    if (!english && reading?.estimateAnchor) actions.append(link('看书里的其他估算 ↗', readingHref(reading.estimateAnchor)));
    if (regionHasEstimate(region)) actions.append(createPdfLink(279,
      t('查看原著表 14-1 · 第 279 页', 'Table 14-1 in Chinese · p. 279')));
    nodes.push(actions);
    showDetails(regionHasEstimate(region) ? t('死亡估计 · 曹树基', 'Death estimates · Cao Shuji') : t('地区记录', 'Regional records'),
      regionName(region), nodes);
  }

  function showSite(site, preferredSlug) {
    setSelection({ site, record: preferredSlug });
    const records = site.records.map(slug => recordBySlug.get(slug));
    if (preferredSlug) records.sort((a, b) => Number(b.slug === preferredSlug) - Number(a.slug === preferredSlug));
    const relatedRegions = [...new Set(records.map(record => record.region))];
    const nodes = [element('p', site.level === '范围'
      ? t('这项数字合计了多个地方。圆点只标出大致范围。', 'The figure covers several places. The marker shows the approximate area.')
      : t('圆点用今天的地名标出大致位置（' + site.level + '）。', 'The marker uses a present-day place name to show the approximate location.'), 'atlas-detail-context')];
    for (const record of records) {
      nodes.push(createLocalityRecordEntry(
        record, readingByRegion.get(record.region)?.chapter, site.id, record.slug === preferredSlug,
        chapter?.passages.get(record.slug),
      ));
    }
    const related = element('div', '', 'atlas-detail-actions');
    for (const id of relatedRegions) {
      const reading = readingByRegion.get(id);
      if (reading) related.append(link(t(regionOptions.get(id).name + '地区导读 ↗',
        englishGuides[reading.slug] ? 'Regional guide ↗' : 'Regional guide in Chinese ↗'), guideHref(reading)));
    }
    nodes.push(related);
    showDetails(localRecordsTitle, siteName(site), nodes);
  }

  function openSite(site, preferredSlug, animationDuration = duration()) {
    if (mode === 'estimates') setMode('records');
    showSite(site, preferredSlug);
    map.easeTo({ center: site.location, zoom: Math.max(12, map.getZoom()), duration: animationDuration });
  }

  function showMention(mention) {
    setSelection({ mention });
    const chapterTitle = chapterLabel(bookChapters.find(entry => entry.id === mention.chapterId));
    const citation = createPdfLink(mention.page, undefined, mention.text);
    const locationSource = link(t('地图坐标来源 ↗', 'Map coordinate source ↗'), 'https://www.geonames.org/' + mention.geonamesId + '/');
    locationSource.target = '_blank';
    locationSource.rel = 'noreferrer';
    const location = element('section', '', 'atlas-mention-section');
    location.append(
      element('h4', t('地图位置', 'Map location')),
      element('p', t('地图用今天的' + mention.area + ' · ' + mention.modern + '标出大致位置。',
        'Approximate location near present-day ' + mention.area + ' · ' + mention.modern + '.'), 'atlas-detail-context'),
      locationSource,
    );
    const source = element('section', '', 'atlas-mention-section');
    const actions = element('div', '', 'atlas-detail-actions');
    const guide = guides[mention.chapterId];
    actions.append(citation, link(t('本章导读 ↗', guide ? 'Chapter guide ↗' : 'Chapter guide in Chinese ↗'), chapterHref(mention.chapterId)));
    const chapterRef = element('p', chapterTitle, 'atlas-detail-context');
    if (english) chapterRef.lang = 'zh-Hans';
    source.append(element('h4', t('原书出处', 'Source in the book')), chapterRef, actions);
    showDetails(t('《墓碑》 · 书中地名', 'Tombstone · Place in the book'), siteName(mention), [
      element('p', t(mention.context, 'Yang Jisheng mentions this place in the passage linked below.'), 'atlas-detail-context'),
      source,
      location,
    ]);
  }

  function openMention(mention, animationDuration = duration()) {
    if (mode === 'estimates') setMode('records');
    showMention(mention);
    map.easeTo({ center: mention.location, zoom: Math.max(11, map.getZoom()), duration: animationDuration });
  }

  async function showCluster(feature) {
    setSelection();
    const version = selectionVersion;
    const source = map.getSource('historical');
    const { cluster_id: id, point_count: count } = feature.properties;
    showDetails(localRecordsTitle, nearbyPlaces(count), [element('p', t('正在查找附近的记录…', 'Finding nearby records…'), 'atlas-detail-context')]);
    const [leaves, zoom] = await Promise.all([
      source.getClusterLeaves(id, count, 0),
      source.getClusterExpansionZoom(id),
    ]);
    if (version !== selectionVersion) return;
    const sites = leaves.map(leaf => siteById.get(leaf.properties.siteId)).sort((a, b) => nameOrder.compare(a.name, b.name));
    const list = element('ul', '', 'atlas-nearby');
    for (const site of sites) {
      const item = document.createElement('li');
      const button = element('button', siteName(site) + t(' · ' + site.records.length + ' 条记录',
        ' · ' + site.records.length + (site.records.length === 1 ? ' record' : ' records')));
      button.type = 'button';
      button.addEventListener('click', () => openSite(site));
      item.append(button);
      list.append(item);
    }
    showDetails(localRecordsTitle, nearbyPlaces(count), [
      element('p', t('点一个地名，查看当地的记录和原书页码。', 'Select a place to see local records and source pages.'), 'atlas-detail-context'),
      list,
    ]);
    map.easeTo({ center: feature.geometry.coordinates, zoom, duration: duration() });
  }

  function targetAt(point) {
    const zoom = map.getZoom();
    const layers = [];
    if (mode === 'records' || (mode === 'auto' && zoom > fadeStart + 0.15)) {
      layers.push(atlasLayer.record, atlasLayer.cluster, atlasLayer.recordLabel);
      if (zoom >= mentionZoom) layers.push(atlasLayer.mention, atlasLayer.mentionLabel);
    }
    if (mode === 'estimates' || (mode === 'auto' && zoom < fadeEnd - 0.15)) layers.push(atlasLayer.estimate);
    if (layers.length) {
      const box = [[point.x - 5, point.y - 5], [point.x + 5, point.y + 5]];
      const hits = map.queryRenderedFeatures(box, { layers });
      const marker = hits.find(hit => hit.layer.type !== 'symbol') ?? hits[0];
      if (marker?.layer.id === atlasLayer.mention || marker?.layer.id === atlasLayer.mentionLabel) {
        return { type: 'mention', mention: mentionById.get(marker.properties.mentionId) };
      }
      if (marker?.layer.id === atlasLayer.record || marker?.layer.id === atlasLayer.recordLabel) {
        return { type: 'site', site: siteById.get(marker.properties.siteId) };
      }
      if (marker?.layer.id === atlasLayer.cluster) return { type: 'cluster', feature: marker };
      if (marker) return { type: 'region', region: regionOptions.get(marker.properties.id) };
    }
    if (basemap && zoom >= 7) {
      const place = map.queryRenderedFeatures(point, { layers: modernLayers })
        .find(({ properties }) => properties['name:' + locale] || properties['name:zh-Hans'] || properties.name);
      if (place) return {
        type: 'modern',
        name: place.properties['name:' + locale] || place.properties['name:zh-Hans'] || place.properties.name,
        kind: placeKinds[place.properties.kind_detail] || t('地名', 'Place'),
      };
    }
    if (zoom < 8 && (mode === 'estimates' || zoom < fadeEnd)) {
      const area = map.queryRenderedFeatures(point, { layers: [atlasLayer.region] })[0];
      if (area) return { type: 'region', region: regionByProvince.get(area.properties.id) };
    }
    return null;
  }

  function tooltipContent(target) {
    if (target.type === 'mention') {
      const { id, page, summary } = target.mention;
      return ['mention:' + id, siteName(target.mention), t(summary, 'Mentioned in Tombstone'),
        t('《墓碑》第 ' + page + ' 页 · 点开详情', 'Page ' + page + ' · Select for details')];
    }
    if (target.type === 'region') {
      const { region } = target;
      return ['region:' + region.id, regionName(region), !chapter && regionHasEstimate(region)
        ? t('估计非正常死亡 ', 'Estimated excess deaths: ') + deathText(region) + ' · ' + rateText(region)
        : t('点开查看地区记录', 'Select to see regional records')];
    }
    if (target.type === 'site') {
      const { site } = target;
      const first = recordBySlug.get(site.records[0]);
      const line = recordMeasure(first) + ' · ' + recordValue(first)
        + (site.records.length > 1 ? t(' · 共 ' + site.records.length + ' 条记录', ' · ' + site.records.length + ' records') : '');
      return ['site:' + site.id, siteName(site), line];
    }
    if (target.type === 'cluster') {
      const { cluster_id: id, point_count: count } = target.feature.properties;
      return ['cluster:' + id, nearbyPlaces(count), t('点击查看地点列表', 'Select to see the list')];
    }
    return ['modern:' + target.name, target.name, t('现代底图 · ', 'Modern basemap · ') + target.kind];
  }

  function clearHover() {
    if (hoveredRegion) regionState(hoveredRegion, 'hover', false);
    hoveredRegion = null;
    hoveredKey = '';
    tooltip.hidden = true;
    map.getCanvas().style.cursor = '';
  }

  function moveTooltip(event) {
    if (map.isMoving() || event.originalEvent.buttons) return clearHover();
    const target = targetAt(event.point);
    if (!target) return clearHover();
    const [key, name, line, source] = tooltipContent(target);
    if (key !== hoveredKey) {
      clearHover();
      hoveredKey = key;
      hoveredRegion = target.region ?? null;
      regionState(hoveredRegion, 'hover', true);
      tooltipName.textContent = t(name);
      tooltipLine.textContent = t(line);
      tooltipSource.textContent = t(source ?? '');
      tooltipSource.hidden = !source;
      tooltip.hidden = false;
      map.getCanvas().style.cursor = 'pointer';
    }
    const { x, y } = event.point;
    const left = Math.max(6, Math.min(container.clientWidth - tooltip.offsetWidth - 6, x + 14));
    const preferredTop = y > tooltip.offsetHeight + 16 ? y - tooltip.offsetHeight - 12 : y + 14;
    const top = Math.max(6, Math.min(container.clientHeight - tooltip.offsetHeight - 6, preferredTop));
    tooltip.style.transform = 'translate(' + left + 'px,' + top + 'px)';
  }

  function openRegion(id, animationDuration = duration()) {
    const region = regionByProvince.get(id);
    if (!region) return;
    showRegion(region);
    map.fitBounds(regionBounds(region), { padding: 35, maxZoom: 9, duration: animationDuration });
  }

  function showOverview() {
    settings.open = false;
    clearDetails();
    setMode(chapter ? 'records' : 'auto');
    map.fitBounds(viewBounds, { padding: 25, maxZoom: 9, duration: duration() });
  }

  return new Promise(resolve => {
    map.on('error', ({ error, sourceId }) => {
      if (sourceId === satelliteId) {
        if (basemapControls.querySelector('input:checked').value !== 'satellite') return;
        setBasemap('classic');
        const feedback = settings.open ? basemapStatus : status;
        feedback.hidden = false;
        feedback.textContent = t('卫星影像暂时无法加载，已切回经典地图。', 'Satellite imagery could not load. The classic basemap is back on.');
        console.warn('Satellite imagery unavailable:', error);
        return;
      }
      status.hidden = false;
      status.textContent = t('地图有些内容没能加载。', 'Some map content could not load.');
      console.error('National map error:', error);
    });
    map.once('load', () => {
      document.addEventListener('appearancechange', applyAppearance);
      map.once('remove', () => document.removeEventListener('appearancechange', applyAppearance));
      applyAppearance();
      get('atlas-estimate-key').querySelector('.atlas-key-dot').style.backgroundColor = estimateColors[2];
      for (const [index, label] of ['＜2%', '2–5%', '5–10%', '10–15%', '≥15%'].entries()) {
        const key = element('span', label);
        key.style.borderColor = estimateColors[index];
        get('atlas-rate-scale').append(key);
      }
      controls.disabled = metric.disabled = basemapControls.disabled = get('atlas-place-search').disabled = reset.disabled = false;
      metric.querySelector('input[value="deaths"]').checked = true;
      setBasemap('classic');
      setMode(chapter ? 'records' : 'auto');

      controls.addEventListener('change', event => setMode(event.target.value));
      metric.addEventListener('change', () => {
        const selectedMetric = metric.querySelector('input:checked');
        map.setPaintProperty(atlasLayer.estimate, 'circle-radius', estimateRadius(selectedMetric.value, maximum[selectedMetric.value]));
        const metricLabel = selectedMetric.labels[0].textContent.trim();
        get('atlas-size-label').textContent = t('圆的大小表示', 'Circle size shows ') + (english ? metricLabel.toLowerCase() : metricLabel);
      });
      basemapControls.addEventListener('change', event => setBasemap(event.target.value));
      document.addEventListener('pointerdown', event => {
        if (settings.open && !settings.contains(event.target)) settings.open = false;
      });
      settings.addEventListener('focusout', event => {
        if (event.relatedTarget && !settings.contains(event.relatedTarget)) settings.open = false;
      });
      settings.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !settings.open) return;
        event.stopPropagation();
        settings.open = false;
        settingsLabel.focus();
      });
      reset.addEventListener('click', showOverview);
      close.addEventListener('click', clearDetails);
      section.addEventListener('keydown', event => { if (event.key === 'Escape') clearDetails(); });
      panel.addEventListener('wheel', event => {
        // Keep plain scrolling inside long details, and send pinch gestures to the map.
        const canScroll = panel.scrollHeight > panel.clientHeight || details.scrollHeight > details.clientHeight;
        if (!event.deltaY || (canScroll && !event.ctrlKey && !event.metaKey)) return;
        event.preventDefault();
        map.getCanvas().dispatchEvent(new WheelEvent('wheel', {
          bubbles: true, cancelable: true,
          clientX: event.clientX, clientY: event.clientY,
          deltaY: event.deltaY, deltaMode: event.deltaMode,
          ctrlKey: event.ctrlKey, metaKey: event.metaKey,
        }));
      }, { passive: false });

      map.on('zoom', updateLegend);
      map.on('movestart', clearHover);
      map.on('mouseout', clearHover);
      map.on('mousemove', moveTooltip);
      map.on('click', event => {
        const target = targetAt(event.point);
        if (!target) return clearDetails();
        if (target.type === 'region') showRegion(target.region);
        else if (target.type === 'site') showSite(target.site);
        else if (target.type === 'cluster') showCluster(target.feature).catch(console.error);
        else if (target.type === 'mention') showMention(target.mention);
        else {
          setSelection();
          showDetails(t('现代底图 · ', 'Modern basemap · ') + target.kind, target.name, [
            element('p', t('这个地名来自 OpenStreetMap。点红色圆点可看《墓碑》里的地方记录。',
              'This is a present-day place from OpenStreetMap. Select a red circle for a record from Tombstone.'), 'atlas-detail-context'),
            link(t('查阅地方记录 ↗', 'Browse local records in Chinese ↗'), localizedHref('/records/')),
          ]);
        }
      });

      if (!chapter) {
        const query = new URLSearchParams(location.search);
        const mention = mentionById.get(query.get('mention'));
        const slug = query.get('record');
        const requested = siteById.get(query.get('site'));
        const site = requested?.records.includes(slug) ? requested : siteByRecord.get(slug) ?? requested;
        if (mention) openMention(mention, 0);
        else if (site) openSite(site, site.records.includes(slug) ? slug : undefined, 0);
        else if (regionByProvince.has(query.get('region'))) openRegion(query.get('region'), 0);
      }
      resolve({
        focusRecord(slug, siteId) {
          const site = siteId ? siteById.get(siteId) : sites.find(candidate => candidate.records.includes(slug));
          if (!site?.records.includes(slug)) return;
          openSite(site, slug);
          title.focus({ preventScroll: true });
        },
      });
    });
  });
}
