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

The self-test in the footer runs ~210 behavioural checks on every load. If it is ever red, don't trust the numbers — something changed.

## What's inside

- **The money map** — your household as an explorable graph: people, accounts, category hubs that unfold into merchants, your goals (wearing their progress as a ring), investments, assets and debts (drawn hollow — a hole in your worth). Click anything for its story; play your whole history as a time-lapse.
- **Goals** with cautious/expected feasibility dates, linkable to a real account's reconciled balance.
- **Budgets** that pace with the calendar and treat recurring bills as committed from day one — no false alarms on the 1st of the month.
- **Cashflow** month by month, with a Sankey money-flow view that balances to the cent (overspend shows as "from balance" — no flattering lies).
- **Forecast** with a robust safety buffer, detected recurring bills, and what-if spending levers.
- **Wealth**: debts (exact amortisation, payoff dates feeding the forecast), stocks/ETFs/crypto with the Irish tax layer (CGT, exit tax, 8-year deemed disposal), manual assets, net worth with an honesty layer (stale valuations get flagged), and a 7-measure financial Pulse score.
- **Cashflow** also carries **balances brought forward** — where every account ended each month, with overdrawn months shown as the negative figures they are — and a month stepper so you can walk through the year without leaving the breakdown.
- **Categorisation you control**: the feed's guesses are auditable, one click writes a correction rule, rules always win, and statement-name variants (ALDI 23 873, ALDI51873…) are grouped under one merchant with merge/split controls. Rules can match a **pattern** where the name varies (`C***GB` catches C123GB and C481GB), and the app suggests the pattern from your own statement names. **Tick several transactions** in Search to move a batch to one category in a single action — that moves exactly those rows, and optionally writes a rule so future statements follow.
- **One category, month by month**: pick Rent and see every month in the range, its average with and without the empty months, its peak, and whether it is trending up. Date adjusters sit in Cashflow and Categories, not just at the top.
- **A Summary front screen** above everything else: next month's predicted income, spending, savings and investments (from the same forecast engine the Forecast section uses, so the two never disagree), current account balances, and a ring of a typical month's spending. Every card is a door into the section behind the number.
- **Notes & context** — the part no statement carries. Write down that hours drop every January, or that the savings are for a wedding and not a car, and link it to the people, accounts, **categories and months** it concerns. Linked notes appear on those money-map nodes, and go to a connected AI along with the numbers, so its advice is about your situation rather than a generic spreadsheet.
- **Explain an anomaly where you see it.** Groceries oddly low last January? Open that month, press **＋ Note why**, and record that you spent a voucher. The note is then attached to that category *and* that month, and shows up every time you look at either — so next year you are not re-deriving it from nothing, and neither is an AI reading your data.
- **Leak shapes**: one strip per leak across the range, flagged as a steady monthly habit or a one-off, with months far above that leak's own median marked as spikes (median + 3×MAD, so a leak that is always big is not flagged and a genuine blowout is).
- **Assets and liabilities by category** as circle charts that reconcile with the net-worth figure, plus **net worth over time** with both sides on one axis.
- **Guided setup** for your first goal and your first debt: a few questions at a time instead of a nine-field grid, with the arithmetic checked as you go (it will tell you when a monthly payment can never clear a balance). Nothing is seeded — a new install starts with no invented goal.
- **Your data survives updates**: before a new version changes how anything is stored it snapshots every store, and it refuses to write at all rather than risk data it cannot read (see *Data safety* below).
- **AI categoriser (optional, local)**: point it at an OpenAI-compatible model on your own machine (Ollama, LM Studio) and it suggests categories for the leftovers. Nothing auto-applies; every acceptance becomes an ordinary rule. Savings, rent and gambling-shaped calls are flagged for your judgement, never trusted.

## Reading your CSV

Column names vary by bank, so the importer matches on synonyms: *debit / money out / paid out / withdrawals* for money out, *credit / money in / paid in / lodgement / deposits* for money in, or a single signed *amount* column. **After every upload it tells you which columns it used**, how many rows it could not read, and warns you if everything imported in one direction — because a statement whose money-in column was not recognised imports as outgoings only, and then looks exactly like an account that just drains. If your headers are unusual, rename them to any of the names above and upload again; duplicate rows are skipped, so re-uploading a corrected file is safe.

## Colour

Every categorical colour in the app — category bars, the money map, the money-flow diagram, the rings, the net-worth graph — comes from one nine-hue palette with separate steps for the light and the dark surface. It was chosen by search and checked with a validator, not picked by eye: both sets clear the lightness band, the chroma floor, adjacent colour-vision separation (ΔE 14.0 light / 14.9 dark against a target of 8), adjacent normal-vision separation (22.6 / 23.3 against a floor of 15) and 3:1 contrast against their own surface.

The honest limit: a category's colour comes from a hash of its name, so any two categories can end up side by side, and no palette this size can make *every pair* colour-vision-safe. That is why every surface showing these colours also names the category — bars are direct-labelled, rings carry a value legend, map nodes are labelled. **Colour is the mnemonic; the label is the identity.** Any colour you set yourself always wins over the palette.

## Data safety

Your finances live in this browser and nowhere else, so there is no server copy to restore from. Updates are handled accordingly:

- **Snapshot before change.** When a new version needs to change how anything is stored, every store is copied into a restore slot *first*. Roll back from **Settings → Backup → Pre-update snapshots**; the newest three are kept. Restored data is then *held* at its old version, so reloading cannot walk you back into the same problem — you lift the hold yourself when you are ready.
- **Refuse rather than guess.** Data written by a newer version, or a store that will not parse, puts the page in **read-only mode**: a banner explains it, nothing is written, and you are offered an export. A version that cannot understand your data will never overwrite it.
- **Additive by default.** New features add fields and stores rather than reshaping existing ones — the pattern-matching rules added `match` alongside the old behaviour instead of reinterpreting rules you already had.

None of this replaces **Export everything**. Snapshots live in the same browser, so they do not survive clearing site data or losing the device — keep a backup file somewhere else.

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
