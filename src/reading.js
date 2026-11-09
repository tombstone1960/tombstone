import { bookChapters, chapterLabel } from './data/book-chapters.js';
import { chapterPassages, chapterRecords, readingDestination } from './chapter-index.js';
import { chapterHref } from './routes.js';
import { scrollToFragment } from './page-content.js';

const destination = readingDestination(location.hash.slice(1));
if (destination) location.replace(chapterHref(destination.number) + '#' + destination.fragment);

const index = document.querySelector('#reading-index');
for (const part of ['前言', '上篇', '下篇', '附录']) {
  const group = document.createElement('section');
  group.className = 'volume-group';
  const title = document.createElement('h2');
  title.textContent = part;
  const list = document.createElement('ul');
  for (const chapter of bookChapters.filter(chapter => chapter.part === part)) {
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.href = chapterHref(chapter.id);
    if (chapter.number) row.id = 'chapter-' + chapter.number;
    const label = document.createElement('strong');
    label.textContent = chapterLabel(chapter);
    const description = document.createElement('span');
    description.textContent = chapter.summary;
    const metadata = document.createElement('small');
    const count = chapterRecords(chapter.number).length;
    metadata.textContent = 'PDF 第 ' + chapter.page + ' 页'
      + (count ? ' · ' + count + ' 条地方记录' : '')
      + (chapterPassages(chapter.number).length ? ' · 有阅读笔记' : '');
    link.append(label, description, metadata);
    row.append(link);
    list.append(row);
  }
  group.append(title, list);
  index.append(group);
}

scrollToFragment();
