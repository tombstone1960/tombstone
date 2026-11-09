import { layers, namedFlavor } from '@protomaps/basemaps';
import { locale } from './localization/locale.js';

export const fadeStart = 5.2;
export const fadeEnd = 6.3;
export const mentionZoom = 9;
export const fonts = ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'];
export const estimateColors = ['#bd827a', '#a96056', '#94483f', '#77312c', '#561f24'];
export const estimateBreaks = [2, 5, 10, 15];
const recordColor = '#784352';
const paper = '#f6f9fc';
const omitted = new Set(['pois', 'roads_oneway', 'roads_shields', 'address_label']);

export const atlasLayer = {
  region: 'atlas-provinces',
  estimate: 'estimate-points',
  estimateLabel: 'estimate-labels',
  cluster: 'history-clusters',
  count: 'history-counts',
  record: 'history-points',
  recordLabel: 'history-labels',
  mention: 'history-mentions',
  mentionLabel: 'history-mention-labels',
  selected: 'history-selection',
};

export const estimateLayers = [
  [atlasLayer.estimate, 'circle-opacity'],
  [atlasLayer.estimate, 'circle-stroke-opacity'],
  [atlasLayer.estimateLabel, 'text-opacity'],
];
export const recordLayers = [
  [atlasLayer.cluster, 'circle-opacity'],
  [atlasLayer.cluster, 'circle-stroke-opacity'],
  [atlasLayer.count, 'text-opacity'],
  [atlasLayer.record, 'circle-opacity'],
  [atlasLayer.record, 'circle-stroke-opacity'],
  [atlasLayer.recordLabel, 'text-opacity'],
  [atlasLayer.selected, 'circle-opacity'],
  [atlasLayer.selected, 'circle-stroke-opacity'],
];

export function estimateRadius(metric, maximum) {
  return ['interpolate', ['linear'], ['sqrt', ['get', metric]], 0, 3, Math.sqrt(maximum), 26];
}

export function basemapLayers(theme) {
  const palette = theme === 'dark' ? {
    background: '#18212b', earth: '#222a30', water: '#2c4152',
    park_a: '#2c3833', park_b: '#28332f', wood_a: '#283632', wood_b: '#26322f',
    city_label: '#c4cbd3', city_label_halo: '#222a30',
    subplace_label: '#aeb8c2', subplace_label_halo: '#222a30',
    state_label: '#a5b1be', state_label_halo: '#222a30',
    country_label: '#c4cbd3', country_label_halo: '#222a30',
  } : {
    background: '#e3eaf0', earth: '#eef1f3', water: '#c6d8e6',
    park_a: '#dde8e3', park_b: '#e4ece8', wood_a: '#dae6e0', wood_b: '#e0e9e5',
    boundaries: '#8b99a5',
    major_casing_early: '#c8d2d8', major_casing_late: '#c8d2d8',
    highway_casing_early: '#aebdc7', highway_casing_late: '#aebdc7',
    city_label: '#2c3c46', city_label_halo: paper,
    subplace_label: '#455761', subplace_label_halo: paper,
    state_label: '#5a6a74', state_label_halo: paper,
    country_label: '#566772', country_label_halo: paper,
  };
  return layers('protomaps', { ...namedFlavor(theme), ...palette }, { lang: locale }).filter(layer => !omitted.has(layer.id)).map(layer => {
    if (layer.type !== 'symbol') return layer;
    const { 'icon-image': image, 'icon-size': size, ...layout } = layer.layout;
    return {
      ...layer,
      layout: { ...layout, 'text-font': fonts },
      paint: { ...layer.paint, 'text-halo-width': 1.6 },
    };
  });
}

export function atlasOverlays(maximumDeaths, hasBasemap, theme) {
  const dark = theme === 'dark';
  const halo = dark ? '#172129' : paper;
  const cluster = ['has', 'point_count'];
  const highlighted = key => ['boolean', ['feature-state', key], false];
  return [
    {
      id: atlasLayer.region, type: 'fill', source: 'regions',
      paint: {
        'fill-color': ['case', highlighted('selected'), '#507594', highlighted('hover'), '#7999a9', dark ? '#25343f' : '#e5eaf0'],
        'fill-opacity': ['case', highlighted('selected'), 0.20, highlighted('hover'), 0.14, hasBasemap ? 0 : 0.8],
        'fill-outline-color': hasBasemap ? 'transparent' : dark ? '#5e7384' : '#929eab',
      },
    },
    {
      id: atlasLayer.estimate, type: 'circle', source: 'estimates',
      layout: { 'circle-sort-key': ['-', ['get', 'deaths']] },
      paint: {
        'circle-radius': estimateRadius('deaths', maximumDeaths),
        'circle-color': ['step', ['get', 'rate'], estimateColors[0],
          ...estimateBreaks.flatMap((threshold, index) => [threshold, estimateColors[index + 1]])],
        'circle-stroke-color': paper, 'circle-stroke-width': 1.5,
      },
    },
    {
      id: atlasLayer.estimateLabel, type: 'symbol', source: 'estimates',
      layout: { 'text-field': ['get', 'name'], 'text-font': fonts, 'text-size': 12, 'text-offset': [0, 1.8] },
      paint: { 'text-color': dark ? '#dceaf5' : '#29404d', 'text-halo-color': halo, 'text-halo-width': 1.4 },
    },
    {
      id: atlasLayer.cluster, type: 'circle', source: 'historical', filter: cluster,
      paint: { 'circle-radius': 16, 'circle-color': recordColor, 'circle-stroke-color': paper, 'circle-stroke-width': 2.5 },
    },
    {
      id: atlasLayer.count, type: 'symbol', source: 'historical', filter: cluster,
      layout: { 'text-field': ['to-string', ['get', 'point_count']], 'text-font': fonts, 'text-size': 13, 'text-allow-overlap': true },
      paint: { 'text-color': paper },
    },
    {
      id: atlasLayer.selected, type: 'circle', source: 'historical', filter: ['==', ['get', 'siteId'], ''],
      paint: { 'circle-radius': 14, 'circle-color': '#f2dce4', 'circle-stroke-color': recordColor, 'circle-stroke-width': 1.5 },
    },
    {
      id: atlasLayer.record, type: 'circle', source: 'historical', filter: ['!', cluster],
      paint: { 'circle-radius': 8, 'circle-color': recordColor, 'circle-stroke-color': paper, 'circle-stroke-width': 2 },
    },
    {
      id: atlasLayer.recordLabel, type: 'symbol', source: 'historical', minzoom: 7, filter: ['!', cluster],
      layout: {
        'text-field': ['get', 'name'], 'text-font': fonts, 'text-size': 13,
        'text-variable-anchor': ['right', 'left', 'top', 'bottom'],
        'text-radial-offset': 1.1, 'text-padding': 4,
      },
      paint: { 'text-color': dark ? '#f0cbd7' : '#522c38', 'text-halo-color': halo, 'text-halo-width': 1.6 },
    },
    {
      id: atlasLayer.mention, type: 'circle', source: 'mentions', minzoom: mentionZoom,
      paint: { 'circle-radius': 6.5, 'circle-color': paper, 'circle-stroke-color': '#28616b', 'circle-stroke-width': 2.5 },
    },
    {
      id: atlasLayer.mentionLabel, type: 'symbol', source: 'mentions', minzoom: mentionZoom,
      layout: {
        'text-field': ['get', 'name'], 'text-font': fonts, 'text-size': 12,
        'text-variable-anchor': ['right', 'left', 'top', 'bottom'], 'text-radial-offset': 1.1, 'text-padding': 4,
      },
      paint: { 'text-color': dark ? '#b4e5e9' : '#204d55', 'text-halo-color': halo, 'text-halo-width': 1.6 },
    },
  ];
}
