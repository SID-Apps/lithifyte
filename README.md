# Money Map

**Household finance mission control in a single HTML file. Your bank data never leaves your browser.**

Money Map turns your bank statements into a living picture of your household's money: a neural map of people, accounts and merchants; goal planning with honest feasibility dates; a pace-based budget; cautious forecasting; debt, investment and net-worth tracking with an Irish tax layer; and a financial-health dial over it all. It is one self-contained file — no server, no account, no tracking, no analytics, nothing phones home. That is not a feature toggle; there is no backend to send anything to.

> **The privacy promise, bluntly:** everything is computed in your browser from statements you upload. Your data lives in your browser's local storage (optionally encrypted at rest with a passphrase) and in backup files you export yourself. The page makes zero network requests with your data. You can read this file's source and verify every word of that.

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

Releases use [`tools/swap-data.mjs`](tools/swap-data.mjs): one shared shell of code, with each user's finance-data block swapped in. Your personal build (with your transactions embedded) is just `index.html`'s code plus your data block — and it must never be committed; the `.gitignore` tries to protect you from that mistake.

## Honest limitations

- Desktop-first. It works on a phone browser, but it isn't a phone app yet.
- CSV in (or the feeder CLI) — there is no magical instant bank link, because that would require a server holding your credentials, and the whole point is that there isn't one.
- Single-currency (EUR) and Irish-first: the tax layer, schemes and merchant knowledge are tuned for Ireland. The rest travels fine.
- The at-rest encryption lock is opt-in. Turn it on if the machine is shared.

## License

**AGPL-3.0-or-later** — see [LICENSE](LICENSE). Plain-language summary: use it, study it, modify it, share it, self-host it for your household freely. But if you publish or host a derivative, it must remain open source under this same license with attribution intact. Stripping this notice and selling Money Map as your own closed product is a license violation, and the kind we would pursue.

Copyright © 2026 the Money Map project.
