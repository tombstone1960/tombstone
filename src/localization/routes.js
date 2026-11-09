export const locales = {
  'zh-Hans': { label: '简体中文', prefix: '', og: 'zh_CN' },
  'zh-Hant': { label: '繁體中文', prefix: '/zh-hant', og: 'zh_TW' },
  en: { label: 'English', prefix: '/en', og: 'en_US' },
};
export const englishGuides = { henan: '01', sichuan: '03', anhui: '04' };
export const englishPages = new Set([
  '/', '/map/', '/sources/', '/read/',
  ...Object.values(englishGuides).map(id => '/read/' + id + '/'),
]);

export function localePath(path, locale) {
  const base = path.split(/[?#]/u, 1)[0];
  const prefix = locale === 'en' && !englishPages.has(base) ? '' : locales[locale]?.prefix ?? '';
  return prefix + path;
}
