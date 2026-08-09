# Frequently asked questions

Source: https://lithifyte.com/faq
Updated: 2026-08-09
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

Short, direct answers. If a question you have is not here, the [guide](/guide) goes deeper and the [source code](https://github.com/SID-Apps/lithifyte) settles any argument about what the software actually does.

## Cost and licensing

### Is Lithifyte free?

Yes. The core application is free forever under the AGPL-3.0-or-later licence. There is no trial, no card, no feature held back behind a payment. Optional hosted conveniences may be sold later — things like scheduled email digests or backup sync — but the application that analyses your money is the free part and stays that way.

### What is the catch?

There is no advertising, no data sale and no lock-in, because there is no data on our side to sell and every store can be exported. The honest trade-off is different: Lithifyte does not connect to your bank for you by default, so you export a statement yourself. That is the price of nobody else holding your credentials.

### Can I use it commercially or modify it?

Yes, under the terms of the AGPL-3.0-or-later. You can read it, change it, run it and redistribute it. If you run a modified version as a network service, the licence requires you to offer that modified source to its users. See [open source](/open-source).

## Privacy and security

### Does Lithifyte see my bank data?

No. Financial data is parsed and stored in your browser and never transmitted. There is no finance backend to receive it — not an encrypted one, not a temporary one. The only personal datum any Lithifyte server holds is the email address you use for the magic-link sign-in on the hosted app.

### What happens if Lithifyte disappears tomorrow?

Your data is unaffected, because it was never on our infrastructure. Keep the `index.html` file and it keeps working offline, indefinitely, with no licence check to fail. This is the main practical argument for a single-file application.

### Is my data encrypted?

You can lock the app with a passphrase, which encrypts the stored data at rest using AES-GCM with a PBKDF2-derived key. Exported backups can be encrypted the same way. Without the lock, data sits in ordinary browser storage — protected by your device's own security, which is exactly as safe as your device is.

### Can someone else using my computer see my finances?

Anyone with access to your unlocked user account and browser profile can open the app, unless you have set a passphrase lock. Set one if the device is shared. Read [security and privacy](/security-and-privacy) for the full threat model, including the parts we cannot solve for you.

### Do you track me?

The hosted app records privacy-safe product events — that a section was opened, that an import happened — never amounts, merchants or any financial content. Self-hosted copies report nothing at all and have no code path that could. The details are in the [privacy policy](/privacy).

## Data and compatibility

### Which banks does it support?

Any bank that lets you export a statement, which is effectively all of them. Lithifyte reads CSV files and works out which columns hold dates, descriptions and amounts. If your bank's layout is unusual, the importer tells you which columns it used and counts every row it could not read, so a misread is visible immediately rather than showing up months later as a balance that makes no sense.

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
