# Client-composed money digest (Option A)

## Design

Lithifyte **never** computes digests on the server. The browser builds a newsletter-style email from the in-app alerts engine; the Worker only delivers it to the signed-in address.

```
Browser (signed in on app.lithifyte.com)
  computeAlerts() → composeMoneyDigest()
  POST /digest { subject, text, html, privacyMode }
       │
       ▼
access Worker  → Resend → user inbox
  (no KV write of body)
```

## UI

**Alerts & reminders** panel → “Email me a money digest”

- Checkbox: **Hide euro amounts in the email** (default on)
- Button requires hosted app + session (sample is blocked)

## Sections in the email

1. Overview (one-line pulse)
2. Reminders (user-defined)
3. Up and coming (`Engine.upcomingBills`)
4. Goal pace (behind-pace goals)
5. Footer: computed in browser · not stored

## Limits

| Limit | Value |
|-------|--------|
| Subject | 120 chars |
| Text | 24 KB |
| HTML | 48 KB |
| Rate | 3 / hour / email · 8 / hour / IP |

## Client API

```js
window.__ddComposeDigest({ maskAmts: true })
// → { subject, text, html, overview, counts, privacyMode }
```

## Future (Option B — not built)

Scheduled sealed digests uploaded on app open for later send — needs stronger privacy UX + policy.
