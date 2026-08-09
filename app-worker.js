/** Static app shell for app.lithifyte.com — serves assets; SPA-ish clean paths. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    // pretty paths
    if (path === '/demo') path = '/demo.html';
    if (path === '/tutorial') path = '/tutorial.html';
    if (path === '/') path = '/index.html';
    // try asset
    let res = await env.ASSETS.fetch(new Request(new URL(path, url.origin), request));
    if (res.status === 404 && !path.endsWith('.html')) {
      res = await env.ASSETS.fetch(new Request(new URL(path + '.html', url.origin), request));
    }
    return res;
  },
};
