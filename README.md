# Lithifyte

**Household finance mission control in a single HTML file. Your bank data never leaves your browser.**

Lithifyte turns your bank statements into a **full financial neural map** of your household's money patterns: people, accounts and merchants; goal planning with honest feasibility dates; a pace-based budget; cautious forecasting; debt, investment and net-worth tracking (with an optional **Ireland** locale pack for local tax depth); and a financial-health dial over it all. It is one self-contained file — **your bank data never leaves the browser**. There is no finance backend. The hosted app may use email sign-in and privacy-safe product usage events only (see `docs/product-analytics.md`); self-hosted builds phone home with nothing.

> **The privacy promise, bluntly:** everything is computed in your browser from statements you upload. Your data lives in your browser's local storage (optionally encrypted at rest with a passphrase) and in backup files you export yourself. The page makes zero network requests with your data. You can read this file's source and verify every word of that.

**Try it first:** [the sample household](https://lithifyte.sid-labs.com/demo.html) is a fully loaded sample household — two earners, four accounts, two years of invented transactions — so you can explore everything without uploading a thing. The sample keeps its own separate storage and can never touch data you later add to the real app.

**New here?** The [Tutorial & Ask guide](https://lithifyte.sid-labs.com/tutorial) walks every feature in order of use (name → CSV → goals → budgets → wealth → backup) and includes an **Ask** box backed by a local RAG corpus (`docs/rag/chunks.json`). Optional: point Ask at your own local model for prose answers.

**Hosted at** [lithifyte.sid-labs.com](https://lithifyte.sid-labs.com) on **Cloudflare Pages** (auto-deploys from `main`). That is the only public host for now — not GitHub Pages.

**Marketing site** for the product domain lives in [`www/`](www/) — immersive first-person / Tron-grid landing, email-only free access (Cloudflare Worker stub), CTAs into sample and app. **Rev 1** is `www/index.html`; **Rev 2** (Claude Design Canvas — interactive money map + Sankey) is [`www/rev2/`](www/rev2/). See [`www/README.md`](www/README.md) for deploy layout (`lithifyte.com` → landing, app/sample path (`demo.html`) on subpaths or subdomains).

## Quick start

1. **Open the app** — either the hosted page, or download `index.html` and open it locally (the local file unlocks a couple of extras, see below).
2. The four-step onboarding takes over: your name → your first account → upload a statement → set a goal. The money map is alive from step one.
3. **Statements** are CSV files: `date,description,debit,credit` (a header row, dates as YYYY-MM-DD or common bank formats). Every Irish bank's export can be massaged into this in a spreadsheet in a minute — or automated, see the feeder below.
4. Re-uploading is always safe: duplicates are detected and skipped.
5. **Export a backup** (Settings → Backup) once you have real data in. That file is your durability story — optionally encrypted with a passphrase.

The self-test in the footer runs ~100 behavioural checks on every load. If it is ever red, don't trust the numbers — something changed.

## What's inside

- **The money map** — your household as an explorable graph: people, accounts, category hubs that unfold into merchants, your goals (wearing their progress as a ring), investments, assets and debts (drawn hollow — a hole in your worth). Click anything for its story; play your whole history as a time-lapse.
- **Goals** with cautious/expected feasibility dates, linkable to a real account's reconciled balance.
- **Budgets** that pace with the calendar and treat recurring bills as committed from day one — no false alarms on the 1st of the month.
- **Cashflow** month by month, with a Sankey money-flow view that balances to the cent (overspend shows as "from balance" — no flattering lies).
- **Forecast** with a robust safety buffer, detected recurring bills, and what-if spending levers.
- **Wealth**: debts (exact amortisation, payoff dates feeding the forecast), stocks/ETFs/crypto with the Irish tax layer (CGT, exit tax, 8-year deemed disposal), manual assets, net worth with an honesty layer (stale valuations get flagged), and a 7-measure financial Pulse score.
- **Categorisation you control**: the feed's guesses are auditable, one click writes a correction rule, rules always win, and statement-name variants (ALDI 23 873, ALDI51873…) are grouped under one merchant with merge/split controls.
- **AI categoriser (optional, local)**: point it at an OpenAI-compatible model on your own machine (Ollama, LM Studio) and it suggests categories for the leftovers. Nothing auto-applies; every acceptance becomes an ordinary rule. Savings, rent and gambling-shaped calls are flagged for your judgement, never trusted.

## Opened locally vs hosted

Everything works in both. Opening the downloaded file additionally enables the keyless crypto price refresh (CoinGecko) and the local-AI categoriser (browsers block a hosted page from calling other services — by design, and we like that design).

## The feeder (optional automation)

[`feeder/`](feeder/) is a zero-dependency Node CLI that automates data in:

- **Bank sync**: pulls transactions from your own bank via the GoCardless Bank Account Data API (free tier, EU PSD2) and writes CSVs in exactly the upload format. Your bank credentials never touch the HTML file — the CLI feeds it.
- **Stock/ETF quotes**: `node feeder.mjs prices AAPL VWCE=VWCE.DE` fetches keyless quotes, converts to EUR at ECB rates, and writes a quotes file the dashboard imports with one click.

See [feeder/README.md](feeder/README.md).

## For developers (and AI assistants)

The file is deliberately AI-maintainable: an update contract in the header comment, an embedded integrity checksum over the data, a ~100-check behavioural self-test, render guards that name any section that fails, and a pure computation kernel (`Engine`) separated from the DOM. If you point an LLM at this file, it will find its instructions waiting.

Releases use [`tools/swap-data.mjs`](tools/swap-data.mjs): one shared shell of code, with each user's finance-data block swapped in. The sample build is generated by [`tools/make-demo.mjs`](tools/make-demo.mjs) — deterministic, entirely invented data, regenerable from source so you can verify none of it is real. Your personal build (with your transactions embedded) is just `index.html`'s code plus your data block — and it must never be committed; the `.gitignore` tries to protect you from that mistake.

## Honest limitations

- Desktop-first. It works on a phone browser, but it isn't a phone app yet.
- CSV in (or the feeder CLI) — there is no magical instant bank link, because that would require a server holding your credentials, and the whole point is that there isn't one.
- Single-currency (EUR) and Irish-first: the tax layer, schemes and merchant knowledge are tuned for Ireland. The rest travels fine.
- The at-rest encryption lock is opt-in. Turn it on if the machine is shared.

## Security

Threat model, encryption notes, residual risks, and how to report a vulnerability: **[SECURITY.md](SECURITY.md)**.

Prefer [private vulnerability reporting](https://github.com/SID-Apps/lithifyte/security/advisories/new) for sensitive findings — do not post exploit detail in a public issue.

## License

**AGPL-3.0-or-later** — see [LICENSE](LICENSE). Plain-language summary: use it, study it, modify it, share it, self-host it for your household freely. But if you publish or host a derivative, it must remain open source under this same license with attribution intact. Stripping this notice and selling Lithifyte as your own closed product is a license violation, and the kind we would pursue.

Copyright © 2026 the Lithifyte project (SID Labs).
