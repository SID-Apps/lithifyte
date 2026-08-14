# Lithifyte

**Household finance mission control in a single HTML file. We never store your ledger.**

Lithifyte turns your bank statements into a **full financial neural map** of your household's money patterns: people, accounts and merchants; goal planning with honest feasibility dates; a pace-based budget; cautious forecasting; debt, investment and net-worth tracking; and a financial-health dial over it all. Currency is yours to set. Tax estimates use rates **you** enter — Lithifyte ships none. It is one self-contained file. **There is no finance backend.** The hosted app uses Google or email sign-in, privacy-safe product events, and optional Lithifyte Plus (metered AI, encrypted vault, maintained bank-import presets — see `docs/REPO-SPLIT.md`); self-hosted builds phone home with nothing.

> **The privacy promise, bluntly:** statements are parsed in your browser. We never store them. Asking hosted Lithifyte AI sends *the slice that question needs* to the model provider for that request — not the ledger. Commands-only and your own model (Ollama / Qwen) send nothing. You can read this file's source and verify every word of that.

**Try it first:** [the sample household](https://app.lithifyte.com/demo) is a fully loaded sample household — two earners, four accounts, two years of invented transactions — so you can explore everything without uploading a thing. The sample keeps its own separate storage and can never touch data you later add to the real app.

**Co-pilot (Ctrl/⌘+K or 💬):** ask about your money in plain language, open any section, design a **sandbox** budget or goal, then Apply when ready. Optional **Lithifyte AI** (hosted) or your own API key (OpenAI / xAI Grok / Anthropic / local OpenAI-compatible). Figures always come from Lithifyte’s Engine — the model is not allowed to invent euro amounts. Conversations can appear on the money map’s outer knowledge ring.

**New here?** The [Tutorial & Ask guide](https://app.lithifyte.com/tutorial) walks every feature in order of use (name → CSV → goals → budgets → wealth → backup) and includes an **Ask** box backed by a local RAG corpus (`docs/rag/chunks.json`). Optional: point Ask at your own local model for prose answers.

**Home is [lithifyte.com](https://lithifyte.com)** — the product site, with the [guide](https://lithifyte.com/guide), the [FAQ](https://lithifyte.com/faq), [Plus / commercial](https://lithifyte.com/commercial) and a plain-language [money library](https://lithifyte.com/learn). The app itself runs at **[app.lithifyte.com](https://app.lithifyte.com)** on a Cloudflare Worker that auto-deploys from `main`. Those two hosts are the only official ones.

**Marketing site** for the product domain lives in [`www/`](www/). Identity, billing, the AI relay and the encrypted vault are **not** in this repository — they live in the private Cloud (see [`docs/REPO-SPLIT.md`](docs/REPO-SPLIT.md)).

## Quick start

1. **Open the app** — either the hosted page, or download `index.html` and open it locally (the local file unlocks a couple of extras, see below).
2. Drop a statement to start. We will create a household for you if you skip the labels. A goal is optional.
3. **Statements** are your bank's own export — CSV, tab-separated or Excel `.xlsx`, whatever shape it comes in. Press **Prepare & preview**: the importer works out which column is which, you correct anything it got wrong, and it shows you every finished transaction beside your raw file *before* anything is saved. See [Reading your statement](#reading-your-statement).
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

## Reading your statement

Upload the file your bank actually gives you. **CSV, tab- or semicolon-separated, or Excel `.xlsx`** — the spreadsheet is unzipped and read *in your browser*, with no library and nothing uploaded, so the privacy promise holds for it too.

**Prepare & preview** is a two-step flow:

1. **Columns.** Known bank exports are recognised outright — a **Revolut** statement is mapped in one click: it reads the *completed* date, folds each fee into its own transaction so the balance still adds up, and holds back anything not `COMPLETED`. Anything else is matched on synonyms (*debit / money out / paid out / withdrawals*; *credit / money in / paid in / lodgement / deposits*; or one signed *amount* column). **Every decision is yours to change**: pick what each column is, the date order (day-first vs month-first, decided from the whole column, not row by row), the decimal mark (`1,234.56` or `1.234,56`), whether to swap the two directions, and rules for holding rows back (*only import rows whose State is COMPLETED*). A preamble of bank blurb above the real header is skipped, and you can point at the header row yourself.
2. **Preview.** Your raw file on the left, **exactly what will be stored on the right** — the preview is not a rehearsal, it is the import, simply not saved yet. With totals, the date range, and every row that will *not* be imported named with its reason. Nothing reaches your dashboard until you press the button.

Then it is remembered: the mapping is saved against that file's column headers, so next month's export from the same bank comes back already mapped.

**Where the statement carries a running balance, the importer walks it.** If every step agrees with the amounts it read, the mapping is *proven* right rather than assumed — and the balance implied before the first row is offered as that account's **opening balance**, which is the number the reconciled cash, net-worth and goal figures are built on. (It is never used to overwrite an opening balance you already set without saying so, and never by default.)

**Nothing is ever dropped in silence.** A row held back by one of your rules is counted and named; a row with a date but no readable amount is counted and named; an import that is entirely one-directional is flagged, because that is nearly always a mapping slip.

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
- Statement files in (or the feeder CLI) — there is no magical instant bank link, because that would require a server holding your credentials, and the whole point is that there isn't one.
- One bank preset ships (Revolut), because it is the one that has been verified against a real export. Everything else goes through synonym matching plus the column mapper, which handles any file; adding a preset is a small, self-contained change (`Engine.IMP_PRESETS`).
- Single-currency (EUR) and Irish-first: the tax layer, schemes and merchant knowledge are tuned for Ireland. The rest travels fine.
- The at-rest encryption lock is opt-in. Turn it on if the machine is shared.

## Security

Threat model, encryption notes, residual risks, and how to report a vulnerability: **[SECURITY.md](SECURITY.md)**.

Prefer [private vulnerability reporting](https://github.com/SID-Apps/lithifyte/security/advisories/new) for sensitive findings — do not post exploit detail in a public issue.

## License

**AGPL-3.0-or-later** — see [LICENSE](LICENSE). Use it, study it, modify it, share it, self-host it for your household. If you publish or host a derivative, it must remain open under this same licence with attribution intact. The Lithifyte name is a trademark; a fork cannot call itself Lithifyte.

Organisations that cannot take AGPL obligations can buy a [commercial licence](COMMERCIAL-LICENSE.md). Hosted Plus (AI, vault, pack updates) is a separate subscription on the official app, not a lock on this file.

Copyright © 2026 the Lithifyte project (SID Labs).
