---
title: How Lithifyte works
shortTitle: How it works
slug: how-it-works
section: product
description: Lithifyte reads CSV and text PDFs in the browser, can photograph a paper statement or receipt after you agree, and computes budgets, forecasts and net worth on your device. There is no finance database.
summary: Drop a CSV or a text PDF — it is read in this tab and never uploaded. Or photograph a statement or a till receipt after you sign in. The map, budgets and forecasts are computed on your device. Hosted photo reading is five pages free then Plus.
keywords: [household finance software, private budgeting app, bank statement analysis, photograph bank statement, offline finance app, open source money manager]
updated: 2026-08-25
priority: 0.9
howto_name: Set up Lithifyte with your own bank statements
howto_time: PT15M
howto_steps: [Open the app|Go to app.lithifyte.com/?capture=1 or download index.html. On the hosted app sign in so photo pages can be metered., Import however it arrives|Drop a CSV Excel or text PDF — read in the browser. Or photograph a paper page or till slip. Confirm the preview before anything is saved., Check the categories|Fix anything miscategorised once and write a rule so it stays fixed. Transfers between your own accounts are matched and excluded from spending., Set a goal or a budget|Give it something to aim at. The forecast and the pace-based budget both build on your real history rather than a round number.]
related: [budgeting-app, capturing-your-first-transaction, photographing-statements, logging-receipts, guide, security-and-privacy, faq]
---

## The short version

Most finance apps work by connecting to your bank, copying your transactions onto their servers, and showing you a view of that copy. Lithifyte inverts it. The analysis engine is delivered to you as a web page, and your data stays where it already is: on your device.

That single decision explains nearly everything else about the product — why the Engine costs nothing, why it is one file you can download and keep, and why nobody at Lithifyte can look at your spending even if asked to. Sign-in on the hosted app is identity only. Plus is hosted intelligence and maintained packs, not a lock on your numbers.

## What actually happens when you use it

1. **The page loads.** It is a single self-contained HTML file — the interface, the charts and the entire calculation engine, delivered in one request.
2. **You add a statement.** A CSV, spreadsheet or PDF with selectable text is read **in this browser**. A photograph or a scanned PDF has no text the browser can trust: if you ask, a vision model copies what is printed, **code** checks the figures, and you still confirm the preview. How to start: [Capture your first transaction](/capturing-your-first-transaction). What a photo does: [Photographing a bank statement](/photographing-statements).
3. **The engine enriches it.** Every transaction is matched against your categorisation rules, merchant names are normalised so that `TESCO STORES 3184` and `TESCO EXPRESS` become one merchant, transfers between your own accounts are detected and paired so they do not read as income and spending, and recurring payments are identified by their cadence.
4. **The results are stored locally.** In your browser's localStorage and IndexedDB, on that device, optionally encrypted at rest behind a passphrase you choose.
5. **Everything you see is computed from that.** Budgets, forecasts, the debt planner, net worth and the money map are all functions of the same enriched data, recalculated as it changes.

## The map is the point

Every other view in the app is a report. The map is the model.

Your household sits at the centre. People branch from it, accounts branch from people, categories and merchants branch from accounts, and money flows along the edges. Because it is one connected structure rather than a series of separate screens, you can see the things that separate screens hide: that two people are quietly funding the same subscription, that one account is doing all the work, that a category you think of as small has more merchant nodes hanging off it than your grocery spend.

You can search it, drag it, isolate a person, and watch it redraw as you change the date range. It is the fastest way to answer questions that begin with *"where is it all actually going?"*

## What it computes

| Area | What the engine does |
|---|---|
| **Budgets** | Suggests amounts from your own medians rather than round numbers, then paces them against the calendar — a safe-to-spend figure per remaining day, not a bar that turns red on the 20th. |
| **Forecasting** | Detects recurring bills and their cadence, allows for seasonal uplift, and sizes a buffer from how irregular your spending genuinely is. |
| **Debt** | Real amortisation for avalanche and snowball orders, with payoff dates and an honest flag when a payment does not even cover the interest. |
| **Net worth** | Accounts, manual assets, investments and debts in one layered figure, with staleness flags rather than silently pretending an old valuation is current. |
| **Leaks** | Small multiples per category with median and MAD spike flags, so a genuine anomaly separates from ordinary variation. |
| **Health** | A seven-measure dial scored against absolute benchmarks, so the number means something outside your own history. |

## Asking it questions

There is a co-pilot in the app — Ctrl/Cmd+K — that you can ask in plain language: *how have groceries gone this year*, *show me the cashflow*, *design a wedding budget from the last twelve months*. It answers, it opens the right section for you, and it can draft a budget or goal in a **sandbox** that changes nothing until you press Apply.

Two things make it worth trusting. The model never produces a number — it works out what you asked for, the engine computes the figures on your device, and the answer renders from those. Hosted Lithifyte Pro is available after you consent per lane (chat, categorise, PDF). Commands-only and a model running on your own machine send nothing. What is sent, and to whom, is set out plainly in [security and privacy](/security-and-privacy).

## What it does not do

It does not connect to your bank by default. It does not give financial advice, recommend products, or take a commission from anyone. It does not have a premium tier that unlocks your own numbers — Plus is hosted AI, an encrypted vault, and pack updates. There is no finance backend. The places anything about your money can leave the browser are: hosted AI (after you consent, only the slice that question needs); a **photo or scanned PDF you chose to send** (read by Lithifyte Pro, or by a model you run, not stored, confirmed before save); and an optional encrypted backup you choose to store on Drive or in the Plus vault (ciphertext we cannot read).

CSV and text-PDF import is still the private default: a file you exported yourself is a file no third party had to be trusted with. Paper is optional, metered, and tickable.

Commands-only and a local model keep even the co-pilot on your own machine.

## Two ways to run it

**Hosted** — open [app.lithifyte.com](https://app.lithifyte.com). Sign-in is Google or a magic link, so the official app can recognise you, meter Lithifyte Pro, and offer Plus. It holds no financial data in the clear. Privacy-safe product events (which sections get used, never amounts) stay on the hosted build.

**Self-hosted** — download `index.html` from [the repository](https://github.com/SID-Apps/lithifyte) and open it from your own disk, a USB stick, or a server you control. It works offline. It reports nothing. The Engine is the same file. You do not get hosted AI, the cloud vault, or live tax/bank-pack updates — those are the official product, not a crippled calculator.

## Getting your data back out

Everything exports. Encrypted backups, plain CSV and Excel packs, and a full JSON backup containing every store the app holds. If you stop using Lithifyte tomorrow, you leave with all of it — which is the only real test of whether software respects you.
