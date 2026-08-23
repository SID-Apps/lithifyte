# The Lithifyte guide

Source: https://lithifyte.com/guide
Updated: 2026-08-14
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

A complete feature reference, ordered the way you actually encounter things: get data in, make it trustworthy, understand it, then plan with it. There is also an interactive version inside the app with an Ask box.

## Before you start

The Engine is free forever. Open [app.lithifyte.com](https://app.lithifyte.com) and sign in if you want Lithifyte Plus (hosted AI, an encrypted vault we cannot read, and the maintained library of bank import presets). Or download `index.html` and open it from your own disk — the calculator works offline and never phones home. Plus is documented at [lithifyte.com/commercial](https://lithifyte.com/commercial).

If you would rather look before you type anything, the [sample household](https://app.lithifyte.com/demo) is a fully populated invented family: two earners, four accounts, two years of transactions, with the messy bits (merchant name variants, standing orders, an annual insurance renewal, a holiday spike) deliberately left in. Its storage is separate, so exploring it can never touch real data you add later.

## 1 · Getting data in

**Set up the skeleton first.** Name the people in your household and the accounts they hold. Everything else hangs off this, and getting it right early saves re-work.

**Then import a statement.** Export whatever your bank gives you — CSV, tab- or semicolon-separated, or Excel `.xlsx`. The spreadsheet is unzipped and read inside your browser, with no library and nothing uploaded, so the privacy promise holds for it too.

Press **Prepare & preview**, which is two steps:

1. **Columns.** Known exports are recognised outright. A Revolut statement maps in one click on every copy — completed date, fees folded into their own rows, anything not `COMPLETED` held back. On the official host, Plus adds maintained maps for AIB, Bank of Ireland, Permanent TSB and N26; they stay overridable. Anything else is matched on column-name synonyms. **Every decision is yours to change**: what each column is, the header row (a preamble of bank blurb is skipped automatically), the date order — decided from the whole column rather than row by row, so one 13th "month" settles it — the decimal mark, whether to swap the two directions, and rules for holding rows back.
2. **Preview.** Your raw file on the left, exactly what will be stored on the right, with totals, the date range, and every row that will *not* be imported named with its reason. The preview is not a rehearsal — it renders the same result the import saves, simply not saved yet. Nothing reaches your dashboard until you press the button.

**Where the statement carries a running balance, the importer walks it.** If every step agrees with the amounts it read, the mapping is *proven* correct rather than assumed — and the balance implied before the first row is offered as that account's **opening balance**, which is the number your cash, net-worth and goal figures are built on. It never overwrites an opening balance you already set without telling you.

**Mappings are remembered** against that file's column headers, so next month's export from the same bank comes back already mapped.

**Nothing is ever dropped in silence.** A row held back by one of your rules is counted and named. A row that cannot be read is counted and named. An import that is entirely one-directional is flagged, because that is nearly always a mapping slip rather than a strange month.

**Re-uploading is safe.** Transactions are fingerprinted, so importing an overlapping statement adds only what is new. If a previous import went wrong, fixing it is usually just uploading the file again.

**How much history?** Twelve months if you can get it. A full year is what makes annual bills and seasonal patterns visible to the forecast; six months is workable; three months will produce a confident-looking forecast that is blind to your car insurance.

## 2 · Making the data trustworthy

This is the step people skip, and it is the one that determines whether anything downstream means anything.

**Transfers.** Money moving between your own accounts is not income and not spending. Lithifyte matches the two sides by amount, date proximity and direction, scores the match, and excludes the pair from spending totals. Check the matches once; an unmatched transfer inflates both your income and your outgoings.

**Merchant names.** Banks emit `TESCO STORES 3184`, `TESCO EXPRESS DUBLIN` and `TESCO-STORES` for one shop. The canonicaliser folds these into a single merchant so your map and your category totals stop being fragmented by till numbers.

**Categories and rules.** Fix a miscategorised transaction once, then write a rule from the merchant name so it stays fixed. Rules support wildcards and amount ranges — useful when the same merchant is groceries at €80 and a birthday present at €200. A per-transaction override always beats a rule, so you can make an exception without weakening the rule.

**Optional local AI.** You can point the categoriser at a language model you run yourself — Ollama, LM Studio, anything speaking the OpenAI-compatible protocol. It only ever suggests; you approve, and the approval becomes an ordinary rule you can read and edit. Nothing is sent to a remote model by default, and the feature is entirely optional.

## 3 · Understanding what you see

**The money map.** Household → people → accounts → categories → merchants, drawn as a live graph with money flowing along the edges. Drag it, search it, isolate one person, change the date range and watch it redraw. Nodes carry markers for recurring payments and for notes you have written.

**Cashflow.** In versus out by month, with a stepper to walk through months and a drill-down that expands a month into categories and then into individual transactions.

**The Sankey.** Where income actually went, balanced to the cent — including the legs people usually leave out: money drawn from savings, money added to them, and the surplus or shortfall.

**Categories.** A legend of every category with its share, a per-category monthly view for spotting drift, and recategorisation from wherever you happen to be looking.

**Leaks.** Small multiples per category with spike flags based on the median and the median absolute deviation, so an unusual month separates from ordinary noise instead of every category looking dramatic.

**Notes.** You can attach a note to a person, an account, a category or a specific month. This sounds minor and turns out to matter: in eight months you will not remember why January's groceries were low, and *"used a €50 voucher"* attached to that month is the difference between a real insight and a wrong conclusion.

## 4 · Planning with it

**Budgets** are pace-based. Rather than a fixed monthly bar that turns red on the 20th of every month, the engine seeds amounts from your own medians, commits your recurring bills from day one so they cannot register as an overspend, and reports a safe-to-spend figure for each remaining day.

**The forecast** detects recurring bills and their cadence, allows for seasonal uplift, and sizes a buffer from how irregular your spending genuinely is rather than assuming an average month. The simulator lets you cut a category and watch the effect on the projection.

**Goals** carry an honest feasibility date computed from your actual surplus, not from the number you wish were true. A goal can be linked to a real account so its progress reconciles against a real balance.

**Debts** are modelled with real amortisation. Compare avalanche against snowball, see genuine payoff dates, model an overpayment, and get an explicit flag when a payment does not even cover the interest — the situation that quietly keeps a balance alive for years.

**Net worth** layers accounts, manual assets, investments and debts into one figure, with a trend line and staleness flags. A valuation that has not been updated in a year is marked as such rather than silently treated as current.

**Financial health** is a seven-measure dial scored against absolute benchmarks rather than only against your own past, so the score carries meaning outside your own history.

## 5 · Asking instead of clicking

Press **Ctrl/Cmd+K** for the co-pilot. Ask in plain language — *how have groceries gone this year*, *show me the cashflow*, *why was January low*, *design a wedding budget from the last twelve months* — and it answers, opens the section it is talking about, and can draft a budget or goal for you.

Anything it designs lands in a **sandbox** beside your real data. You can iterate on it in the chat — *cut dining, protect rent* — and nothing touches your live stores until you press **Apply**. Conversations and scenarios are kept like notes: re-openable, linkable, included in your backups, and shown on the money map's outer ring so you can find the discussion that produced a decision months later.

**Connect a model first.** **Lithifyte Pro** (hosted Qwen 3.8, the default) or **Lithifyte AI** (hosted Grok) need no key; any OpenAI-compatible endpoint, including Ollama or LM Studio on your own machine, stays local. The local option is the one where nothing about your finances leaves your computer — see [security and privacy](/security-and-privacy) for exactly what is sent in each case.

**The model never produces a number.** It works out what you asked for, the engine computes the figures, and the answer renders from those computed values. If a figure appears in a co-pilot answer, it came from the same code that draws your charts.

## 6 · Keeping it alive

**Export a backup.** This is the single most important habit. Your data lives in your browser, and browsers can be cleared, corrupted or replaced. A backup file is a full JSON export of every store, optionally encrypted with a passphrase.

**Lock it** if the device is shared. AES-GCM encryption at rest with a PBKDF2-derived key. There is no recovery link — nobody holds a copy of your passphrase to reset it against.

**Alerts and reminders** cover upcoming bills detected from your recurring patterns, plus reminders you set yourself. You can also send yourself an email digest: your browser composes it, the server relays it, and the body is never stored.

**Run the self-tests** whenever you want reassurance. They execute in your browser against your own data and report every check. Green means the engine's arithmetic is behaving on your actual dataset — not on a demo somewhere.

## Where to go next

The [learn library](/learn) covers the money side rather than the software side — how budgets, forecasts, debt payoff and net worth actually work, in plain language. Inside the app, the tutorial walks the same ground interactively and includes an Ask box for questions about the product.
