/** Static app shell for app.lithifyte.com — serves assets; SPA-ish clean paths. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    // pretty paths
    if (path === '/demo') path = '/demo.html';
    if (path === '/tutorial') path = '/tutorial.html';
    if (path === '/capture') path = '/capture.html';
    if (path === '/') path = '/index.html';
    // try asset
    let res = await env.ASSETS.fetch(new Request(new URL(path, url.origin), request));
    if (res.status === 404 && !path.endsWith('.html')) {
      res = await env.ASSETS.fetch(new Request(new URL(path + '.html', url.origin), request));
    }
    // lithifyte.com reads this so the marketing badge cannot drift from the
    // running app. Short cache: a release should show up within a minute.
    if (path === '/version.json' && res.ok) {
      const headers = new Headers(res.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET');
      headers.set('Cache-Control', 'public, max-age=60');
      headers.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(res.body, { status: res.status, headers });
    }
    return res;
  },
};
