const maxRangeBytes = 16 * 1024 * 1024;
const productionOrigin = 'https://mubei.vercel.app';
const previewOrigin = /^https:\/\/mubei-[a-z0-9-]+-tombstone2\.vercel\.app$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (origin !== productionOrigin && !previewOrigin.test(origin)) {
      return new Response(null, { status: 403 });
    }

    const headers = new Headers({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, ETag',
      Vary: 'Origin',
    });
    if (new URL(request.url).pathname !== '/' + env.ARCHIVE_KEY) {
      return new Response(null, { status: 404, headers });
    }
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'GET');
      headers.set('Access-Control-Allow-Headers', 'Range');
      headers.set('Access-Control-Max-Age', '86400');
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'GET') {
      headers.set('Allow', 'GET, OPTIONS');
      return new Response(null, { status: 405, headers });
    }

    const range = /^bytes=(\d+)-(\d+)$/.exec(request.headers.get('Range') ?? '');
    const start = Number(range?.[1]);
    const end = Number(range?.[2]);
    const length = end - start + 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || length < 1 || length > maxRangeBytes) {
      return new Response(null, { status: 400, headers });
    }

    if (start >= env.ARCHIVE_SIZE) {
      headers.set('Content-Range', 'bytes */' + env.ARCHIVE_SIZE);
      return new Response(null, { status: 416, headers });
    }

    const last = Math.min(end, env.ARCHIVE_SIZE - 1);
    // Keep each public request to one R2 operation so the Workers Free quota bounds reads.
    const object = await env.ATLAS.get(env.ARCHIVE_KEY, { range: { offset: start, length: last - start + 1 } });
    if (!object) return new Response(null, { status: 404, headers });
    if (object.size !== env.ARCHIVE_SIZE) {
      await object.body.cancel();
      return new Response(null, { status: 502, headers });
    }
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400, immutable');
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Range', 'bytes ' + start + '-' + last + '/' + object.size);
    headers.set('Content-Length', String(last - start + 1));
    headers.set('ETag', object.httpEtag);
    return new Response(object.body, { status: 206, headers });
  },
};
