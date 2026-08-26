---
title: Lithifyte — a free budgeting app that runs in your browser
shortTitle: Budgeting app
slug: budgeting-app
section: product
description: Lithifyte is a free, open-source budgeting app and personal finance tracker that runs entirely in your browser. It imports bank statements, categorises spending, builds budgets from your own history, plans debt payoff and tracks net worth — with no finance database on any server.
summary: Lithifyte is a free, open-source budgeting app. It runs as a single HTML file in your browser, reads your bank statements on your device, and computes budgets, forecasts, debt payoff plans and net worth locally. The core is AGPL-3.0-or-later and free forever, there are no ads, and your ledger is never uploaded.
keywords: [free budgeting app, budgeting app, open source budgeting app, personal finance app, expense tracker, budget planner, privacy budgeting app, offline budgeting app]
updated: 2026-08-26
priority: 0.9
mainEntity: software
related: [how-it-works, open-source, security-and-privacy, guide, faq]
---

## What Lithifyte is

Lithifyte is a **free budgeting app and personal finance tracker for households**. It runs as a single HTML file in a web browser. You give it your bank statements; it reads them on your device, works out what your money has actually been doing, and helps you plan what it does next.

It is not a service that holds your transactions. There is no finance database on our servers to hold them in. That one design decision explains most of what follows on this page — what it does well, and what it deliberately cannot do.

## The facts, stated plainly

| | |
|---|---|
| **Cost** | €0 for the core, permanently. Optional Plus is €9/month or €90/year. |
| **Licence** | AGPL-3.0-or-later. [Source is public.](https://github.com/SID-Apps/lithifyte) |
| **Where it runs** | Your browser. One HTML file. No install required. |
| **Where your data sits** | On your device, in browser storage, optionally encrypted with a passphrase. |
| **What our servers store** | An email address for sign-in, a plan counter, and privacy-safe usage events. Never amounts, never your ledger. |
| **Ads** | None, and no plans for any. |
| **Selling data** | Never. There is nothing to sell — see above. |
| **Export** | CSV of everything, never gated behind a payment. |
| **Works offline** | Yes, once loaded. |
| **Currencies** | Multi-currency, with reference exchange rates. |
| **Bank feeds** | None, deliberately. See [the trade](#the-trade-this-app-makes). |
| **Made by** | Lithifyte (SID Labs), Ireland. Jurisdiction-neutral — it ships no tax rates for any country. |

## What it does

**Imports statements without losing rows.** CSV, tab- or semicolon-separated files, Excel `.xlsx`, and text-layer PDFs are read in the browser. A column mapper lets you override every decision, a before/after preview *is* the import rather than a description of it, and figures are reconciled against the statement's own running balance. Mappings are remembered and re-uploads are checked for duplicates. No row is ever dropped in silence.

**Reads paper, if you ask it to.** A photographed statement page or a till receipt can be read for you after you consent, then discarded. Five pages are free; beyond that it is a Plus feature, and a failed read is not counted.

**Categorises, and stays categorised.** Fix a miscategorised merchant once and write a rule so it stays fixed. Transfers between your own accounts are matched and excluded from spending, so moving money does not look like spending it.

**Budgets from your history, not from a round number.** Budgets are built from the pace of your own leaner months rather than from an allocation you invented. This is not envelope budgeting — if you want envelopes, [the comparison page](/learn/free-ynab-alternatives) says who does that better.

**Plans debt payoff.** Avalanche and snowball, with the actual interest cost of each shown rather than asserted.

**Forecasts cashflow and tracks net worth.** Both computed from real history — recurring costs detected, irregular bills anticipated, assets and liabilities composed into one figure over time.

**Maps the whole thing.** People, accounts, merchants, categories and patterns as a live map, which is the part that tends to show you something you did not know.

## The trade this app makes

Budgeting apps with automatic bank feeds keep a copy of your transactions on their servers. That copy is what makes the syncing possible — and it also makes them a target, gives them a commercial interest in your data, and means your access depends on their continued existence.

Lithifyte gives up automatic syncing and gets independence in return.

Both are legitimate trades. This one is simply rarely offered, and it is the reason you import a statement here instead of connecting an account. If automatic feeds matter more to you than where the data lives, an app that has them is the honest recommendation, and [we say which ones](/learn/free-ynab-alternatives).

## Why "free" is credible here

A privacy promise you cannot verify is marketing. Three things make this one checkable:

1. **The source is published** under AGPL-3.0-or-later. The claim that your ledger is never uploaded is something you can read for yourself, not something you have to believe.
2. **The core has no server to pay for.** It is a file that runs in your browser. There is no per-user hosting cost that has to be recovered later by charging you or selling something.
3. **Revenue comes from Plus**, which is hosted AI, an encrypted vault and maintained bank import presets — additions, not the removal of a restriction. Export is never gated.

If Lithifyte disappeared tomorrow, the file you already have keeps working, and you can fork it.

## Optional AI, and what it is allowed to see

There is an AI co-pilot. It is off until you turn it on, per purpose — chat, categorising, PDF reading — and it can be pointed at a model running on your own machine, in which case nothing leaves the device at all.

When hosted AI is used, the model never produces a number. It works out what you meant; the calculation happens on your device; the answer is rendered from figures computed locally. What gets sent is the minimum slice a question needs, with account names aliased. Never the statement file.

## Getting started

Open [the sample dataset](https://app.lithifyte.com/demo) to see the whole app running on invented numbers with nothing to sign up for, or start with [your first transaction](/capturing-your-first-transaction). [How it works](/how-it-works) covers the mechanics; the [guide](/guide) covers importing your own statements; [security and privacy](/security-and-privacy) states the technical position without marketing language.
