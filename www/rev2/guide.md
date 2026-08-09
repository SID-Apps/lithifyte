# The Lithifyte guide

Source: https://lithifyte.com/guide
Updated: 2026-08-09
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

A complete feature reference, ordered the way you actually encounter things: get data in, make it trustworthy, understand it, then plan with it. There is also an interactive version inside the app with an Ask box.

## Before you start

There is no account to create. Open [app.lithifyte.com](https://app.lithifyte.com), or download `index.html` and open it from your own disk — the file works offline and behaves identically.

If you would rather look before you type anything, the [sample household](https://app.lithifyte.com/demo) is a fully populated invented family: two earners, four accounts, two years of transactions, with the messy bits (merchant name variants, standing orders, an annual insurance renewal, a holiday spike) deliberately left in. Its storage is separate, so exploring it can never touch real data you add later.

## 1 · Getting data in

**Set up the skeleton first.** Name the people in your household and the accounts they hold. Everything else hangs off this, and getting it right early saves re-work.

**Then import a statement.** Export a CSV from your online banking and drop it in. The importer works out which columns hold the date, the description and the money, and it tells you what it decided:

- The columns it used, named back to you.
- How many rows were added, and how many were skipped as duplicates.
- How many rows it could not read, with examples.

Read that report. A misread column is the single most common cause of numbers that look wrong later, and it is nearly invisible if the importer stays silent about it. Nothing is ever dropped without being counted.

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

## 5 · Keeping it alive

**Export a backup.** This is the single most important habit. Your data lives in your browser, and browsers can be cleared, corrupted or replaced. A backup file is a full JSON export of every store, optionally encrypted with a passphrase.

**Lock it** if the device is shared. AES-GCM encryption at rest with a PBKDF2-derived key. There is no recovery link — nobody holds a copy of your passphrase to reset it against.

**Alerts and reminders** cover upcoming bills detected from your recurring patterns, plus reminders you set yourself. You can also send yourself an email digest: your browser composes it, the server relays it, and the body is never stored.

**Run the self-tests** whenever you want reassurance. They execute in your browser against your own data and report every check. Green means the engine's arithmetic is behaving on your actual dataset — not on a demo somewhere.

## Where to go next

The [learn library](/learn) covers the money side rather than the software side — how budgets, forecasts, debt payoff and net worth actually work, in plain language. Inside the app, the tutorial walks the same ground interactively and includes an Ask box for questions about the product.
