/**
 * Lithifyte free-access Worker (Cloudflare)
 * -----------------------------------------
 * Identity only — never bank data, statements, or balances.
 *
 * Bindings (wrangler.toml):
 *   WAITLIST   — KV namespace  (emails + magic tokens)
 *   APP_ORIGIN — e.g. https://app.lithifyte.com
 *   LANDING    — e.g. https://lithifyte.com
 *   FROM_EMAIL — optional, if using Email Routing / Resend later
 *
 * Endpoints:
 *   POST /waitlist   { email }  → store email, issue magic link token
 *   GET  /auth?token=…         → validate token, set HttpOnly session cookie, redirect to app
 *   GET  /me                   → { email } if session cookie valid
 *   POST /logout               → clear cookie
 *
 * Production tip: pair with Cloudflare Access (Zero Trust) or Resend/Mailchannels
 * for actual email delivery of the magic link. This stub returns the link in JSON
 * when env.DEV_RETURN_LINK === "1" so you can test without a mailer.
 */

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const TOKEN_TTL = 60 * 30;             // 30 minutes

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extra,
    },
  });
}

function cors(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  return null;
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

export default {
  async fetch(req, env) {
    const pre = cors(req);
    if (pre) return pre;

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    // ── waitlist / request magic link ──
    if (path === '/waitlist' && req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const email = String(body.email || '')
        .trim()
        .toLowerCase();
      if (!validEmail(email)) return json({ error: 'Invalid email' }, 400);

      // store subscriber (identity only)
      const existing = await env.WAITLIST.get(`user:${email}`, 'json');
      const record = {
        email,
        createdAt: existing?.createdAt || new Date().toISOString(),
        lastRequestAt: new Date().toISOString(),
        source: body.source || 'landing',
        // NEVER store financial fields here
      };
      await env.WAITLIST.put(`user:${email}`, JSON.stringify(record));

      // magic token
      const raw = randomToken(24);
      const hash = await sha256(raw);
      await env.WAITLIST.put(
        `token:${hash}`,
        JSON.stringify({ email, exp: Date.now() + TOKEN_TTL * 1000 }),
        { expirationTtl: TOKEN_TTL }
      );

      const link = `${url.origin}/auth?token=${raw}`;

      // TODO: send email via Resend / Mailchannels / CF Email Workers
      // await sendMagicLinkEmail(env, email, link);

      const payload = {
        ok: true,
        message: 'If that address can receive mail, a sign-in link is on its way.',
      };
      if (env.DEV_RETURN_LINK === '1') payload.devLink = link;
      return json(payload);
    }

    // ── redeem magic link ──
    if (path === '/auth' && req.method === 'GET') {
      const raw = url.searchParams.get('token') || '';
      if (!raw) return json({ error: 'Missing token' }, 400);
      const hash = await sha256(raw);
      const row = await env.WAITLIST.get(`token:${hash}`, 'json');
      if (!row || row.exp < Date.now()) return json({ error: 'Link expired' }, 401);

      await env.WAITLIST.delete(`token:${hash}`);

      const session = randomToken(32);
      const sessionHash = await sha256(session);
      await env.WAITLIST.put(
        `session:${sessionHash}`,
        JSON.stringify({ email: row.email, exp: Date.now() + SESSION_TTL * 1000 }),
        { expirationTtl: SESSION_TTL }
      );

      const app = env.APP_ORIGIN || 'https://lithifyte.sid-labs.com';
      const res = Response.redirect(app + (app.includes('?') ? '&' : '?') + 'signedIn=1', 302);
      // Session cookie on this Worker origin — for cross-subdomain use Domain=.lithifyte.com
      const secure = url.protocol === 'https:' ? '; Secure' : '';
      res.headers.append(
        'Set-Cookie',
        `lf_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}${secure}`
      );
      return res;
    }

    // ── session probe ──
    if (path === '/me' && req.method === 'GET') {
      const cookie = req.headers.get('Cookie') || '';
      const m = /(?:^|;\s*)lf_session=([a-f0-9]+)/i.exec(cookie);
      if (!m) return json({ email: null });
      const sessionHash = await sha256(m[1]);
      const row = await env.WAITLIST.get(`session:${sessionHash}`, 'json');
      if (!row || row.exp < Date.now()) return json({ email: null });
      return json({ email: row.email });
    }

    if (path === '/logout' && req.method === 'POST') {
      const res = json({ ok: true });
      res.headers.append('Set-Cookie', 'lf_session=; Path=/; HttpOnly; Max-Age=0');
      return res;
    }

    if (path === '/' || path === '/health') {
      return json({
        service: 'lithifyte-access',
        stores: 'email + session tokens only',
        finance: 'never',
      });
    }

    return json({ error: 'Not found' }, 404);
  },
};
