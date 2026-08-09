# Security and privacy, in technical terms

Source: https://lithifyte.com/security-and-privacy
Updated: 2026-08-09
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

The claim is narrow and testable: your financial data is never transmitted, because there is no server that receives it. This page states exactly what that does and does not protect you from, including the parts we cannot fix.

## The architecture, stated plainly

Lithifyte is delivered as a single HTML file containing the interface and the entire calculation engine. When you import a statement, your browser reads the file from your disk and parses it in memory on your machine. The results are written to that browser's own storage.

There is no finance API. Not an encrypted one, not a temporary one, not one that "only processes and discards". The absence is the design: a service that never receives data cannot leak it, be subpoenaed for it, change its mind about it in a future privacy policy, or lose it in a breach.

You do not have to take this on faith. Open your browser's network tab and use the app. Nothing carrying financial content goes out.

## What is stored, and where

| Data | Location | Leaves your device? |
|---|---|---|
| Transactions, accounts, people, categories, rules | `localStorage` in your browser | No |
| Uploaded statement files, encrypted vault blob | IndexedDB in your browser | No |
| Budgets, goals, debts, holdings, assets, notes | `localStorage` in your browser | No |
| Backups you export | Wherever you save the file | Only if you move it |
| Your email address (hosted sign-in only) | Cloudflare KV, on our side | It is already ours to hold |
| Product events: section opened, import happened (hosted only) | Cloudflare KV, on our side | Names of features, never amounts |

Self-hosted copies write nothing to the last two rows. The code that reports product events checks the hostname and does not run from a file or from a domain that is not ours.

## Encryption at rest

The app can be locked with a passphrase. Locking encrypts the stored data using AES-GCM, with the key derived from your passphrase by PBKDF2 at 310,000 iterations. Exported backups can be encrypted the same way.

Two consequences worth being blunt about. First, the passphrase is not recoverable — there is no reset link, because there is nobody holding a copy to reset it against. Second, an unlocked app is plaintext in browser storage, protected only by your device's own security. If the device is shared, set a passphrase; if it is not, the lock mainly protects against someone who takes the machine.

## The threat model, honestly

**What this design defends against well.** A breach of our servers, because your finances are not on them. A change of ownership or business model, because there is no data asset to sell. Service shutdown, because the file keeps working offline. Silent scope creep, because the source is public and diffable.

**What it does not defend against.** Malware on your own device, which can read browser storage exactly as the app can. Someone with access to your unlocked machine. A malicious browser extension with permission to read page content — extensions run in the same context the app does. Physical theft of an unlocked device.

**The residual risk we treat as a bug.** Any script injection in the app's own origin could read your storage while unlocked, so cross-site scripting in stock Lithifyte is treated as a security vulnerability, not a cosmetic issue. Report one through [SECURITY.md](https://github.com/SID-Apps/lithifyte/blob/main/SECURITY.md).

## What the servers actually do

Three small Cloudflare Workers, all of them open source in the same repository:

- **The site** serves static pages. No account, no cookie required to read anything.
- **Sign-in** issues a magic link to your email address and sets a session cookie so the hosted app recognises you across devices. It handles identity, never finance. Rate-limited; tokens are single-purpose.
- **Digest mail** takes an email that your *browser* has already composed and posts it to a mail provider. The body is not stored. Amounts are masked by default, and you can uncheck that if you would rather they were not.

The endpoints exposed are sign-in, session, sign-out, product events, digest and health. There is deliberately no data endpoint, and adding one would be a design change requiring a rewrite of this page.

## Verifying any of this yourself

- **Read the file.** The application is one HTML file. Search it for `fetch(` and check every result.
- **Watch the network.** DevTools → Network, then import a statement. Nothing with your data in it is sent.
- **Pull the plug.** Turn off your network and keep using it. Everything except the optional sign-in check keeps working.
- **Diff the deployment.** The hosted file is byte-comparable with the one in the public repository.
- **Run the self-tests.** The app ships hundreds of behavioural checks that run in your browser, on your data, and show you the result.

## Data protection

Lithifyte is built in Ireland and the design is deliberately compatible with the GDPR principle of data minimisation: the lawful basis question is straightforward when the only personal data processed is an email address you volunteered for sign-in. You can request deletion of that address at any time, which removes everything we hold about you, because it is everything we hold about you.
