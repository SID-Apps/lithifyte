# Lithifyte marketing site (`www/`)

Immersive first-person landing for **lithifyte.com** — Tron-grid / galaxy scroll into the money-map product story. The finance app itself remains `../index.html` + `../demo.html` (unchanged).

## Revisions

| Rev | Path | Origin | Notes |
|-----|------|--------|--------|
| **1** | [`index.html`](index.html) | Grok | Single-file landing + waitlist form + Worker stub docs |
| **2** | [`rev2/`](rev2/) | Claude Design Canvas | Sticky scroll chapters, draggable force-directed map, canvas Sankey |

**Production (live):** **https://lithifyte.com** (and `www`) serves **Rev 2** via Cloudflare Worker `lithifyte-landing` (routes `lithifyte.com/*` + `www.lithifyte.com/*`).  
**App / demo:** still **https://lithifyte.sid-labs.com** (Worker `lithifyte`).  
**Pages mirror:** project `lithifyte-com` → https://lithifyte-com.pages.dev

### Redeploy the landing (Rev 2.1+)

The deploy config now lives in the repo (`rev2/wrangler.toml`, with
`.assetsignore` for the non-site files):

```bash
# from a machine with wrangler logged in
cd www/rev2 && wrangler deploy
# optional Pages mirror:
# wrangler pages deploy . --project-name=lithifyte-com --branch=main
```

Rev 2.1 (2026-07-17) added: favicon set (`favicon.*`, `icon-*.png`,
`apple-touch-icon.png`, `site.webmanifest`), `privacy.html` / `terms.html`
(served as `/privacy` and `/terms`), branded `404.html` with
`not_found_handling = "404-page"` (no more SPA catch-all), `robots.txt`,
`sitemap.xml`, `og.png` social card, SEO/OG/JSON-LD head, a "What's inside"
features chapter, hero CTAs, and a no-JS / CDN-failure copy fallback.

### Waitlist admin (who asked for access)

Emails live in the `WAITLIST` KV namespace under `user:` keys:

```bash
cd www/workers
wrangler kv key list --binding=WAITLIST --remote --prefix=user: | jq -r '.[].name'
wrangler kv key get --binding=WAITLIST --remote "user:someone@example.com"
```

See [`rev2/README.md`](rev2/README.md) for the Rev 2 chapter map and preview commands.

## What’s in the experience (Rev 1)

| Chapter | Story |
|--------|--------|
| Enter | First-person void → “Fly into your money map” |
| Approach | Not a spreadsheet — live neural map |
| Map | Household → people → accounts → merchants |
| Cashflow | Month bars, account scope |
| Sankey | Flows that balance to the cent |
| Budget | Pace engine + rule groups |
| Plan | Goals, forecast, pulse, wealth |
| Privacy | Bank data never leaves the browser |
| Dock | Email free access + demo / blank app CTAs |

Tech (Rev 1): single `index.html`, canvas starfield + node graph driven by scroll, smooth-scroll lerp, reduced-motion fallback, no analytics, no bank data.

## Local preview

```bash
# from repo root
python3 -m http.server 8787 --directory www
# Rev 1:  http://127.0.0.1:8787/
# Rev 2:  http://127.0.0.1:8787/rev2/
```

Relative links to `../demo.html` and `../index.html` work when the **whole repo** is served (Cloudflare Pages root = repo root) and the landing is visited as `/www/` **or** you set Pages to publish `www` as a separate project and host the app on a subdomain.

### Recommended domain split

| Host | Content |
|------|---------|
| `lithifyte.com` | This landing (`www/`) |
| `app.lithifyte.com` | Product shell (`index.html`, blank) |
| `demo.lithifyte.com` or `lithifyte.com/demo` | `demo.html` |
| `access.lithifyte.com` | Worker for magic-link auth |

Cloudflare Pages can attach `lithifyte.com` to a project whose build output is `www/`, and a second project (or the existing SID-Apps deploy) for the app.

## Free access & email — opinion (Cloudflare)

**Yes: Cloudflare is a strong fit** for *identity + privacy-safe product analytics*, if you keep a hard wall between **account email / usage enums** and **financial data**. See `docs/product-analytics.md`.

### What you want

- Capture email so you can maintain a user list and let them sign in free.
- **Never** hold statements, balances, merchants, or backups on your servers.
- Product remains local-first: compute in the browser; optional backup files the user owns.

### Recommended architecture

```
Browser
  ├─ Landing (www) ──POST email──► Worker + KV   (email + magic tokens only)
  │                                    │
  │                              magic link email
  │                                    ▼
  └─ App (index.html) ◄── session cookie / JWT (identity claim only)
         │
         └─ All finance data in localStorage / IndexedDB on THIS device
```

**Stack that matches your ethics:**

1. **Cloudflare Pages** — static landing + static app (already how sid-labs.com ships).
2. **Cloudflare Worker + KV** — waitlist + magic-link tokens + sessions (`workers/access.js`).
3. **Email delivery** — Resend, Postmark, or Mailchannels from the Worker (send only the magic link).
4. Optional later: **Cloudflare Access** / Zero Trust if you want enterprise SSO in front of a private staging app — overkill for free consumer access.

**Avoid for v1:**

- Putting full Firebase/Auth0 profiles that invite “sync my transactions to cloud.”
- Any API that accepts CSV uploads server-side.
- Analytics that capture form fields beyond “email submitted.”

### Magic link vs password

Magic link (or OTP) is better for free local-first tools:

- No password database to breach.
- Fits “email is only for identity + product mail.”
- Session cookie on `access.lithifyte.com` or `Domain=.lithifyte.com` with `HttpOnly; Secure; SameSite=Lax`.

The app can treat “signed in” as: *this browser is allowed to use the hosted shell and we know who to email*. It still does **not** upload finance data.

### Wiring the landing form

In `www/index.html`, set:

```js
const WAITLIST_URL = 'https://lithifyte-access.<you>.workers.dev/waitlist';
```

Until that is set, the form stores emails in **localStorage only** (dev fallback) and invites the user to the demo.

### Deploy the Worker

```bash
cd www/workers
npx wrangler login
npx wrangler kv:namespace create WAITLIST
# paste id into wrangler.toml
npx wrangler deploy
```

Turn off `DEV_RETURN_LINK` in production; implement `sendMagicLinkEmail` with your mail provider.

## Brand notes

- Palette matches Space view: void `#020b1a`, cyan `#38bdf8`, mint pace, magenta accents.
- Tone: precise, slightly cinematic, no fake “AI will fix your money” hype.
- Promise line always nearby: **bank data stays in the browser; email is identity only.**

## Legal / product

Landing is marketing HTML (not AGPL product derivative of the dashboard logic). Keep product copyright + AGPL on `index.html` / `demo.html`. Privacy policy for lithifyte.com should state clearly:

1. What email is used for.
2. That financial data is not collected by the account service.
3. How to delete the email / close access.
