import { english, localText } from './locale.js';

const provinces = {
  AH: 'Anhui', BJ: 'Beijing', CQ: 'Chongqing', FJ: 'Fujian', GD: 'Guangdong', GS: 'Gansu', GX: 'Guangxi',
  GZ: 'Guizhou', HA: 'Henan', HB: 'Hubei', HE: 'Hebei', HI: 'Hainan', HL: 'Heilongjiang', HN: 'Hunan',
  JL: 'Jilin', JS: 'Jiangsu', JX: 'Jiangxi', LN: 'Liaoning', NM: 'Inner Mongolia', NX: 'Ningxia', QH: 'Qinghai',
  SC: 'Sichuan', SD: 'Shandong', SH: 'Shanghai', SN: 'Shaanxi', SX: 'Shanxi', TJ: 'Tianjin', TW: 'Taiwan',
  XJ: 'Xinjiang', XZ: 'Tibet', YN: 'Yunnan', ZJ: 'Zhejiang', HK: 'Hong Kong', MO: 'Macao',
};
const sites = {
  huaidian: 'Huaidian, Guangshan', xixian: 'Xi County', yanyuan: 'Yanyuan', lushan: 'Lushan',
  banqiao: 'Banqiao, Fengyang', fengyang: 'Fengyang', wuwei: 'Wuwei', 'wuwei-hongmiao': 'Hongmiao, Wuwei',
  'bozhou-shuanggou': 'Shuanggou, Bozhou', 'bozhou-wuma': 'Wuma, Bozhou', 'bozhou-shihe': 'Shihe Commune',
  'bozhou-guantang': 'Guantang Commune', 'bozhou-shibali': 'Shibali Commune', 'bozhou-gucheng': 'Gucheng Commune',
};
const recordCopy = {
  huaidian: ['Huaidian Commune, Guangshan County', 'Deaths recorded in Huaidian Commune', 'Yang reports that the commune had 36,691 people. About one-third died. The figure applies to the commune.'],
  jiangwan: ['Jiangwan Village, Guangshan County', 'Deaths recorded in Jiangwan', 'The book records 45 residents before the famine. Jiangwan was part of Huaidian Commune, whose figures may include the village.'],
  xixian: ['Xi County', 'Deaths in the county committee’s incomplete count', 'The Central and Henan provincial investigation teams cited the figure in October 1960 and noted that it omitted deaths outside the reporting period.'],
  xinmin: ['Xinmin Commune, Yanyuan County', 'Kitchens that ran out of grain by mid-May 1959', 'By early June, the two remaining kitchens had also run out of grain.'],
  lushan: ['Lushan County, Ya’an', 'People still suffering from severe swelling', 'A September 1962 report cited in the book describes people with severe swelling during the harvest.'],
  'lushan-guangming': ['Guangming Production Team, Qingyuan Commune', 'Orphans still living in the production team at the time of the survey', 'The team had 55 people at the time, including three who had moved in. The change in population cannot be used to calculate deaths.'],
  huaidong: ['Huaidong, Banqiao Township, Fengyang County', 'Households without food out of all households surveyed', 'The investigation counted 240 households. In those without food, 892 people were affected.'],
  zhabei: ['Zhabei Brigade, Hongmiao Commune, Wuwei County', 'Deaths recorded in the brigade', 'The book records 4,944 residents before the famine. The brigade was part of Hongmiao Commune.'],
  wangge: ['Wangge Brigade, Shuanggou Commune, Bo County', 'Deaths recorded across six villages', 'Liang Zhiyuan’s team investigated six severely affected villages, with 127 households and 575 people before the famine. The death count covers these six villages.'],
  yangzhuang: ['Yangzhuang, Wuma Commune, Bo County', 'Deaths recorded in Yangzhuang', 'Liang Zhiyuan records 68 residents before the famine. Four left and did not return. His figures count deaths separately from departures.'],
};
const scopeCopy = {
  HE: 'Cao’s estimate for Hebei includes Beijing and Tianjin.',
  SC: 'Cao’s estimate covers 1958–1962 and includes present-day Chongqing.',
};

function name(original, translation) {
  return english && translation ? translation + ' (' + original + ')' : localText(original);
}

export const regionName = region => name(region.name, provinces[region.id]);
export const siteName = site => name(site.name, sites[site.id]);
export const regionScope = region => localText(region.scope, scopeCopy[region.id]);
export const recordName = record => name(record.place, recordCopy[record.slug]?.[0]);
export const recordMeasure = record => localText(record.measure, recordCopy[record.slug]?.[1] ?? 'Record in Chinese');
export const recordBackground = record => localText(record.context, recordCopy[record.slug]?.[2] ?? 'Read the full record in Chinese or open the cited page of the book.');

export function recordValue(record) {
  if (!english) return localText(record.value);
  if (!recordCopy[record.slug]) return record.value;
  return record.value.replaceAll(' 人', ' people').replaceAll(' 户', ' households')
    .replaceAll(' 个', '').replaceAll('／', ' / ').replaceAll('以上', ' or more');
}
