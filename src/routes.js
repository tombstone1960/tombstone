import { localePath } from './localization/routes.js';

export const localizedHref = path => localePath(path, document.documentElement.lang);

export function mapHref({ region, site, record, mention } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ region, site, record, mention })) {
    if (value) query.set(key, value);
  }
  return localizedHref('/map/' + (query.size ? '?' + query : ''));
}

export const readingHref = fragment => localizedHref('/read/#' + fragment);
export const recordsHref = fragment => localizedHref('/records/#' + fragment);
export function bookHref(page, text) {
  const query = new URLSearchParams({ page });
  if (text) query.set('text', text);
  return localizedHref('/book/?' + query);
}
export const chapterHref = id => localizedHref('/read/' + String(id).padStart(2, '0') + '/');
