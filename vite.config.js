import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig, loadEnv } from 'vite';
import { referencePdf, referencePdfPath } from './src/data/citations.js';
import { bookChapters } from './src/data/book-chapters.js';
import { alternateLocales, languageSwitch, localizePageHtml, siteOrigin } from './src/localization/site-pages.js';
import { englishPages, localePath } from './src/localization/routes.js';

const pdfArchive = new URL(referencePdf);
const appearanceControl = readFileSync(new URL('./src/appearance-control.html', import.meta.url), 'utf8');
const siteName = '《墓碑》阅读导览';

const routes = [
  ['/', '首页'],
  ['/map/', '地图'],
  ['/read/', '按章阅读'],
  ['/records/', '地方记录'],
  ['/sources/', '资料来源'],
].map(([path, label]) => ({ path, label, file: resolve(import.meta.dirname, '.' + path + 'index.html') }));

const chapterRoutes = bookChapters.map(({ id, summary }) => ({
  path: '/read/' + id + '/',
  file: resolve(import.meta.dirname, 'read', id, 'index.html'),
  summary,
}));
const publicPages = [...routes, ...chapterRoutes];
const bookPage = { path: '/book/', file: resolve(import.meta.dirname, 'book/index.html') };
const localizedPages = [...publicPages, bookPage].flatMap(page => [
  { page, locale: 'zh-Hant', path: localePath(page.path, 'zh-Hant') },
  ...(englishPages.has(page.path) ? [{ page, locale: 'en', path: localePath(page.path, 'en') }] : []),
]);

function pageMetadata(html, page) {
  if (!page) return [];

  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  const description = page.summary ?? html.match(/<meta name="description" content="([^"]+)"/)[1];
  const url = siteOrigin + page.path;
  const properties = {
    'og:type': 'website',
    'og:site_name': siteName,
    'og:locale': 'zh_CN',
    'og:title': title,
    'og:description': description,
    'og:url': url,
    'og:image': siteOrigin + '/share-card.jpg',
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': '《墓碑》碑拓，旁边写着“中国大饥荒的地方记忆”',
  };

  const tags = [
    { tag: 'link', attrs: { rel: 'canonical', href: url } },
    ...alternateLocales(page.path).map(locale => ({
      tag: 'link', attrs: { rel: 'alternate', hreflang: locale, href: siteOrigin + localePath(page.path, locale) },
    })),
    ...Object.entries(properties).map(([property, content]) => ({ tag: 'meta', attrs: { property, content } })),
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
  ];
  if (page.summary) tags.push({ tag: 'meta', attrs: { name: 'description', content: description } });
  return tags;
}

function siteShell() {
  return {
    name: 'tombstone-site-shell',
    transformIndexHtml(html, { filename }) {
      const page = publicPages.find(route => route.file === filename);
      const active = page?.summary ? routes[2] : page;
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
        ${page ? languageSwitch(page.path) : ''}
      </div>
    </header>`;
      const footer = `<footer class="site-footer">
      <span>《墓碑》独立阅读导览 · 原著 杨继绳</span>
      <a href="#top">回到顶部 ↑</a>
    </footer>`;
      if (html.includes('<!-- chapter-content -->')) {
        html = html.replace('<!-- chapter-content -->', readFileSync(new URL('./src/chapter-shell.html', import.meta.url), 'utf8'));
      }
      if (html.includes('<!-- atlas-controls -->')) {
        html = html.replace('<!-- atlas-controls -->', readFileSync(new URL('./src/atlas-controls.html', import.meta.url), 'utf8'));
      }
      return {
        html: html.replace('<head>', '<head>\n    <script src="/appearance.js"></script>\n    <script src="/language-switch.js" defer></script>')
          .replace('</head>', '  <link rel="icon" href="/stele-rubbing-icon.png" type="image/png">\n  </head>')
          .replace('<!-- site-header -->', header).replace('<!-- site-footer -->', footer),
        tags: pageMetadata(html, page),
      };
    },
    generateBundle() {
      const paths = [
        ...publicPages.map(page => page.path),
        ...localizedPages.filter(({ page }) => page !== bookPage).map(({ path }) => path),
      ];
      const urls = paths.map(path => `  <url><loc>${siteOrigin}${path}</loc></url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`,
      });
      const converter = import.meta.resolve('opencc-js/cn2t');
      const notices = ['LICENSE', 'THIRD_PARTY_LICENSES.md'].map(file =>
        readFileSync(new URL('../../' + file, converter), 'utf8'));
      this.emitFile({ type: 'asset', fileName: 'opencc-notices.txt', source: notices.join('\n\n') });
    },
  };
}

function localizedSite() {
  return {
    name: 'tombstone-localized-pages',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, siteOrigin);
        const variant = localizedPages.find(({ path }) => path === url.pathname || path === url.pathname + '/');
        if (!variant || !['GET', 'HEAD'].includes(request.method)) return next();
        if (variant.path !== url.pathname) {
          response.writeHead(308, { Location: variant.path + url.search }).end();
          return;
        }
        try {
          const { page, locale } = variant;
          const html = await server.transformIndexHtml(page.path + 'index.html', readFileSync(page.file, 'utf8'), request.url);
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(request.method === 'HEAD' ? undefined : localizePageHtml(html, page, locale));
        } catch (error) {
          next(error);
        }
      });
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        // Reuse Vite's final asset URLs so every edition loads the same application.
        for (const { page, locale, path } of localizedPages) {
          const source = bundle[page.path.slice(1) + 'index.html'].source;
          this.emitFile({
            type: 'asset', fileName: path.slice(1) + 'index.html',
            source: localizePageHtml(source, page, locale),
          });
        }
      },
    },
  };
}

function referencePdfAsset() {
  // The cited page numbers belong to this exact edition.
  const expectedHash = 'd3481b814f470ad333abbe994eb8fde11c25ace57fbd049eff9ab747a10ebe23';
  let hostReference;
  return {
    name: 'tombstone-reference-pdf',
    config(_config, { mode }) {
      hostReference = loadEnv(mode, import.meta.dirname).VITE_HOST_REFERENCE_PDF === '1';
      if (hostReference) return { preview: { proxy: {} } };
    },
    async generateBundle() {
      if (!hostReference) return;
      const response = await fetch(referencePdf, {
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error('Reference PDF download failed (HTTP ' + response.status + ')');
      const source = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(source).digest('hex') !== expectedHash) {
        throw new Error('Reference PDF differs from the cited edition');
      }
      this.emitFile({ type: 'asset', fileName: referencePdfPath.slice(1), source });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [siteShell(), localizedSite(), referencePdfAsset()],
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
      input: [...publicPages.map(route => route.file), bookPage.file],
    },
  },
});
