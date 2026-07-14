# GoCardless → dashboard feeder

Companion script for the household finance dashboard (`~/deposit-dashboard.html`).
It pulls transactions straight from your banks via the **GoCardless Bank Account
Data** API (the free PSD2 service formerly called Nordigen) and writes CSVs the
dashboard's *Upload a statement* form accepts as-is. Your data goes bank → this
machine → the dashboard in your browser; no third-party storage beyond the
regulated PSD2 aggregator itself.

## One-time setup

1. Create a free account at <https://bankaccountdata.gocardless.com>
   (this is GoCardless's data product — no payment product involved).
2. In the portal: **Developers → User secrets → Create new** — note the
   secret ID and secret key.
3. `cp config.example.json config.json` and paste both values in.
   `config.json` and `state.json` stay in this folder and are yours to protect
   (they grant read-only account access — treat like a bank statement drawer).

## Connect a bank (per bank, ~every 90 days)

```
node feeder.mjs banks            # list Irish institutions → pick the id
node feeder.mjs connect BANKOFIRELAND_B365_BOFIIE2D
```

Open the printed link, log in at your bank, approve read-only access
(PSD2 consent, typically 90 days). The final redirect to `localhost` showing
"cannot connect" is expected — the consent is already stored.

## Pull transactions

```
node feeder.mjs fetch            # writes out/<bank>-<acct>.csv per account
node feeder.mjs status           # linked accounts + last fetch dates
```

Fetches are incremental (from the last seen booking date). Overlap and
re-uploads are harmless: the dashboard de-duplicates statement rows on upload
and reports "N new, M duplicates skipped".

## Stock/ETF quotes (no key, no config)

```
node feeder.mjs prices AAPL MSFT VWCE=VWCE.DE LLOY=LLOY.L
```

The left side of each argument is **your holding symbol in the dashboard**;
add `=TICKER` when Yahoo names it differently (European listings need their
suffix: `.DE`, `.L`, `.PA`, …; London quotes arrive in pence and are
converted). Prices come from Yahoo Finance's keyless chart endpoint, non-EUR
currencies are converted at ECB rates (frankfurter.app), and the result is
written to `out/quotes-YYYY-MM-DD.json`. Import it in the dashboard:
**Wealth → Investments & crypto → 📥 Import quotes file** (older quotes never
overwrite newer ones). Crypto has its own in-app ↻ button (CoinGecko).

## Notes

- `node feeder.mjs selftest` runs the offline conversion tests (no network,
  no credentials) — CSV conversion + the prices core.
- Free tier: 50 institutions/day rate limit, 4 requisitions/bank/month —
  plenty for a weekly household pull.
- When the mobile build starts (vehicle TBD), this script's flow
  (token → requisition → consent link → account transactions) is the
  reference implementation to port.
