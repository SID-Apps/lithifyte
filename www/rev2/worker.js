/**
 * lithifyte.com — static assets, plus markdown for agents.
 *
 * The site is still a static asset deployment. This worker sits in front of it
 * for two reasons: markdown negotiation, and keeping the homepage version
 * badge identical to the live app (it rewrites from app.lithifyte.com/version.json).
 * An agent fetching /learn/emergency-fund gets 13KB of styled HTML it
 * has to strip; the same page as markdown is the prose and nothing else.
 *
 * Two ways to ask, both answering from the same generated .md twins:
 *   GET /learn/emergency-fund      Accept: text/markdown
 *   GET /learn/emergency-fund.md
 *
 * Everything else is passed straight through to the asset handler untouched,
 * and any failure here falls back to it. A bug in this file must not be able
 * to take the site down.
 */

const MD = 'text/markdown; charset=utf-8';
const APP_VERSION_URL = 'https://app.lithifyte.com/version.json';
const VER_RE = /^\d+\.\d+\.\d+$/;

function applyLiveVersion(html, ver) {
  return html
    .replace(/data-lf-ver="[^"]*"/, 'data-lf-ver="' + ver + '"')
    .replace(/(id="lfVer">)[^<]*/, '$1' + ver)
    .replace(/"softwareVersion"\s*:\s*"[^"]*"/, '"softwareVersion": "' + ver + '"');
}

async function liveAppVersion() {
  try {
    const r = await fetch(APP_VERSION_URL, {
      headers: { accept: 'application/json' },
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j && VER_RE.test(j.version) ? j.version : null;
  } catch {
    return null;
  }
}

// Does this client actually prefer markdown, rather than merely accepting
// anything at all? A browser sends text/html first; an agent asking for
// markdown means it.
function wantsMarkdown(request) {
  const accept = request.headers.get('accept') || '';
  if (!accept) return false;
  return /\btext\/markdown\b/i.test(accept) || /\btext\/plain\b/i.test(accept.split(',')[0]);
}

/** Map a request path to the generated markdown twin, or null. */
function twinPath(pathname) {
  if (pathname === '/' || pathname === '/index.html') return '/index.md';
  if (pathname.endsWith('.md')) return pathname;
  if (/\.(html?|css|js|png|svg|ico|xml|txt|webmanifest|json)$/i.test(pathname)) return null;
  return pathname.replace(/\/$/, '') + '.md';
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const explicit = url.pathname.endsWith('.md');

      if (explicit || wantsMarkdown(request)) {
        const path = twinPath(url.pathname);
        if (path) {
          const res = await env.ASSETS.fetch(new URL(path, url.origin));
          if (res.ok) {
            const headers = new Headers(res.headers);
            headers.set('content-type', MD);
            headers.set('x-content-type-options', 'nosniff');
            headers.set('link', `<${url.origin}${url.pathname}>; rel="canonical"`);
            headers.set('vary', 'Accept');
            return new Response(res.body, { status: 200, headers });
          }
          // Asked for .md explicitly and there is no twin: say so plainly
          // rather than serving HTML under a .md URL.
          if (explicit) {
            return new Response(
              `# Not found\n\nNo markdown version of ${url.pathname}.\nSee ${url.origin}/llms.txt for what exists.\n`,
              { status: 404, headers: { 'content-type': MD } }
            );
          }
        }
      }

      const res = await env.ASSETS.fetch(request);

      // Tell an HTML reader that a markdown twin exists. Discovery beats
      // guessing: a client that would rather have prose can follow the link
      // instead of scraping the page.
      const type = res.headers.get('content-type') || '';
      const twin = type.includes('text/html') ? twinPath(url.pathname) : null;
      const home = url.pathname === '/' || url.pathname === '/index.html';
      if (twin || home) {
        const headers = new Headers(res.headers);
        if (twin) {
          const existing = headers.get('link');
          const alt = `<${url.origin}${twin}>; rel="alternate"; type="text/markdown"`;
          // _headers already names the twin on some paths; do not say it twice.
          if (!existing || !existing.includes(`${twin}>`)) {
            headers.set('link', existing ? `${existing}, ${alt}` : alt);
          }
          headers.set('vary', 'Accept');
        }
        // Homepage version badge: rewrite from the live app so lithifyte.com
        // cannot advertise a different number than app.lithifyte.com.
        if (home && type.includes('text/html') && res.ok) {
          const ver = await liveAppVersion();
          if (ver) {
            const html = applyLiveVersion(await res.text(), ver);
            headers.set('Cache-Control', 'public, max-age=60');
            return new Response(html, { status: res.status, statusText: res.statusText, headers });
          }
        }
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
      }
      return res;
    } catch {
      return env.ASSETS.fetch(request);
    }
  },
};
