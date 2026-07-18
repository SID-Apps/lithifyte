# Security policy — Lithifyte

Lithifyte is a **single-file, client-only** household finance app for your **bank data**. There is **no finance backend**: statements, balances, merchants and goals stay in **your browser** (and in backup files **you** export). The **hosted** product at `app.lithifyte.com` uses a separate **identity + privacy-safe product analytics** Worker (`access.lithifyte.com`) — email sign-in and allowlisted usage events only. Self-hosted / downloaded copies send nothing.

This document describes the threat model, what we protect, what we do not, and how to report a vulnerability.

## Supported versions

| Build | Support |
|---|---|
| Latest `main` / tagged releases (e.g. `v1.0` when published) | Security fixes applied here |
| Personal forks / modified copies | Your responsibility; please report upstream if the issue is in stock Lithifyte |
| Hosted sample (`/demo`) | Same code as the blank shell; uses invented data and separate browser storage (`-demo` key suffix) |

## Privacy promise (baseline)

- The HTML page **does not** implement a server API for your finance data.
- Core computation runs entirely in the browser from statements you upload (or from an optional local feeder that writes CSVs on **your** machine).
- Default durability is **export/import backups** you control; optional **encrypted** backups and an opt-in **at-rest lock** use Web Crypto.
- The public product default for AI categorisation is a **model you run** (e.g. Ollama / LM Studio). Pointing the card at a remote endpoint is a user choice and is not required to use the app.
- **Hosted-only:** magic-link email identity and **allowlisted product events** (section opens, onboarding steps, “CSV uploaded” flags — never amounts or merchants). See `docs/product-analytics.md` and the privacy policy.

You can audit this by reading the single HTML file, `www/workers/access.js`, and watching the network tab while using the app.

## Threat model

### In scope (we care about these)

| Threat | Notes / mitigations |
|---|---|
| **Stolen or shared machine** | Opt-in at-rest lock: browser stores are sealed in an encrypted vault blob (`dd-vault-v1`) until a passphrase is entered. UI privacy mode can mask € amounts on screen. |
| **Backup file left on disk / email** | Optional encrypted export (`household-finance-backup-encrypted`) using **AES-GCM** with a key derived via **PBKDF2-SHA-256** (default **310 000** iterations). Plain JSON backups are readable by design — encrypt if the file may leave a trusted disk. |
| **Forgotten passphrase** | **There is no recovery.** If you lose the passphrase for an encrypted backup or the at-rest lock, that data cannot be decrypted. Stated in the product UI. Keep a plain export offline if you need a recovery path. |
| **Malicious or hostile CSV** | Statement upload is local parsing only. Treat untrusted files as untrusted input; do not open CSVs from strangers on a machine that already holds real household data. |
| **Modified / supply-chain HTML** | The file is fully readable source. Prefer official releases from this repository or your own verified copy. Hosting a modified fork is allowed under AGPL but you should trust the host. Integrity self-test (~100 checks) fails closed on behavioural regressions after edits. |
| **XSS in the page context** | Any script injection in the same origin as the app can read localStorage/IndexedDB while unlocked. We treat XSS in stock Lithifyte as a **security vulnerability**. Keep third-party script out of the file; do not inject untrusted HTML into the document. |
| **Feeder credentials** | `feeder/config.json` and `feeder/state.json` grant bank-data API access and are **gitignored**. Treat them like a bank-statement drawer. The HTML app never holds bank login credentials. |
| **Sample vs real data on the same origin** | Hosted sample sets `demo: true`, which namespaces all storage keys with a `-demo` suffix so sample play cannot overwrite real data on `lithifyte.sid-labs.com`. |

### Out of scope / residual risk (honest limitations)

| Risk | Why |
|---|---|
| **Physical access while unlocked** | If the tab is open and the vault is unlocked (or lock is off), the OS user can read memory/storage. Lock the vault or close the tab on shared machines. |
| **Browser extensions** | Extensions with page access can see DOM and storage. Use a clean profile for sensitive data if that matters to you. |
| **Hosted page calling local services** | Browsers block most cross-origin calls from a hosted origin to `localhost` — by design. Local-file open enables optional CoinGecko crypto refresh and local-LM calls. |
| **User-configured remote LM endpoint** | If you set the AI categoriser to a remote URL (and optional API key), **merchant text you submit leaves the browser**. The public default remains local-only; do not enable remote assist unless you accept that trade-off. |
| **GoCardless / PSD2 aggregator** | The optional feeder talks to a regulated bank-data API. That is outside the HTML file; protect feeder secrets and revoke consent when done. |
| **Tax / advice accuracy** | Fiscal parameters are dated estimates for planning, not legal advice. Not a security boundary, but do not treat numbers as certified. |
| **Denial of service / malicious multi-megabyte uploads** | Browser-side resource limits; no multi-tenant server to protect. |

## Cryptography (what we actually use)

| Use | Algorithm |
|---|---|
| Encrypted backups | AES-GCM, key from PBKDF2-SHA-256 (default 310 000 iterations; envelopes store their own KDF params for forward compatibility) |
| At-rest lock | Same envelope style; all `dd-*` stores sealed in one vault blob (IndexedDB when available) |
| Password recovery | **None** — by design |

There is no custom “home-grown” cipher. Implementation lives in the single HTML file (search for `PBKDF2` / `AES-GCM`).

## Reporting a vulnerability

Please **do not** open a public issue for security-sensitive reports (e.g. XSS that exposes vault data, crypto misuse, feeder secret leakage in published artifacts).

### Preferred path

1. Use **[GitHub Private Vulnerability Reporting](https://github.com/SID-Apps/lithifyte/security/advisories/new)** for this repository (Security → Advisories → Report a vulnerability), **or**
2. If private reporting is unavailable, open a **minimal** public issue titled `Security: request contact` **without** exploit detail, and wait for a maintainer to move the conversation to a private channel.

### What to include

- Affected URL or file revision (commit hash / tag)
- Description of the issue and impact (what data is exposed, under what assumptions)
- Minimal reproduction steps
- Whether you have a fix or mitigation in mind

### What to expect

- Acknowledgement when a maintainer is available
- Coordination on disclosure timing for high-impact issues
- Credit in release notes if you want it (say so in the report)

We do not currently run a paid bug bounty.

## Maintainer checklist (when changing the app)

- Never commit personal finance data, feeder `config.json` / `state.json`, or API keys
- Keep `.gitignore` guards intact (`*personal*.html`, feeder secrets, `feeder/out/`)
- New browser stores must join backup export/import and the at-rest vault path
- Self-test must stay green before release; do not ship a red self-test
- Optional network features (quotes, LM) must remain **user-triggered** and documented

## Related documents

- [README.md](README.md) — product overview and privacy promise
- [LICENSE](LICENSE) — AGPL-3.0-or-later
- [feeder/README.md](feeder/README.md) — bank sync / quotes CLI (secrets stay local)

---

Copyright © 2026 the Lithifyte project (SID Labs).
