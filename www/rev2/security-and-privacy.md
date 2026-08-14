# Security and privacy, in technical terms

Source: https://lithifyte.com/security-and-privacy
Updated: 2026-08-14
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

The claim is narrow and testable: there is no finance backend, so statements are never stored by us. The one exception is hosted AI, which you consent to per lane and which sends only the slice that question needs — that is set out in full below, along with the parts we cannot fix.

## The architecture, stated plainly

Lithifyte is delivered as a single HTML file containing the interface and the entire calculation engine. When you import a statement, your browser reads the file from your disk and parses it in memory on your machine. The results are written to that browser's own storage.

There is no finance API. Not an encrypted one, not a temporary one, not one that "only processes and discards". The absence is the design: a service that never receives data cannot leak it, be subpoenaed for it, change its mind about it in a future privacy policy, or lose it in a breach.

You do not have to take this on faith. Open your browser's network tab and import a statement. Nothing carrying the file goes out.

**Three deliberate exceptions, all yours to consent to, all off until you act.**

The first is **hosted AI**. A language model cannot answer a question about your money without being told something about your money. That section is below, in full, because a privacy claim with a quiet asterisk is worse than no claim at all. The honest sentence is: **we never store your data, and when you ask the AI a question, the part needed to answer it is sent to the model provider for that request.** Commands-only and a local model send nothing.

The second is **exchange rates**, and it is far smaller. Press *Refresh rates* in Wealth → Currency and the app asks a public European Central Bank rate feed ([frankfurter.dev](https://api.frankfurter.dev/v1/latest)) for a plain list of reference rates. That request carries **no account, no balance, no transaction, and no identifier** — it is the same request any visitor to that site makes, and the reply is a table of numbers. It happens only when you press the button, never on load, and typing rates in by hand works offline and always has. We mention a request this small because the alternative is you finding it in the network tab and wondering what else went unmentioned.

The third is **update checks**, and only on a self-hosted copy — the hosted app is whatever we deployed, so there is nothing there for you to update. Turn it on and Lithifyte asks **GitHub**, once a week at most, whether a newer version has been published. It deliberately does not ask us: if the check came to lithifyte.com we would end up holding a log of every self-hosted install's address and version, which is exactly the count [we say we do not keep](/open-source). Asking GitHub means we learn nothing, and that is a stronger promise than "we only log a version".

If an update exists you are told, and nothing more happens until you press Download. The file is then fetched and its SHA-256 checked against the published manifest before you are offered it — **a mismatch refuses outright rather than warning**, because installing bytes we have not verified would be a hole we dug ourselves. Your data lives in the browser, not the file, so replacing the file keeps every transaction, budget and rule.

## What is stored, and where

| Data | Location | Leaves your device? |
|---|---|---|
| Transactions, accounts, people, categories, rules | `localStorage` in your browser | No |
| Uploaded statement files, encrypted vault blob | IndexedDB in your browser | No |
| Budgets, goals, debts, holdings, assets, notes | `localStorage` in your browser | No |
| Backups you export | Wherever you save the file | Only if you move it |
| Your email address (hosted sign-in only) | Cloudflare KV, on our side | It is already ours to hold |
| Product events: section opened, import happened (hosted only) | Cloudflare KV, on our side | Names of features, never amounts |
| Optional Plus vault (encrypted backup envelope) | Cloudflare KV, ciphertext only | Only if you press Cloud vault; we cannot decrypt it |
| Co-pilot conversations and sandbox scenarios | `localStorage` in your browser | Only the context of a message you send, and only to the model you chose — see below |
| Your currency, locale and exchange-rate table | `localStorage` in your browser | No. Refreshing rates sends a currency code, never a figure of yours |
| Your own tax assumptions, if you enter any | `localStorage` in your browser | No. They are never sent anywhere, including to the AI |
| Update-check preference and last-checked date | `localStorage` in your browser | No. The check itself goes to GitHub, never to us |

Self-hosted copies write nothing to the email or product-event rows. The code that reports product events checks the hostname and does not run from a file or from a domain that is not ours.

## The AI co-pilot, stated without spin

The co-pilot is a chat panel inside the app that can answer questions about your finances and operate the app for you. **Commands-only** works with no model at all. Lithifyte AI is the hosted convenience; a local model stays on your machine.

**What is sent, when you use hosted AI.** Not your ledger. Every request is assembled by one function (`Engine.minimise`) at one of three tiers:

| Tier | Leaves the device | Used for |
|---|---|---|
| Shape | merchant names and category names — no amounts, dates or balances | hosted categorisation |
| Aggregate | category totals, ratios, date range, account *aliases* (`acct_1`) | “how am I doing”, affordability |
| Detail | individual rows (date, merchant, amount) the user asked to see | “show me these transactions”, PDF parse after scrubbing |

Household notes are **not** sent on every turn. The model can ask for a scoped note. Real account names are replaced with aliases at the boundary. IBANs, emails and long account numbers are stripped. Settings shows a **disclosure log**: what left, when, to which provider, at which tier — never the prompt itself.

**Consent is per capability.** Chat, categorisation and PDF parse each ask once, and each can be revoked in Settings.

**Who receives it depends entirely on which model you chose:**

| Your choice | Where your context goes |
|---|---|
| Commands only | Nowhere |
| A local model — Ollama, LM Studio, any OpenAI-compatible endpoint on your machine | Nowhere. It stays on your computer. This is the private option |
| Your own API key — Anthropic, OpenAI, xAI (built, marked Coming soon in the picker) | To that provider, under your own account and their terms |
| **Lithifyte AI** (the hosted convenience) | Through our relay worker. The relay asks OpenRouter not to route to providers that store or train on inputs (`data_collection: deny`). If no such route can answer, it falls back to Cloudflare Workers AI rather than a training-allowed free model |

**What the relay is, and is not.** It is a pass-through: it forwards the request and returns the answer. It counts tokens to meter usage later. It does **not** store your ledger, the prompt, or the answer. It is not a step toward a finance database. If that ever changed it would be a different product and this page would say so.

**Free software, paid intelligence.** Import, categorise, budgets, forecasts, export and Commands-only stay free forever and self-hostable. Hosted conversational AI is the lane that costs real money per question and will be a subscription; export of *your* data is never gated.

**The rule that makes the answers trustworthy.** The model never produces a number. It decides what you are asking for, `Engine` computes the figures on your device, and the answer renders from those computed values. A model that could recall or calculate a euro amount would eventually state a wrong one, and one hallucinated figure discredits every real figure in the app.

**What to weigh before switching it on.** If your threshold is "no third party ever sees anything about my money", use a local model or leave the co-pilot off — both are fully supported and neither is a degraded mode. If you are comfortable with the same providers you already use elsewhere, the trade is ordinary and now explicit.

## Encryption at rest

The app can be locked with a passphrase. Locking encrypts the stored data using AES-GCM, with the key derived from your passphrase by PBKDF2 at 310,000 iterations. Exported backups can be encrypted the same way.

Two consequences worth being blunt about. First, the passphrase is not recoverable — there is no reset link, because there is nobody holding a copy to reset it against. Second, an unlocked app is plaintext in browser storage, protected only by your device's own security. If the device is shared, set a passphrase; if it is not, the lock mainly protects against someone who takes the machine.

## The threat model, honestly

**What this design defends against well.** A breach of our servers, because your finances are not on them. A change of ownership or business model, because there is no data asset to sell. Service shutdown, because the file keeps working offline. Silent scope creep, because the source is public and diffable.

**What it does not defend against.** Malware on your own device, which can read browser storage exactly as the app can. Someone with access to your unlocked machine. A malicious browser extension with permission to read page content — extensions run in the same context the app does. Physical theft of an unlocked device.

**The residual risk we treat as a bug.** Any script injection in the app's own origin could read your storage while unlocked, so cross-site scripting in stock Lithifyte is treated as a security vulnerability, not a cosmetic issue. Report one through [SECURITY.md](https://github.com/SID-Apps/lithifyte/blob/main/SECURITY.md).

## What the servers actually do

The Engine in the public repository is one file. The official host adds a small private Cloud next to it:

- **The site** serves static pages. No account, no cookie required to read anything.
- **Sign-in** issues a magic link (or Google) and sets a session cookie so the hosted app recognises you. Identity, never a ledger. Rate-limited; tokens are single-purpose.
- **Digest mail** takes an email that your *browser* has already composed and posts it to a mail provider. The body is not stored.
- **The AI relay** forwards a co-pilot request to the model provider and returns the answer. Pass-through only.
- **The encrypted vault** (Plus) stores a backup envelope you already encrypted in the browser. We do not have the passphrase and cannot read it.
- **Packs** (Plus) are bank column maps — how to read a given bank's export — delivered as a maintained update channel. They contain no tax figures, because Lithifyte ships none.

There is deliberately no endpoint that accepts a statement or a plaintext ledger. Adding one would be a different product and this page would say so. The Cloud workers are not published in the Engine repository.

## Verifying any of this yourself

- **Read the file.** The application is one HTML file. Search it for `fetch(` and check every result.
- **Watch the network.** DevTools → Network, then import a statement. Nothing with your data in it is sent. Do the same while using the co-pilot and you will see exactly what context each message carries — it is the same tab, and we would rather you looked.
- **Pull the plug.** Turn off your network and keep using it. Everything except the optional sign-in check and a remote co-pilot model keeps working.
- **Diff the deployment.** The hosted file is byte-comparable with the one in the public repository.
- **Run the self-tests.** The app ships hundreds of behavioural checks that run in your browser, on your data, and show you the result.

## Data protection

Lithifyte is built in Ireland and used worldwide, and the design is deliberately compatible with the GDPR principle of data minimisation. On our side we hold an email address, a plan/quota counter, privacy-safe event names, and — if you use Plus vault — an encrypted blob we cannot read. You can request deletion of that address at any time; we then delete the user record and any vault blob. We never had your ledger.
