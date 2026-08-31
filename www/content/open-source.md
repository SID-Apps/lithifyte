---
title: Open source, and why it matters here
shortTitle: Open source
slug: open-source
section: product
description: Lithifyte's Engine is AGPL-3.0-or-later. The calculator is one readable HTML file you can audit, fork, self-host and keep. Hosted Plus (AI, vault, bank presets) is a separate living product.
summary: A privacy promise you cannot verify is marketing. The Engine is published under AGPL-3.0-or-later as a single readable file, so the claim that we never store your ledger is something you can check. Official Lithifyte also sells hosted intelligence and maintained bank import presets — those are not required to run the file.
keywords: [open source budgeting app, AGPL finance software, self-hosted personal finance, auditable financial software]
updated: 2026-08-14
priority: 0.8
related: [security-and-privacy, how-it-works, budgeting-app, guide]
---

## The licence

Lithifyte is licensed **AGPL-3.0-or-later**. In practical terms:

- You may use it for anything, including commercially, at no cost.
- You may read, modify and redistribute it.
- If you distribute a modified version, your changes carry the same licence.
- If you run a modified version **as a network service**, you must offer that modified source to the people using it.

That last clause is the reason for choosing the AGPL over something more permissive. Anyone is free to host a fork; nobody is free to host a fork that quietly starts sending transactions somewhere while still looking like Lithifyte.

## Why auditability is the product

Every finance app claims to respect your privacy. The claims are indistinguishable from each other because they are all unverifiable — you cannot see what a server does with a payload after it arrives.

Lithifyte's claim is different in kind, not in degree: the code that touches your money runs on your machine, in a file you can open in a text editor. You can search it for network calls. You can watch the network tab while you use it. You can compare the hosted file against the public repository byte for byte.

This is also why the application is not minified or obfuscated. Every frontend ships readable code eventually; pretending otherwise would only make the honest reader's job harder.

## Self-hosting

There is no build step and no dependency tree.

1. Download `index.html` from [the repository](https://github.com/SID-Apps/lithifyte).
2. Open it — from your disk, a USB stick, a private server, whatever you like.
3. That is the whole procedure.

It runs offline. It reports nothing. The Engine, importer, map, budgets, forecast, wealth, export and Commands-only are the same as the hosted app. What you give up is the **living product**: magic-link / Google sign-in, Lithifyte Pro, the encrypted cloud vault, and the maintained library of bank import presets. Those are Lithifyte Plus on the official host. They are conveniences, not a lock on your numbers.

The project keeps no count of self-hosted installs. Telemetry is hostname-gated and does not run from a file.

## What is in the repository

| Path | What it is |
|---|---|
| `index.html` | The whole application: interface, engine, self-tests |
| `demo.html` | The sample household — invented data, isolated storage |
| `tutorial.html` | Long-form written guide with a retrieval-backed Ask box |
| `feeder/` | Optional open-banking feeder CLI and price fetcher |
| `tools/` | Release tooling — data swapping, sample generation, this site |
| `www/` | The marketing site (landing + money library) |
| `docs/` | Tutorial corpus, repo split, public analytics note |
| `COMMERCIAL-LICENSE.md` | How to license the Engine without AGPL obligations |
| `SECURITY.md` | Threat model, scope, and how to report a vulnerability |

Identity, billing, the AI relay and the vault are **not** in this repository. See [the repo split](https://github.com/SID-Apps/lithifyte/blob/main/docs/REPO-SPLIT.md).

## Self-tests as a trust mechanism

The application ships hundreds of behavioural checks that you can run yourself, in your browser, against your own data. They exist for the usual engineering reasons, but they serve a second purpose here: they let a stranger confirm the engine's arithmetic without reading the whole file or trusting the author.

An honest limitation, learned the hard way: a check that asserts on something a user is entitled to change will turn red on a perfectly healthy install, and a red self-test tells someone not to trust the numbers. Assertions are written against invariants, not preferences.

## Contributing

Issues and pull requests are welcome at [github.com/SID-Apps/lithifyte](https://github.com/SID-Apps/lithifyte). Read [CONTRIBUTING.md](https://github.com/SID-Apps/lithifyte/blob/main/CONTRIBUTING.md). Two constraints are not negotiable:

- **No feature may require sending financial data to a server in the clear.** An encrypted vault blob the server cannot read is allowed. A finance backend is a different product.
- **A shipped update must never destroy a user's data.** There is no server-side copy of the ledger to restore from.

A commercial licence of the Engine (white-label, closed embed) is [documented separately](/commercial). Security reports go through `SECURITY.md` rather than a public issue.
