import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { referencePdf } from './src/data/citations.js';
import { bookChapters } from './src/data/book-chapters.js';

const pdfArchive = new URL(referencePdf);
const chapterFiles = bookChapters.map(({ id }) => resolve(import.meta.dirname, 'read', id, 'index.html'));
const appearanceControl = readFileSync(new URL('./src/appearance-control.html', import.meta.url), 'utf8');

const routes = [
  ['/', '首页'],
  ['/map/', '地图'],
  ['/read/', '按章阅读'],
  ['/records/', '地方档案'],
  ['/sources/', '资料与口径'],
].map(([path, label]) => ({ path, label, file: resolve(import.meta.dirname, '.' + path + 'index.html') }));

function siteShell() {
  return {
    name: 'tombstone-site-shell',
    transformIndexHtml(html, { filename }) {
      const active = chapterFiles.includes(filename) ? routes[2] : routes.find(route => route.file === filename);
      const navigation = routes.slice(1).map(({ path, label }) =>
        '<a href="' + path + '"' + (path === active?.path ? ' aria-current="page"' : '') + '>' + label + '</a>',
      ).join('\n        ');
      const header = `<header class="masthead">
      <a class="brand" href="/" aria-label="墓碑阅读导览，返回首页"${active?.path === '/' ? ' aria-current="page"' : ''}>
        <img class="brand-mark" src="/stele-rubbing-icon.png" alt="" width="50" height="64">
        <span class="brand-word">墓碑 <small>杨继绳原著 · 阅读导览</small></span>
      </a>
      <div class="masthead-actions">
        <nav class="site-nav" aria-label="站内导航">
          ${navigation}
        </nav>
        ${appearanceControl}
      </div>
    </header>`;
      const footer = `<footer class="site-footer">
      <span>《墓碑》独立阅读导览 · 原著 杨继绳</span>
      <a href="#top">返回页首 ↑</a>
    </footer>`;
      if (html.includes('<!-- chapter-content -->')) {
        html = html.replace('<!-- chapter-content -->', readFileSync(new URL('./src/chapter-shell.html', import.meta.url), 'utf8'));
      }
      if (html.includes('<!-- atlas-controls -->')) {
        html = html.replace('<!-- atlas-controls -->', readFileSync(new URL('./src/atlas-controls.html', import.meta.url), 'utf8'));
      }
      return html.replace('<head>', '<head>\n    <script src="/appearance.js"></script>')
        .replace('</head>', '  <link rel="icon" href="/stele-rubbing-icon.png" type="image/png">\n  </head>')
        .replace('<!-- site-header -->', header).replace('<!-- site-footer -->', footer);
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [siteShell()],
  server: {
    proxy: {
      '^/reference/tombstone\\.pdf$': {
        target: pdfArchive.origin,
        changeOrigin: true,
        rewrite: () => pdfArchive.pathname,
        proxyTimeout: 15000,
        configure(proxy) {
          proxy.on('proxyReq', request => {
            request.removeHeader('cookie');
            request.removeHeader('authorization');
            request.removeHeader('referer');
          });
          proxy.on('proxyRes', response => { delete response.headers['set-cookie']; });
        },
      },
    },
  },
  build: {
    rolldownOptions: {
      input: [...routes.map(route => route.file), ...chapterFiles, resolve(import.meta.dirname, 'book/index.html')],
    },
  },
});
