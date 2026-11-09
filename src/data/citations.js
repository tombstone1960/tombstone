export const referencePdf = 'https://omeka.minjian-danganguan.org/files/original/f14ae024ed5a2ae91941450ee01b65a59ed2cbfa.pdf';

export function bookCitation(chapter, pages) {
  return '杨继绳《墓碑》 · ' + chapter + ' · 参考 PDF ' + pages;
}

export function sourcePage(pages) {
  const [citation, note] = pages.split('（', 2);
  // Keep the main citation when it names one page. For a range, prefer the
  // page identified by the note, then fall back to the start of the range.
  return citation.match(/^第\s*(\d+)\s*页/u)?.[1]
    ?? note?.match(/第\s*(\d+)\s*页/u)?.[1]
    ?? citation.match(/^第\s*(\d+)/u)?.[1];
}

export function referencePageHref(page) {
  return referencePdf + '#page=' + page;
}
