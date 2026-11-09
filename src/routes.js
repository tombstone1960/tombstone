export function mapHref({ region, site, record, mention } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ region, site, record, mention })) {
    if (value) query.set(key, value);
  }
  return '/map/' + (query.size ? '?' + query : '');
}

export const readingHref = fragment => '/read/#' + fragment;
export const recordsHref = fragment => '/records/#' + fragment;
export function bookHref(page, text) {
  const query = new URLSearchParams({ page });
  if (text) query.set('text', text);
  return '/book/?' + query;
}
export const chapterHref = id => '/read/' + String(id).padStart(2, '0') + '/';
