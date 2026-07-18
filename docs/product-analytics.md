# Privacy-safe product analytics (hosted only)

Lithifyte **never** sends financial data to a server. On the **hosted** app (`app.lithifyte.com`) we record **identity** and **allowlisted product usage events** so we can:

- see sign-ups and sign-ins
- measure activation (onboarding, CSV upload — counts only)
- see which sections people open
- re-engage users (email) and plan hosted Plus features later

Self-hosted / `file://` builds send **nothing**.

## Endpoints (`access.lithifyte.com`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/waitlist` | — | Sign-up / magic link; creates user record |
| GET | `/auth?token=` | token | Sign-in; bumps `signInCount`, `lastSignInAt` |
| GET | `/me` | session cookie | Email + plan + activation flags |
| POST | `/events` | session *or* public funnel | Allowlisted events |
| GET | `/admin/summary` | `X-Admin-Token` | Operator funnel dashboard JSON |
| GET | `/health` | — | Lists allowed event names |

Set admin token once:

```bash
cd www/workers && wrangler secret put ADMIN_TOKEN
# then:
curl -sH "X-Admin-Token: $TOKEN" https://access.lithifyte.com/admin/summary | jq .
```

## Event allowlist

| Event | Props (only these) | Session? |
|-------|--------------------|----------|
| `signup` | `source` | server |
| `signin` | `method` | server |
| `session_start` | `app_ver`, `locale`, `viewport`, `demo` | optional |
| `gate_shown` / `gate_open` | `path` | public |
| `demo_click` | `from` | public |
| `landing_cta` | `cta`, `from` | public |
| `onboarding_step` | `step` ∈ household/people/account/statement/goal | signed-in |
| `section_view` | `section` ∈ dock keys | signed-in |
| `action` | `action` ∈ csv_upload, backup_export, … | signed-in |
| `map_interact` | `type` ∈ drag/filter/isolate/search/click | signed-in |
| `map_first_render` | — | signed-in |
| `locale_set` | `locale` ∈ IE \| GLOBAL | signed-in |
| `self_test` | `pass` bool | signed-in |
| `error` | `code` short enum | signed-in |

**Never stored:** amounts, merchants, descriptions, account names, goal titles, CSV content, balances.

## Client API

```js
window.__lfTrack('section_view', { section: 'budget' });
// no-op unless hostname is app.lithifyte.com
```

## User record (KV `user:{email}`)

```json
{
  "email": "…",
  "createdAt": "…",
  "lastSignInAt": "…",
  "lastSeenAt": "…",
  "signInCount": 1,
  "plan": "free",
  "locale": "IE",
  "flags": { "has_uploaded": true, "has_backup": false, "onboarding_complete": false },
  "eventCounts": { "session_start": 3, "section_view": 12 }
}
```

## Locale model

One global product. Locale packs:

- **GLOBAL** — core map, budgets, forecast (default for non-IE)
- **IE** — Irish tax / schemes depth (default when browser/lang suggests Ireland)

Pack-specific fiscal depth is free at launch; “maintained pack updates” may become Plus later.

## Related

- Privacy policy: `/privacy` on lithifyte.com
- SECURITY.md — residual risks
- Vault: `Lithifyte - Product Analytics & Locale.md`
