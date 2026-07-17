/**
 * Lithifyte free-access Worker (Cloudflare)
 * -----------------------------------------
 * Identity only — never bank data, statements, or balances.
 *
 * Host: access.lithifyte.com (or workers.dev during setup)
 *
 * Endpoints:
 *   GET  /  /signin          → sign-in page (static assets)
 *   POST /waitlist   { email }  → store email, issue magic link token
 *   GET  /auth?token=…         → validate token, set session cookie, redirect to app
 *   GET  /me                   → { email } if session cookie valid
 *   POST /logout               → clear cookie
 *   GET  /health               → service info
 *
 * Cookie: Domain=.lithifyte.com so app.lithifyte.com can call /me with credentials
 * once CORS allows the app origin.
 *
 * Mail: Resend (secret RESEND_API_KEY + var MAIL_FROM). If no key is
 * configured, set DEV_RETURN_LINK=1 so the sign-in UI shows the magic link
 * (dev only — anyone can sign in as any address while that is on).
 */

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const TOKEN_TTL = 60 * 30; // 30 minutes

const ALLOWED_ORIGINS = new Set([
  'https://lithifyte.com',
  'https://www.lithifyte.com',
  'https://app.lithifyte.com',
  'https://access.lithifyte.com',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
]);

function allowedOrigin(req) {
  const o = req.headers.get('Origin');
  if (o && ALLOWED_ORIGINS.has(o)) return o;
  // same-origin / no Origin (nav)
  return null;
}

function json(data, status = 200, req, extra = {}) {
  const origin = req ? allowedOrigin(req) : null;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...extra,
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function corsPreflight(req) {
  if (req.method !== 'OPTIONS') return null;
  const origin = allowedOrigin(req);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || 'https://app.lithifyte.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  });
}

function validEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200;
}

function randomToken(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sessionCookie(value, maxAge, env, url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  const domain = env.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : '';
  return `lf_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}${domain}`;
}

function needKV(env) {
  return !env.WAITLIST;
}

/**
 * KV-backed rate limit. Not atomic (KV is eventually consistent) but plenty
 * to blunt form spam and email-bombing on a public endpoint.
 * Returns true when the caller is over the limit.
 */
async function overLimit(env, key, limit, windowSecs) {
  const bucket = Math.floor(Date.now() / (windowSecs * 1000));
  const k = `rl:${key}:${bucket}`;
  const n = parseInt((await env.WAITLIST.get(k)) || '0', 10);
  if (n >= limit) return true;
  await env.WAITLIST.put(k, String(n + 1), { expirationTtl: windowSecs + 60 });
  return false;
}

/** Send the magic link via Resend. Returns true on success. */
async function sendMagicLinkEmail(env, email, link) {
  if (!env.RESEND_API_KEY) return false;
  const from = env.MAIL_FROM || 'Lithifyte <signin@sid-labs.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Lithifyte sign-in link',
      text:
        `Sign in to Lithifyte:\n\n${link}\n\n` +
        `The link works once and expires in 30 minutes. ` +
        `If you didn't request it, ignore this email — nothing happens without the link.\n\n` +
        `Lithifyte stores only this email address for identity. ` +
        `Your financial data never leaves your browser.\n`,
      html:
        `<div style="font-family:system-ui,sans-serif;max-width:32em;margin:0 auto;padding:8px 4px;color:#0b1626">` +
        `<p style="font-size:15px">Sign in to <strong>Lithifyte</strong>:</p>` +
        `<p style="margin:22px 0"><a href="${link}" style="display:inline-block;padding:13px 22px;border-radius:10px;` +
        `background:linear-gradient(135deg,#0ea5e9,#1d4ed8);color:#fff;text-decoration:none;font-weight:600">Sign in to Lithifyte</a></p>` +
        `<p style="font-size:13px;color:#4b6076">The link works once and expires in 30 minutes. ` +
        `If you didn't request it, ignore this email — nothing happens without the link.</p>` +
        `<p style="font-size:12px;color:#7a90a6">Lithifyte stores only this email address for identity. ` +
        `Your financial data never leaves your browser. ` +
        `<a href="https://lithifyte.com/privacy" style="color:#0ea5e9">Privacy</a></p>` +
        `</div>`,
    }),
  });
  return res.ok;
}

export default {
  async fetch(req, env) {
    const pre = corsPreflight(req);
    if (pre) return pre;

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    // ── waitlist / request magic link ──
    if (path === '/waitlist' && req.method === 'POST') {
      if (needKV(env)) return json({ error: 'WAITLIST KV not bound' }, 503, req);
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400, req);
      }
      const email = String(body.email || '')
        .trim()
        .toLowerCase();
      if (!validEmail(email)) return json({ error: 'Invalid email' }, 400, req);

      // Spam damping: 8 requests / 10 min per IP, 3 / 5 min per address.
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      if (
        (await overLimit(env, `ip:${await sha256(ip)}`, 8, 600)) ||
        (await overLimit(env, `em:${await sha256(email)}`, 3, 300))
      ) {
        return json(
          { error: 'Too many requests — wait a few minutes and try again.' },
          429,
          req
        );
      }

      const existing = await env.WAITLIST.get(`user:${email}`, 'json');
      const record = {
        email,
        createdAt: existing?.createdAt || new Date().toISOString(),
        lastRequestAt: new Date().toISOString(),
        source: body.source || 'signin',
      };
      await env.WAITLIST.put(`user:${email}`, JSON.stringify(record));

      const raw = randomToken(24);
      const hash = await sha256(raw);
      await env.WAITLIST.put(
        `token:${hash}`,
        JSON.stringify({ email, exp: Date.now() + TOKEN_TTL * 1000 }),
        { expirationTtl: TOKEN_TTL }
      );

      // Always issue link on this worker's public origin
      const accessOrigin = env.ACCESS_ORIGIN || url.origin;
      const link = `${accessOrigin}/auth?token=${raw}`;

      let sent = false;
      try {
        sent = await sendMagicLinkEmail(env, email, link);
      } catch (_) {
        sent = false;
      }

      const devMode = env.DEV_RETURN_LINK === '1' || env.DEV_RETURN_LINK === true;
      if (!sent && !devMode) {
        // Don't pretend the mail went out — the token stays valid 30 min,
        // so a retry can still succeed.
        return json(
          { error: 'Could not send the sign-in email. Wait a minute and try again.' },
          502,
          req
        );
      }

      const payload = {
        ok: true,
        message: sent
          ? 'Check your inbox — your sign-in link is on its way. (Look in spam the first time.)'
          : 'Dev mode: use the link below (email delivery not configured yet).',
      };
      if (!sent && devMode) payload.devLink = link;
      return json(payload, 200, req);
    }

    // ── redeem magic link ──
    if (path === '/auth' && req.method === 'GET') {
      if (needKV(env)) return json({ error: 'WAITLIST KV not bound' }, 503, req);
      const raw = url.searchParams.get('token') || '';
      if (!raw) {
        return new Response('Missing token. Request a new link from the sign-in page.', {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      const hash = await sha256(raw);
      const row = await env.WAITLIST.get(`token:${hash}`, 'json');
      if (!row || row.exp < Date.now()) {
        return new Response('Link expired or already used. Request a new one.', {
          status: 401,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      await env.WAITLIST.delete(`token:${hash}`);

      const session = randomToken(32);
      const sessionHash = await sha256(session);
      await env.WAITLIST.put(
        `session:${sessionHash}`,
        JSON.stringify({ email: row.email, exp: Date.now() + SESSION_TTL * 1000 }),
        { expirationTtl: SESSION_TTL }
      );

      const app = env.APP_ORIGIN || 'https://app.lithifyte.com';
      const dest = app.replace(/\/$/, '') + '/?signedIn=1';
      // Response.redirect() has immutable headers in the Workers runtime —
      // build the redirect by hand so Set-Cookie can be attached.
      return new Response(null, {
        status: 302,
        headers: {
          Location: dest,
          'Set-Cookie': sessionCookie(session, SESSION_TTL, env, url),
        },
      });
    }

    // ── session probe ──
    if (path === '/me' && req.method === 'GET') {
      if (needKV(env)) return json({ email: null, error: 'no_kv' }, 200, req);
      const cookie = req.headers.get('Cookie') || '';
      const m = /(?:^|;\s*)lf_session=([a-f0-9]+)/i.exec(cookie);
      if (!m) return json({ email: null }, 200, req);
      const sessionHash = await sha256(m[1]);
      const row = await env.WAITLIST.get(`session:${sessionHash}`, 'json');
      if (!row || row.exp < Date.now()) return json({ email: null }, 200, req);
      return json({ email: row.email }, 200, req);
    }

    if (path === '/logout' && (req.method === 'POST' || req.method === 'GET')) {
      const res = json({ ok: true }, 200, req);
      res.headers.append('Set-Cookie', sessionCookie('', 0, env, url));
      return res;
    }

    if (path === '/health') {
      return json(
        {
          service: 'lithifyte-access',
          stores: 'email + session tokens only',
          finance: 'never',
          app: env.APP_ORIGIN || null,
          kv: !!env.WAITLIST,
        },
        200,
        req
      );
    }

    // Static sign-in UI (assets binding) — /, /signin, /index.html
    if (
      env.ASSETS &&
      (path === '/' ||
        path === '/signin' ||
        path === '/index.html' ||
        path.endsWith('.css') ||
        path.endsWith('.js') ||
        path.endsWith('.ico') ||
        path.endsWith('.svg') ||
        path.endsWith('.png') ||
        path.endsWith('.webmanifest'))
    ) {
      if (path === '/signin') {
        return env.ASSETS.fetch(new URL('/index.html', url).toString());
      }
      return env.ASSETS.fetch(req);
    }

    // Fallback minimal HTML if assets not bound
    if (path === '/' || path === '/signin') {
      return new Response(
        `<!doctype html><meta charset=utf-8><title>Sign in — Lithifyte</title>
         <p>Assets not bound. Deploy with <code>[assets] directory = "./public"</code>.</p>
         <p><a href="https://app.lithifyte.com">App</a> · <a href="https://lithifyte.com">Home</a></p>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return json({ error: 'Not found' }, 404, req);
  },
};
