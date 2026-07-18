# Sign-in troubleshooting

## How access works (no allowlist)

Anyone can request a magic link at `access.lithifyte.com`. There is **no admin “grant access” step**.

1. User enters email → Worker stores `user:{email}` and emails a link  
2. User opens `access.lithifyte.com/auth?token=…`  
3. Worker sets `lf_session` cookie (`Domain=.lithifyte.com`) and shows a **signed-in** page that opens `app.lithifyte.com`  
4. App calls `/me` with credentials; if email present, the soft gate opens  

**Granting users access** = they successfully complete that flow. Optional later: waitlist approval (not implemented).

## Spam

- Prefer verifying **lithifyte.com** in Resend (SPF + DKIM in Cloudflare DNS) and set  
  `MAIL_FROM=Lithifyte <signin@lithifyte.com>`  
- Until then `signin@sid-labs.com` works but looks less aligned → more spam  
- Users: mark “Not spam” once; add the From address to contacts  

## “HTTP ERROR 403 / Access was denied”

That text is **Chrome’s generic 403 page**, not Lithifyte’s sign-in gate.

Our stack serves **HTTP 200** for `app.lithifyte.com` (verified). Common causes:

| Cause | What to do |
|-------|------------|
| **Cloudflare Zero Trust Access** on `app.lithifyte.com` or `*.lithifyte.com` | Zero Trust → Access → Applications → remove or set policy **Bypass** / public |
| **Bot Fight / Super Bot Fight / WAF** blocking the browser | Security → Bots / WAF → lower sensitivity or skip for `app.lithifyte.com` |
| **Email in-app browser** dropped the cookie on redirect | Open link in Safari/Chrome; use intermediate “You’re signed in” page (now shipped) |
| **Corporate / school network** | Try mobile data or another network |

## Link scanners

Gmail/Outlook may open links before the user does. Tokens now allow **up to 5 uses** within 30 minutes so scanners do not burn the only click.

## Operator checks

```bash
curl -sS https://access.lithifyte.com/health
curl -sSI https://app.lithifyte.com/   # expect 200
TOKEN=$(cat ~/.config/lithifyte/admin-token)
curl -sH "X-Admin-Token: $TOKEN" https://access.lithifyte.com/admin/summary | jq .
```
