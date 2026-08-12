---
title: Frequently asked questions
shortTitle: FAQ
slug: faq
section: product
schema: faq
description: Direct answers about Lithifyte — what it costs, where your data lives, which banks work, whether it can see your money, and how it compares to a spreadsheet or a bank-linked app.
summary: Short, direct answers. If a question you have is not here, the [guide](/guide) goes deeper and the [source code](https://github.com/SID-Apps/lithifyte) settles any argument about what the software actually does.
keywords: [Lithifyte FAQ, private budgeting app questions, is my bank data safe, free budgeting software]
updated: 2026-08-12
priority: 0.9
related: [how-it-works, security-and-privacy, open-source]
---

## Cost and licensing

### Is Lithifyte free?

The application that analyses your money is free forever under the AGPL-3.0-or-later licence: import, categorise, budgets, forecasts, the map, Commands-only co-pilot, and full export. Hosted Lithifyte AI is the paid lane — 7 days unlimited after you sign in, then 20 questions a week on Free, or unlimited on Plus (€9/month or €90/year). Your own model (Ollama, a fine-tuned Qwen, any compatible URL) is always free. We never gate export of your data.

### What is the catch?

There is no advertising, no data sale and no lock-in, because there is no data on our side to sell and every store can be exported. The honest trade-off is different: Lithifyte does not connect to your bank for you by default, so you export a statement yourself. That is the price of nobody else holding your credentials.

### Can I use it commercially or modify it?

Yes, under the terms of the AGPL-3.0-or-later. You can read it, change it, run it and redistribute it. If you run a modified version as a network service, the licence requires you to offer that modified source to its users. See [open source](/open-source).

## Privacy and security

### Does Lithifyte see my bank data?

We never store your statements. There is no finance backend. The hosted app holds the email you sign in with (Google or magic link), a plan/quota counter, and privacy-safe product events.

The exception is hosted AI. When you ask Lithifyte AI a question, **the slice that question needs** is sent to the model provider for that request — not the ledger. Notes are not dumped wholesale; account names are aliased. Commands-only and a local/your-own model send nothing. Optional Google Drive backup writes an encrypted snapshot to a private app folder only this app can see. See [security and privacy](/security-and-privacy).

### What happens if Lithifyte disappears tomorrow?

Your data is unaffected, because it was never on our infrastructure. Keep the `index.html` file and it keeps working offline, indefinitely, with no licence check to fail. This is the main practical argument for a single-file application.

### Is my data encrypted?

You can lock the app with a passphrase, which encrypts the stored data at rest using AES-GCM with a PBKDF2-derived key. Exported backups can be encrypted the same way. Without the lock, data sits in ordinary browser storage — protected by your device's own security, which is exactly as safe as your device is.

### Can someone else using my computer see my finances?

Anyone with access to your unlocked user account and browser profile can open the app, unless you have set a passphrase lock. Set one if the device is shared. Read [security and privacy](/security-and-privacy) for the full threat model, including the parts we cannot solve for you.

### Do you track me?

The hosted app records privacy-safe product events — that a section was opened, that an import happened — never amounts, merchants or any financial content. Self-hosted copies report nothing at all and have no code path that could. The details are in the [privacy policy](/privacy).

### What is the AI co-pilot, and do I have to use it?

It is a chat panel inside the app, opened with Ctrl/Cmd+K. You can ask about your money in plain language, have it open any section for you, and design a budget or goal in a **sandbox** that changes nothing until you press Apply. Commands-only works with no model. Hosted Lithifyte AI is optional and metered.

### Which AI models can I use?

**Lithifyte AI** (hosted, metered); **your own model** via an OpenAI-compatible URL (Ollama, LM Studio, a fine-tuned Qwen — this is how we will swap the hosted brain later); or Commands-only. Grok / ChatGPT / Claude BYOK is built at the relay and marked Coming soon in the picker. A local or self-hosted model is the option where nothing about your finances leaves your machine.

### Can the AI make up numbers?

No, by construction. The model resolves what you are asking for, the `Engine` computes the figures on your device, and the answer renders from those computed values. The model is not permitted to recall or calculate a euro amount — one hallucinated figure would discredit every real figure in the app.

### Can the AI change my data without asking?

No. Budgets, goals and forecasts it designs live in a sandbox alongside your real data, and nothing is written until you press Apply. Conversations and scenarios are kept like notes — re-openable, linkable, and included in your backups.

## Data and compatibility

### Which banks does it support?

Any bank that lets you export a statement, which is effectively all of them. Lithifyte reads CSV, tab- and semicolon-separated files, Excel `.xlsx`, and text-layer PDFs — parsed in your browser. You can also pick a file you already saved in Google Drive. Scanned (image-only) PDFs are not supported yet.

Press **Prepare & preview** and it works out which column is which, shows you every finished transaction beside your raw file, and lets you correct any decision it got wrong — date order, decimal mark, which column is money in, which rows to hold back. Known exports are recognised outright; a Revolut statement maps in one click. Where the file carries a running balance it walks it, which *proves* the mapping was read correctly rather than assuming, and offers the opening balance it can derive. Nothing is saved until you approve the preview, and no row is ever dropped in silence.

### Can it connect to my bank automatically?

There is a separate open-banking feeder tool in the repository, built against the GoCardless Bank Account Data API, but new signups for that API have been unavailable since July 2026, so statement import is the supported path. It is also the more private one: no third party ever holds a credential.

### Will it work with a joint account, or two people?

Yes. Households, people and accounts are first-class in the model. You can see a category's spending split by person, and money moving between two people's accounts is recognised as a transfer rather than counted as income for one and spending for the other.

### Does it handle more than one currency?

Balances and reporting are single-currency per household. Investments and crypto holdings are converted into that currency for the net-worth figure. A statement carrying multiple currencies can be filtered to one during import.

### Can I get my data out?

Yes, at any time, in several formats: a full JSON backup of every store, scoped CSV and Excel exports, and encrypted backup files. No export is gated.

## Using it

### How long does setup take?

About fifteen minutes for a useful picture: name the household, add an account, drop in a statement, and glance through the categories. The forecast gets meaningfully better once you have roughly six months of history, because that is when recurring bills and seasonal patterns become visible.

### How much history should I import?

Twelve months if you can, so a full year of annual bills — insurance, motor tax, subscriptions that renew yearly — appears in the data. Anything shorter and the forecast will be blind to them.

### It categorised something wrong. What now?

Fix it once, then write a rule from the merchant name so it stays fixed. Rules support wildcards and amount ranges. There is also an optional local AI categoriser that suggests categories using a model you run yourself; it only ever suggests, and you approve.

### Do I need to be good with spreadsheets?

No, and that is rather the point. A spreadsheet makes you build the model; Lithifyte builds it and lets you interrogate it. If you like spreadsheets, everything exports to one.

### Does it work on a phone?

It runs in a mobile browser, and the pages adapt, but the map and the denser planning views are designed for a larger screen. A dedicated mobile build is an open question rather than a promise.

### Is there an app for iPhone or Android?

No native app. It is a web page, which is what allows it to be auditable and to run offline from a file you keep.

## Comparisons

### How is this different from a bank-linked budgeting app?

Those apps hold a copy of your transactions on their servers, which is what makes automatic syncing and shared features possible. It also makes them a target, gives them a commercial interest in your data, and means your access depends on their continued existence. Lithifyte gives up automatic syncing and gets independence in return. Both are legitimate trades — this one is simply rarely offered.

### How is it different from a spreadsheet?

A spreadsheet is only as good as the model you build in it, and most people's models quietly rot. Lithifyte brings the model — transfer matching, merchant normalisation, recurring detection, amortisation, pace-based budgeting — and applies it consistently. You still own the numbers, and you can still export them to a spreadsheet.

### Is it suitable for a business?

It is built for a household. Sole traders sometimes use it for a simple picture of a single account, but it has no invoicing, VAT handling or double-entry bookkeeping, and it is not intended as accounting software.

### Is Lithifyte giving me financial advice?

No. It describes what your money did and computes what follows arithmetically from that. It does not recommend products, providers or courses of action, and the [learn library](/learn) is written as education rather than advice.
