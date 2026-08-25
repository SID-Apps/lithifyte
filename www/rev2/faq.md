# Frequently asked questions

Source: https://lithifyte.com/faq
Updated: 2026-08-25
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

Short, direct answers. If a question you have is not here, the [guide](/guide) goes deeper and the [source code](https://github.com/SID-Apps/lithifyte) settles any argument about what the software actually does.

## Cost and licensing

### Is Lithifyte free?

The application that analyses your money is free forever under the AGPL-3.0-or-later licence: import, categorise, budgets, forecasts, the map, Commands-only co-pilot, and full export. Hosted Lithifyte AI is the paid lane — 7 days unlimited after you sign in, then 20 questions a week on Free, or unlimited on Plus (€9/month or €90/year). Your own model (Ollama, a fine-tuned Qwen, any compatible URL) is always free. We never gate export of your data.

### What is the catch?

There is no advertising, no data sale and no lock-in, because there is no data on our side to sell and every store can be exported. The honest trade-off is different: Lithifyte does not connect to your bank for you by default, so you export a statement yourself. That is the price of nobody else holding your credentials.

### Can I use it commercially or modify it?

Yes, under the AGPL-3.0-or-later: read it, change it, run it, redistribute it. If you run a modified version as a network service, you must offer that modified source to its users. Organisations that need to embed the Engine in a closed product can buy a [commercial licence](/commercial). The Lithifyte name is not included. See [open source](/open-source).

## Privacy and security

### Does Lithifyte see my bank data?

We never store your statements. There is no finance backend. The hosted app holds the email you sign in with (Google or magic link), a plan/quota counter, and privacy-safe product events.

The exception is hosted AI. When you ask Lithifyte AI a question, **the slice that question needs** is sent to the model provider for that request — not the ledger. Notes are not dumped wholesale; account names are aliased. Commands-only and a local/your-own model send nothing. Optional Google Drive backup writes an encrypted snapshot to a private app folder only this app can see.

A **photographed statement or receipt** is a second exception, and only if you ask for it. The page image is read on a GPU we run (or on a model you run), not stored, and checked before you confirm — statements against their own totals, receipts for a shop, date and amount paid. Hosted reading is five pages for free, then Plus. Start from [Capture your first transaction](https://app.lithifyte.com/?capture=1). The notice the app asks you to tick is published at [Photographing a bank statement](/photographing-statements). See also [security and privacy](/security-and-privacy).

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

**Lithifyte Pro** (hosted Qwen 3.8 on our GPU, the default); **Lithifyte AI** (hosted Grok); **your own model** via an OpenAI-compatible URL (Ollama, LM Studio, any compatible URL); or Commands-only. ChatGPT / Claude BYOK is built at the relay and marked Coming soon in the picker. A local or self-hosted model is the option where nothing about your finances leaves your machine.

### Can the AI make up numbers?

No, by construction. The model resolves what you are asking for, the `Engine` computes the figures on your device, and the answer renders from those computed values. The model is not permitted to recall or calculate a euro amount — one hallucinated figure would discredit every real figure in the app.

### Can the AI change my data without asking?

No. Budgets, goals and forecasts it designs live in a sandbox alongside your real data, and nothing is written until you press Apply. Conversations and scenarios are kept like notes — re-openable, linkable, and included in your backups.

## Data and compatibility

### Which banks does it support?

Any bank that lets you export a statement, which is effectively all of them. Lithifyte reads CSV, tab- and semicolon-separated files, Excel `.xlsx`, and text-layer PDFs — parsed in your browser. You can also pick a file you already saved in Google Drive.

A **scanned (image-only) PDF or a phone photo** is a different path: you agree first, a vision model copies the print, and code checks the statement’s own totals before you confirm. Five hosted pages free, then Plus. A till receipt uses the same camera for shop, date and amount paid. How-tos: [Capture your first transaction](/capturing-your-first-transaction), [Photographing a bank statement](/photographing-statements), [Logging a receipt](/logging-receipts).

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

### How do I photograph a statement from my computer?

Choose **Take a photo**. A QR appears. Scan it with your phone, fill the frame, send. The phone does not sign in. The JPEG sits in a ten-minute slot and is deleted after this tab collects it. Full notice: [Photographing a bank statement](/photographing-statements).

### How do I log a till receipt?

**Log a receipt** (Capture chooser, People, or chat ＋). One photo of the slip. Confirm shop, date and total. It lands in a Receipts cash account. [Logging a receipt](/logging-receipts).

### If I sign out and into another account on this computer, do I see the same data?

No. On the hosted app each sign-in keeps its own household in this browser. A new account starts empty (the welcome drop zone). The previous account’s data stays on this computer under that email — it is not uploaded to us. A passphrase lock is still the right move on a shared device.

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

### Does Lithifyte know my country's tax rules?

No, and it deliberately does not try. **Lithifyte ships no tax rates for any country.** Tax differs by country and by person and changes most years, so a statutory figure baked into a file you keep for three years is a wrong number wearing an authoritative face.

What the app does instead is arithmetic on rates *you* supply. Under **Wealth → Your tax assumptions** you can enter your own capital-gains rate, any annual exemption, a separate rate for funds, tax on savings interest, and pension relief. Enter them and the relevant calculators appear, labelled as your figures. Leave them blank and those calculators stay hidden — the app shows you no tax numbers at all rather than guessed ones.

Two things worth knowing. A rate of **0 is a real answer**, not the same as leaving a field blank, so if gains are untaxed where you live you can enter 0 and get genuine zero-tax arithmetic. And real tax rules involve holding periods, loss relief, wrappers and allowances that a rate alone cannot capture — so treat the output as a rough sketch on your own assumptions and check anything that matters with your own tax authority or an adviser.

### How do I know when there is a new version?

If you use the hosted app, you are always on the current one — we deploy it.

On a self-hosted copy, **Settings → Updates** offers a weekly check. It is off until you turn it on, and it asks **GitHub**, not us, so we never learn that your copy exists. When an update is published you are told what changed; pressing Download fetches the file and verifies its SHA-256 against the published manifest before handing it to you, and refuses outright if they do not match.

Your data is in your browser, not in the file, so replacing the file keeps everything. If a version changes how data is stored you are warned before you take it, and Lithifyte snapshots your data before migrating — though exporting a backup first is still the sensible habit.

### Does it work outside Ireland?

Yes. Nothing in the Engine depends on where you live. You set your currency and number format once — including formats most software gets wrong, such as the Indian lakh grouping (`1,23,456`) — and every screen follows. Exchange rates are built in, with a converter and optional live reference rates, plus manual entry for currencies the public feed does not carry.

The importer reads any bank's CSV or Excel export through the column mapper, handles both `1,234.56` and `1.234,56`, and asks you which way round the dates are when a file is genuinely ambiguous rather than guessing. Merchant names in any script are fine. The parts that are unavoidably local — which bank exports have a one-click preset — are the ones we keep adding to.
