/**
 * Lithifyte free-access Worker (Cloudflare)
 * -----------------------------------------
 * Identity + privacy-safe product analytics — never bank data, statements,
 * balances, merchants, or category labels.
 *
 * Host: access.lithifyte.com (or workers.dev during setup)
 *
 * Endpoints:
 *   GET  /  /signin          → sign-in page (static assets)
 *   POST /waitlist   { email, source? }  → store email, issue magic link
 *   GET  /auth?token=…         → validate token, set session, update lifecycle
 *   GET  /me                   → { email, plan, signInCount, … } if signed in
 *   POST /events   { event, props?, v?, t? }  → allowlisted product events
 *   POST /digest   { subject, text, html?, privacyMode? }
 *                  → email client-composed digest via Resend (not stored)
 *   GET  /admin/summary        → funnel stats (requires ADMIN_TOKEN header)
 *   POST /logout               → clear cookie
 *   GET  /health               → service info
 *
 * Cookie: Domain=.lithifyte.com so app.lithifyte.com can call /me + /events
 * with credentials once CORS allows the app origin.
 *
 * Mail: Resend (secret RESEND_API_KEY + var MAIL_FROM).
 * Admin: secret ADMIN_TOKEN (optional) — wrangler secret put ADMIN_TOKEN
 *
 * Digest privacy: the Worker never computes finance. The browser composes
 * the message; we only forward it to the signed-in address and discard it.
 */

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const TOKEN_TTL = 60 * 30; // 30 minutes
const EVENT_TTL = 60 * 60 * 24 * 90; // keep raw event rows ~90 days
const DAY_STATS_TTL = 60 * 60 * 24 * 400; // ~13 months of daily rollups

const ALLOWED_ORIGINS = new Set([
  'https://lithifyte.com',
  'https://www.lithifyte.com',
  'https://app.lithifyte.com',
  'https://access.lithifyte.com',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
]);

/**
 * Product-analytics allowlist. Only these event names are stored.
 * Props are further filtered per event — never amounts, merchants, or free text
 * that could identify spending.
 */
const EVENT_ALLOW = {
  // Lifecycle (also written server-side on waitlist / auth)
  signup: ['source'],
  signin: ['method'],
  session_start: ['app_ver', 'locale', 'viewport', 'demo'],
  // Funnel
  gate_shown: ['path'],
  gate_open: ['path'],
  demo_click: ['from'],
  landing_cta: ['cta', 'from'],
  // Activation / habit (booleans & enums only)
  onboarding_step: ['step'],
  section_view: ['section'],
  action: ['action'],
  map_interact: ['type'],
  map_first_render: [],
  locale_set: ['locale'],
  self_test: ['pass'],
  error: ['code'],
};

const ACTION_ALLOW = new Set([
  'csv_upload',
  'backup_export',
  'backup_import',
  'rule_created',
  'alert_ack',
  'goal_set',
  'person_added',
  'account_added',
  'digest_sent',
]);

const DIGEST_MAX_SUBJECT = 120;
const DIGEST_MAX_TEXT = 24_000;
const DIGEST_MAX_HTML = 48_000;

const SECTION_ALLOW = new Set([
  'map',
  'alerts',
  'goals',
  'cashflow',
  'cats',
  'leaks',
  'budget',
  'sim',
  'forecast',
  'plan',
  'pulse',
  'wealth',
  'invest',
  'debts',
  'ready',
  'audit',
  'rules',
  'people',
  'settings',
  'onboarding',
]);

const ONB_STEPS = new Set([
  'household',
  'people',
  'account',
  'statement',
  'goal',
]);

const LOCALES = new Set(['IE', 'GLOBAL']);

function allowedOrigin(req) {
  const o = req.headers.get('Origin');
  if (o && ALLOWED_ORIGINS.has(o)) return o;
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
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

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * KV-backed rate limit. Returns true when the caller is over the limit.
 */
async function overLimit(env, key, limit, windowSecs) {
  const bucket = Math.floor(Date.now() / (windowSecs * 1000));
  const k = `rl:${key}:${bucket}`;
  const n = parseInt((await env.WAITLIST.get(k)) || '0', 10);
  if (n >= limit) return true;
  await env.WAITLIST.put(k, String(n + 1), { expirationTtl: windowSecs + 60 });
  return false;
}

/** Merge-safe user record defaults. */
function baseUser(email, partial = {}) {
  const now = new Date().toISOString();
  return {
    email,
    createdAt: partial.createdAt || now,
    lastRequestAt: partial.lastRequestAt || null,
    lastSignInAt: partial.lastSignInAt || null,
    lastSeenAt: partial.lastSeenAt || null,
    signInCount: partial.signInCount || 0,
    source: partial.source || 'signin',
    plan: partial.plan || 'free',
    locale: partial.locale || null,
    eventCounts: partial.eventCounts || {},
    flags: partial.flags || {
      digest_opt_in: false,
      marketing_opt_in: false,
    },
  };
}

async function loadUser(env, email) {
  const existing = await env.WAITLIST.get(`user:${email}`, 'json');
  return baseUser(email, existing || {});
}

async function saveUser(env, record) {
  await env.WAITLIST.put(`user:${record.email}`, JSON.stringify(record));
}

async function bumpDayStat(env, event, anon) {
  const dk = dayKey();
  const key = `stats:day:${dk}`;
  const row = (await env.WAITLIST.get(key, 'json')) || {
    day: dk,
    events: {},
    signups: 0,
    signins: 0,
    sessions: 0,
  };
  row.events[event] = (row.events[event] || 0) + 1;
  if (event === 'signup') row.signups = (row.signups || 0) + 1;
  if (event === 'signin') row.signins = (row.signins || 0) + 1;
  if (event === 'session_start') row.sessions = (row.sessions || 0) + 1;
  if (anon) row.anon = (row.anon || 0) + 1;
  await env.WAITLIST.put(key, JSON.stringify(row), { expirationTtl: DAY_STATS_TTL });
}

/**
 * Sanitize client props to the allowlisted keys for this event.
 * Drops anything that looks like free text beyond short enums.
 */
function sanitizeProps(event, props) {
  const allow = EVENT_ALLOW[event];
  if (!allow) return null;
  const out = {};
  const src = props && typeof props === 'object' ? props : {};
  for (const k of allow) {
    if (!(k in src)) continue;
    let v = src[k];
    if (v === true || v === false) {
      out[k] = v;
      continue;
    }
    if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e6) {
      out[k] = Math.round(v);
      continue;
    }
    if (typeof v !== 'string') continue;
    v = v.trim().slice(0, 48);
    if (!v || /[@€$£]|https?:|\d{5,}/.test(v)) continue;

    if (k === 'action' && !ACTION_ALLOW.has(v)) continue;
    if (k === 'section' && !SECTION_ALLOW.has(v)) continue;
    if (k === 'step' && !ONB_STEPS.has(v)) continue;
    if (k === 'locale' && !LOCALES.has(v)) continue;
    if (k === 'type' && !['drag', 'filter', 'isolate', 'search', 'click'].includes(v))
      continue;
    if (k === 'viewport' && !['sm', 'md', 'lg'].includes(v)) continue;
    if (k === 'demo' && v !== '0' && v !== '1') continue;
    if (k === 'pass' && v !== '0' && v !== '1' && v !== 'true' && v !== 'false') continue;
    if (k === 'method' && !['magic_link'].includes(v)) continue;
    if (
      (k === 'source' || k === 'from' || k === 'cta' || k === 'path' || k === 'code' || k === 'app_ver') &&
      !/^[a-zA-Z0-9._\-\/]{1,48}$/.test(v)
    )
      continue;

    if (k === 'pass') out[k] = v === '1' || v === 'true';
    else if (k === 'demo') out[k] = v === '1';
    else out[k] = v;
  }
  return out;
}

async function getSession(env, req) {
  if (needKV(env)) return null;
  const cookie = req.headers.get('Cookie') || '';
  const m = /(?:^|;\s*)lf_session=([a-f0-9]+)/i.exec(cookie);
  if (!m) return null;
  const sessionHash = await sha256(m[1]);
  const row = await env.WAITLIST.get(`session:${sessionHash}`, 'json');
  if (!row || row.exp < Date.now()) return null;
  return row;
}

async function recordEvent(env, { event, props, email, appVer }) {
  const clean = sanitizeProps(event, props);
  if (clean === null) return { ok: false, error: 'event_not_allowed' };

  const now = new Date().toISOString();
  const id = randomToken(12);
  const row = {
    id,
    event,
    props: clean,
    email: email || null,
    appVer: typeof appVer === 'string' ? appVer.slice(0, 24) : null,
    at: now,
  };

  // Per-event row (short TTL) for recent debugging
  await env.WAITLIST.put(`evt:${dayKey()}:${id}`, JSON.stringify(row), {
    expirationTtl: EVENT_TTL,
  });

  await bumpDayStat(env, event, !email);

  if (email) {
    const user = await loadUser(env, email);
    user.lastSeenAt = now;
    user.eventCounts = user.eventCounts || {};
    user.eventCounts[event] = (user.eventCounts[event] || 0) + 1;
    if (event === 'locale_set' && clean.locale) user.locale = clean.locale;
    if (event === 'session_start' && clean.locale) user.locale = clean.locale;
    // Activation flags (counts only — no finance payload)
    if (event === 'action' && clean.action === 'csv_upload') {
      user.flags = user.flags || {};
      user.flags.has_uploaded = true;
    }
    if (event === 'action' && clean.action === 'backup_export') {
      user.flags = user.flags || {};
      user.flags.has_backup = true;
    }
    if (event === 'onboarding_step' && clean.step === 'goal') {
      user.flags = user.flags || {};
      user.flags.onboarding_complete = true;
    }
    await saveUser(env, user);
  }

  return { ok: true };
}

/** Send a client-composed digest. Body is NOT stored. Returns {ok} or {ok:false,error}. */
async function sendDigestEmail(env, email, { subject, text, html }) {
  if (!env.RESEND_API_KEY) return { ok: false, error: 'mailer_not_configured' };
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
      subject,
      text,
      html:
        html ||
        `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.5">${text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>`,
    }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch (_) {}
    return { ok: false, error: 'send_failed', detail };
  }
  return { ok: true };
}

/** Branded HTML shell for auth intermediate / error pages. */
function brandedPage({ title, heading, bodyHtml, ctaHref, ctaLabel }) {
  const cta = ctaHref
    ? `<p style="margin:28px 0 0"><a href="${ctaHref}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#1d4ed8);color:#fff;text-decoration:none;font-weight:600;font-size:14px;border:1px solid rgba(125,211,252,.55)">${ctaLabel || 'Continue'}</a></p>`
    : '';
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — Lithifyte</title>
<style>
  :root{--void:#020b1a;--ink:#e8f1ff;--muted:#8fb0d0;--line:rgba(56,189,248,.28);--cyan:#38bdf8}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
    font-family:system-ui,sans-serif;color:var(--ink);background:var(--void);
    background-image:radial-gradient(ellipse 70% 50% at 50% 30%,#0a1f3d 0%,transparent 65%)}
  .card{width:min(420px,100%);background:rgba(4,18,36,.88);border:1px solid var(--line);border-radius:16px;padding:30px 26px;box-shadow:0 0 60px rgba(56,189,248,.12)}
  .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:13px;letter-spacing:.06em;margin-bottom:20px}
  .mark{width:26px;height:26px;border-radius:7px;border:1px solid var(--cyan);background:linear-gradient(135deg,#0ea5e9,#1d4ed8);position:relative}
  .mark::after{content:"";position:absolute;inset:6px;border-radius:50%;border:1.5px solid rgba(255,255,255,.85)}
  h1{margin:0 0 10px;font-size:22px;line-height:1.2;letter-spacing:-.01em}
  p{margin:0;color:var(--muted);font-size:14px;line-height:1.55}
  .fine{margin-top:18px;font-size:12px;color:#5a7694}
  a.fine{color:#7dd3fc}
</style>
</head><body>
<main class="card">
  <div class="brand"><span class="mark" aria-hidden="true"></span> LITHIFYTE</div>
  <h1>${heading}</h1>
  ${bodyHtml}
  ${cta}
  <p class="fine"><a class="fine" href="https://lithifyte.com">Home</a> · <a class="fine" href="https://access.lithifyte.com/">Request a new link</a> · <a class="fine" href="https://lithifyte.com/privacy">Privacy</a></p>
</main>
</body></html>`;
}

/** Send the magic link via Resend. Returns true on success. */
async function sendMagicLinkEmail(env, email, link) {
  if (!env.RESEND_API_KEY) return false;
  const from = env.MAIL_FROM || 'Lithifyte <signin@sid-labs.com>';
  // Deliverability: plain subject, matching domains, List-Unsubscribe, no spammy urgency.
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: from.includes('<') ? from.replace(/^.*<([^>]+)>.*$/, '$1') : from,
      subject: 'Sign in to Lithifyte',
      headers: {
        'List-Unsubscribe': '<https://lithifyte.com/privacy>',
        'X-Entity-Ref-ID': 'lithifyte-signin-' + Date.now().toString(36),
      },
      text:
        `Hi,\n\n` +
        `Open this link to sign in to Lithifyte (household money map):\n\n` +
        `${link}\n\n` +
        `This link works for about 30 minutes. If your mail app opens it in a preview, ` +
        `use the button on the page that appears, or request a fresh link.\n\n` +
        `If you did not ask to sign in, you can ignore this message.\n\n` +
        `— Lithifyte (SID Labs)\n` +
        `https://lithifyte.com\n`,
      html:
        `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:32em;margin:0 auto;padding:16px 8px;color:#0b1626;line-height:1.5">` +
        `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0ea5e9">Lithifyte</p>` +
        `<h1 style="margin:0 0 14px;font-size:20px;color:#0b1626">Sign in to your account</h1>` +
        `<p style="margin:0 0 18px;font-size:15px;color:#334155">Tap the button below to open the money map. We only use this email for sign-in — your bank data stays in your browser.</p>` +
        `<p style="margin:0 0 22px"><a href="${link}" style="display:inline-block;padding:14px 22px;border-radius:10px;` +
        `background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">Open Lithifyte</a></p>` +
        `<p style="margin:0 0 10px;font-size:13px;color:#64748b">Or paste this link into your browser:</p>` +
        `<p style="margin:0 0 22px;font-size:12px;word-break:break-all;color:#475569"><a href="${link}" style="color:#0369a1">${link}</a></p>` +
        `<p style="margin:0;font-size:12px;color:#94a3b8">Link valid about 30 minutes. Didn’t request this? Ignore the email.</p>` +
        `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8"><a href="https://lithifyte.com/privacy" style="color:#0ea5e9">Privacy</a> · SID Labs</p>` +
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
      const isNew = !existing;
      const record = baseUser(email, existing || {});
      record.lastRequestAt = new Date().toISOString();
      if (isNew) {
        record.createdAt = record.lastRequestAt;
        record.source = String(body.source || 'signin').slice(0, 48);
      }
      await saveUser(env, record);

      if (isNew) {
        await recordEvent(env, {
          event: 'signup',
          props: { source: record.source },
          email,
        });
      }

      const raw = randomToken(24);
      const hash = await sha256(raw);
      await env.WAITLIST.put(
        `token:${hash}`,
        JSON.stringify({ email, exp: Date.now() + TOKEN_TTL * 1000 }),
        { expirationTtl: TOKEN_TTL }
      );

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
    // GET only (HEAD/prefetch from mail scanners should not consume the token —
    // they often probe with HEAD and would burn a one-shot link).
    if (path === '/auth' && req.method === 'GET') {
      if (needKV(env)) {
        return new Response(
          brandedPage({
            title: 'Unavailable',
            heading: 'Sign-in temporarily unavailable',
            bodyHtml: '<p>Our identity service is missing storage. Try again in a few minutes.</p>',
            ctaHref: 'https://access.lithifyte.com/',
            ctaLabel: 'Back to sign-in',
          }),
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      const raw = url.searchParams.get('token') || '';
      if (!raw) {
        return new Response(
          brandedPage({
            title: 'Missing link',
            heading: 'That sign-in link is incomplete',
            bodyHtml: '<p>Request a fresh magic link from the sign-in page. Links are unique and expire after about 30 minutes.</p>',
            ctaHref: 'https://access.lithifyte.com/',
            ctaLabel: 'Request a new link',
          }),
          { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      const hash = await sha256(raw);
      const row = await env.WAITLIST.get(`token:${hash}`, 'json');
      if (!row || row.exp < Date.now()) {
        return new Response(
          brandedPage({
            title: 'Link expired',
            heading: 'This sign-in link is no longer valid',
            bodyHtml:
              '<p>Links expire after about 30 minutes, or after several successful uses. Request a new one — it only takes a moment.</p>' +
              '<p style="margin-top:12px">Tip: open the link in <b>Safari or Chrome</b>, not only the email app’s built-in browser, so the session cookie can stick.</p>',
            ctaHref: 'https://access.lithifyte.com/',
            ctaLabel: 'Request a new link',
          }),
          { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      // Allow a few redemptions within the token TTL so Gmail/Outlook link
      // scanners don't burn the only use before the real person clicks.
      const uses = (row.uses || 0) + 1;
      const maxUses = 5;
      if (uses > maxUses) {
        await env.WAITLIST.delete(`token:${hash}`);
        return new Response(
          brandedPage({
            title: 'Link used up',
            heading: 'This link was opened too many times',
            bodyHtml: '<p>Request a fresh sign-in link. (Mail scanners sometimes open links automatically.)</p>',
            ctaHref: 'https://access.lithifyte.com/',
            ctaLabel: 'Request a new link',
          }),
          { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      const ttlSec = Math.max(60, Math.ceil((row.exp - Date.now()) / 1000));
      await env.WAITLIST.put(
        `token:${hash}`,
        JSON.stringify({ ...row, uses }),
        { expirationTtl: ttlSec }
      );

      const session = randomToken(32);
      const sessionHash = await sha256(session);
      await env.WAITLIST.put(
        `session:${sessionHash}`,
        JSON.stringify({ email: row.email, exp: Date.now() + SESSION_TTL * 1000 }),
        { expirationTtl: SESSION_TTL }
      );

      // Lifecycle: sign-in count + lastSignInAt
      const user = await loadUser(env, row.email);
      const now = new Date().toISOString();
      user.lastSignInAt = now;
      user.lastSeenAt = now;
      user.signInCount = (user.signInCount || 0) + 1;
      await saveUser(env, user);
      await recordEvent(env, {
        event: 'signin',
        props: { method: 'magic_link' },
        email: row.email,
      });

      const app = env.APP_ORIGIN || 'https://app.lithifyte.com';
      const dest = app.replace(/\/$/, '') + '/?signedIn=1';
      // Intermediate HTML page (not a bare 302): email in-app browsers often
      // drop cookies on redirect. Serving 200 + Set-Cookie + JS/meta navigate
      // is more reliable, and we control the UX if something still fails.
      const html =
        brandedPage({
          title: 'Signed in',
          heading: 'You’re signed in',
          bodyHtml:
            `<p>Opening the money map for <b style="color:#e8f1ff">${String(row.email).replace(/</g, '')}</b>…</p>` +
            `<p style="margin-top:12px">If nothing happens, tap the button below. Prefer a desktop browser if you see a generic “access denied” page from your network or email app.</p>` +
            `<meta http-equiv="refresh" content="1;url=${dest}">` +
            `<script>setTimeout(function(){ location.replace(${JSON.stringify(dest)}); }, 400);</script>`,
          ctaHref: dest,
          ctaLabel: 'Open Lithifyte',
        });
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': sessionCookie(session, SESSION_TTL, env, url),
        },
      });
    }

    // Explicit HEAD for /auth — do not consume tokens (mail scanners)
    if (path === '/auth' && req.method === 'HEAD') {
      return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    // ── session probe ──
    if (path === '/me' && req.method === 'GET') {
      if (needKV(env)) return json({ email: null, error: 'no_kv' }, 200, req);
      const sess = await getSession(env, req);
      if (!sess) return json({ email: null }, 200, req);
      const user = await loadUser(env, sess.email);
      // Touch lastSeen lightly (not every static asset — only /me probes)
      user.lastSeenAt = new Date().toISOString();
      await saveUser(env, user);
      return json(
        {
          email: user.email,
          plan: user.plan || 'free',
          locale: user.locale || null,
          signInCount: user.signInCount || 0,
          createdAt: user.createdAt || null,
          lastSignInAt: user.lastSignInAt || null,
          lastSeenAt: user.lastSeenAt || null,
          flags: {
            // activation booleans only — never finance
            has_uploaded: !!(user.flags && user.flags.has_uploaded),
            has_backup: !!(user.flags && user.flags.has_backup),
            onboarding_complete: !!(user.flags && user.flags.onboarding_complete),
          },
        },
        200,
        req
      );
    }

    // ── product events (privacy-safe allowlist) ──
    if (path === '/events' && req.method === 'POST') {
      if (needKV(env)) return json({ error: 'WAITLIST KV not bound' }, 503, req);

      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      if (await overLimit(env, `ev:${await sha256(ip)}`, 120, 600)) {
        return json({ error: 'rate_limited' }, 429, req);
      }

      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400, req);
      }

      const event = String(body.event || '').trim();
      if (!EVENT_ALLOW[event]) return json({ error: 'event_not_allowed' }, 400, req);

      const sess = await getSession(env, req);
      // Public funnel events may be anonymous (landing / demo / gate).
      // Everything else requires a signed-in session on the hosted app.
      const publicEvents = new Set([
        'gate_shown',
        'gate_open',
        'demo_click',
        'landing_cta',
        'session_start',
      ]);
      if (!sess && !publicEvents.has(event)) {
        return json({ error: 'auth_required' }, 401, req);
      }

      const result = await recordEvent(env, {
        event,
        props: body.props || {},
        email: sess ? sess.email : null,
        appVer: body.v || body.app_ver || null,
      });
      if (!result.ok) return json(result, 400, req);
      return json({ ok: true }, 200, req);
    }

    // ── client-composed money digest (Option A) ──
    // Browser builds the text; Worker only mails it to the session email.
    // Body is never written to KV.
    if (path === '/digest' && req.method === 'POST') {
      if (needKV(env)) return json({ error: 'WAITLIST KV not bound' }, 503, req);
      const sess = await getSession(env, req);
      if (!sess || !sess.email) return json({ error: 'auth_required' }, 401, req);

      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      // 3 digests / hour per email, 8 / hour per IP
      if (
        (await overLimit(env, `dg:em:${await sha256(sess.email)}`, 3, 3600)) ||
        (await overLimit(env, `dg:ip:${await sha256(ip)}`, 8, 3600))
      ) {
        return json(
          { error: 'rate_limited', message: 'Too many digests — try again in an hour.' },
          429,
          req
        );
      }

      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400, req);
      }

      let subject = String(body.subject || 'Your Lithifyte money digest').trim();
      if (!subject) subject = 'Your Lithifyte money digest';
      subject = subject.slice(0, DIGEST_MAX_SUBJECT);
      // Strip control chars / newlines from subject
      subject = subject.replace(/[\r\n\0]/g, ' ').trim();

      const text = String(body.text || '');
      if (!text.trim()) return json({ error: 'empty_digest' }, 400, req);
      if (text.length > DIGEST_MAX_TEXT) {
        return json({ error: 'digest_too_large', max: DIGEST_MAX_TEXT }, 400, req);
      }

      let html = body.html != null ? String(body.html) : '';
      if (html.length > DIGEST_MAX_HTML) {
        return json({ error: 'digest_too_large', max: DIGEST_MAX_HTML }, 400, req);
      }

      const privacyMode = !!body.privacyMode;

      let sent;
      try {
        sent = await sendDigestEmail(env, sess.email, { subject, text, html: html || null });
      } catch (e) {
        sent = { ok: false, error: 'send_failed' };
      }
      if (!sent.ok) {
        return json(
          {
            error: sent.error || 'send_failed',
            message:
              sent.error === 'mailer_not_configured'
                ? 'Email delivery is not configured on the server.'
                : 'Could not send the digest. Try again in a minute.',
          },
          sent.error === 'mailer_not_configured' ? 503 : 502,
          req
        );
      }

      // Lifecycle flag only — never store subject/body
      await recordEvent(env, {
        event: 'action',
        props: { action: 'digest_sent' },
        email: sess.email,
      });
      const user = await loadUser(env, sess.email);
      user.flags = user.flags || {};
      user.flags.digest_sent = true;
      user.flags.digest_privacy_default = privacyMode;
      user.lastSeenAt = new Date().toISOString();
      await saveUser(env, user);

      return json(
        {
          ok: true,
          message: 'Digest sent to ' + sess.email + '. We did not keep a copy of the message.',
          to: sess.email,
        },
        200,
        req
      );
    }

    // ── admin summary (operator only) ──
    if (path === '/admin/summary' && req.method === 'GET') {
      if (needKV(env)) return json({ error: 'no_kv' }, 503, req);
      const token = req.headers.get('X-Admin-Token') || url.searchParams.get('token') || '';
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ error: 'unauthorized' }, 401, req);
      }

      // List user keys (prefix scan) — fine at small scale
      let cursor;
      const users = [];
      do {
        const page = await env.WAITLIST.list({
          prefix: 'user:',
          cursor,
          limit: 100,
        });
        for (const k of page.keys) {
          const u = await env.WAITLIST.get(k.name, 'json');
          if (!u) continue;
          users.push({
            email: u.email,
            createdAt: u.createdAt,
            lastSignInAt: u.lastSignInAt,
            lastSeenAt: u.lastSeenAt,
            signInCount: u.signInCount || 0,
            plan: u.plan || 'free',
            locale: u.locale || null,
            flags: u.flags || {},
            eventCounts: u.eventCounts || {},
          });
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);

      // Last 14 days of rollups
      const days = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(Date.now() - i * 86400000);
        const dk = d.toISOString().slice(0, 10);
        const row = await env.WAITLIST.get(`stats:day:${dk}`, 'json');
        if (row) days.push(row);
      }

      const activated = users.filter(
        (u) => u.flags && (u.flags.has_uploaded || u.flags.onboarding_complete)
      ).length;

      return json(
        {
          generatedAt: new Date().toISOString(),
          users: users.length,
          activated,
          returning: users.filter((u) => (u.signInCount || 0) > 1).length,
          days,
          recentUsers: users
            .slice()
            .sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')))
            .slice(0, 50),
        },
        200,
        req
      );
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
          stores: 'email + session tokens + privacy-safe product events',
          finance: 'never',
          digest: 'client-composed forward only — body not stored',
          events: Object.keys(EVENT_ALLOW),
          app: env.APP_ORIGIN || null,
          kv: !!env.WAITLIST,
          admin: !!env.ADMIN_TOKEN,
          mailer: !!env.RESEND_API_KEY,
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
