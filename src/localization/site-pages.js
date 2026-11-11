import { parse, parseFragment, serialize, defaultTreeAdapter as tree } from 'parse5';
import { englishContent } from './english-pages.js';
import { englishPages, localePath, locales } from './routes.js';
import { traditional } from './traditional.js';

export const siteOrigin = 'https://mubei.vercel.app';

const englishCopy = new Map(Object.entries({
  '墓碑': 'Tombstone', '杨继绳原著 · 阅读导览': 'A guide to Yang Jisheng’s book',
  '墓碑阅读导览，返回首页': 'Tombstone reading guide, home', '站内导航': 'Main navigation',
  '地图': 'Map', '按章阅读': 'Read', '资料来源': 'Sources', '回到顶部 ↑': 'Back to top ↑',
  '《墓碑》独立阅读导览 · 原著 杨继绳': 'An independent guide to Yang Jisheng’s Tombstone',
  '外观': 'Theme', '外观设置': 'Theme settings', '网站外观': 'Site theme',
  '切换到深色': 'Switch to dark theme', '外观 · 切换到深色': 'Switch to dark theme',
  '跟随系统': 'System', '浅色': 'Light', '深色': 'Dark',
  '全国地图': 'National map', '中国地图': 'Map of China', '全国视图': 'Reset to national view',
  '查找地点': 'Find a place', '搜索地点': 'Find a place', '地点搜索结果': 'Place search results',
  '没找到这个地点。试试输入省名，或换个地名。': 'No places found. Try a province name or a different spelling.',
  '地图设置': 'Map settings', '底图': 'Basemap', '经典地图': 'Classic', '街道与地名': 'Streets and place names',
  '卫星影像': 'Satellite imagery', '地图显示内容': 'Map layers', '随缩放切换': 'Change with zoom',
  '先看各省死亡估计，放大后看地方记录': 'Zoom in from provincial estimates to local records',
  '各省死亡估计': 'Provincial estimates', '看各省的估计人数和比例': 'Estimated excess deaths by province',
  '地方记录': 'Local records', '看书里的记录和地名': 'See records and places mentioned in the book',
  '圆点大小': 'Circle size',
  '估计非正常死亡人数': 'Estimated excess deaths', '非正常死亡占人口比例': 'Excess deaths as a share of the population',
  '正在加载中国地图…': 'Loading the map…', '关闭地点详情': 'Close place details', '图例': 'Legend',
  '各省死亡估计 ·': 'Provincial estimates ·', '圆的大小表示估计非正常死亡人数': 'Circle size shows estimated excess deaths',
  '颜色表示非正常死亡占人口比例': 'Darker circles show a higher share of excess deaths in the population',
  '地方记录 · 数字表示地点数': 'Local records · The number shows how many places are grouped',
  '书中地名 · 放大后点空心圆查看': 'Places in the book · Zoom in and select a hollow circle',
  '地点怎么标在地图上？': 'How are places mapped?',
}));

export function alternateLocales(path) {
  if (path === '/book/') return [];
  return Object.keys(locales).filter(locale => locale !== 'en' || englishPages.has(path));
}

export function languageSwitch(path, current = 'zh-Hans') {
  const label = current === 'en' ? 'Language' : current === 'zh-Hant' ? '語言' : '语言';
  const available = alternateLocales(path);
  const options = Object.entries(locales).map(([locale, { label }]) => {
    const fallback = !available.includes(locale);
    const href = fallback ? locales[locale].prefix + '/' : localePath(path, locale);
    return `<a href="${href}" lang="${locale}" hreflang="${locale}"${locale === current ? ' aria-current="true"' : ''}${fallback ? ' data-language-fallback' : ''}>${label}${fallback ? ' <small>Home</small>' : ''}</a>`;
  }).join('');
  return `<details class="language-switch">
    <summary aria-label="${label} · ${locales[current].label}" title="${label}">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
    </summary>
    <div class="language-options">${options}</div>
  </details>`;
}

const attr = (node, name) => node.attrs?.find(entry => entry.name === name)?.value;
function setAttr(node, name, value) {
  const existing = node.attrs.find(entry => entry.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
}
function replaceContent(node, fragment) {
  node.childNodes = [];
  for (const child of parseFragment(fragment).childNodes) tree.appendChild(node, child);
}

export function localizePageHtml(html, page, locale) {
  const doc = parse(html);
  const isEnglish = locale === 'en';
  const content = englishContent[page.path];
  const usesApp = !isEnglish || page.path === '/map/' || content.hasMap;
  const localizedPath = localePath(page.path, locale);
  const convert = isEnglish ? text => text.replace(/\S(?:[\s\S]*\S)?/u, copy => englishCopy.get(copy) ?? copy) : traditional;

  function visit(node) {
    if (node.nodeName === '#text') {
      node.value = convert(node.value);
      return;
    }
    if (node.tagName === 'script' && !usesApp && attr(node, 'type') === 'module'
      && !attr(node, 'src')?.includes('/@vite/client')) {
      tree.detachNode(node);
      return;
    }
    if (!usesApp && attr(node, 'rel') === 'modulepreload') {
      tree.detachNode(node);
      return;
    }
    if (['script', 'style'].includes(node.tagName) || (attr(node, 'lang') === 'zh-Hans' && node.tagName !== 'html')) return;
    if (node.tagName === 'html') setAttr(node, 'lang', locale);
    if (attr(node, 'class') === 'language-switch') {
      const fresh = parseFragment(languageSwitch(page.path, locale)).childNodes[0];
      node.childNodes = fresh.childNodes;
      return;
    }
    if (node.tagName === 'main' && isEnglish && content.body) {
      if (content.mainClass) setAttr(node, 'class', content.mainClass);
      replaceContent(node, content.body);
    }
    if (node.tagName === 'a' && !attr(node, 'hreflang')) {
      const href = attr(node, 'href');
      if (href?.startsWith('/') && !href.startsWith('//')) {
        if (isEnglish && href === '/records/') {
          tree.detachNode(node);
          return;
        }
        setAttr(node, 'href', localePath(href, locale));
      }
    }
    for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
      const value = attr(node, name);
      if (value) setAttr(node, name, convert(value));
    }
    if (node.tagName === 'title' && isEnglish) {
      node.childNodes[0].value = content.title;
      return;
    }
    if (node.tagName === 'meta') {
      const key = attr(node, 'name') ?? attr(node, 'property');
      const original = attr(node, 'content');
      const values = {
        'og:locale': locales[locale].og,
        'og:url': siteOrigin + localizedPath,
        'og:title': isEnglish ? content.title : convert(original ?? ''),
        'og:description': isEnglish ? content.description : convert(original ?? ''),
        description: isEnglish ? content.description : convert(original ?? ''),
        'og:site_name': isEnglish ? 'Tombstone · A Reading Guide' : '《墓碑》閱讀導覽',
        'og:image': siteOrigin + (isEnglish ? '/share-card-en.jpg' : '/share-card-zh-hant.jpg'),
        'og:image:alt': isEnglish ? 'Tombstone · Local histories of the Great Chinese Famine, alongside a stele rubbing' : convert(original ?? ''),
      };
      if (Object.hasOwn(values, key)) setAttr(node, 'content', values[key]);
    }
    if (attr(node, 'rel') === 'canonical') setAttr(node, 'href', siteOrigin + localizedPath);
    for (const child of [...(node.childNodes ?? []), ...(node.content?.childNodes ?? [])]) visit(child);
  }

  visit(doc);
  return serialize(doc);
}
