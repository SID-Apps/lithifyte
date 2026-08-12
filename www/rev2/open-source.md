# Open source, and why it matters here

Source: https://lithifyte.com/open-source
Updated: 2026-08-09
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

A privacy promise you cannot verify is marketing. Lithifyte is published under the AGPL-3.0-or-later as a single readable file, so the claim that we never store your ledger — and that hosted AI only receives the slice a question needs — is something you can check rather than something you have to believe.

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

It runs offline. It reports nothing. It is the same file the hosted app serves, not a reduced version, and the hosted app has no features the file lacks. The only thing you give up is the magic-link sign-in that lets the hosted copy recognise you across devices — which is identity plumbing, not functionality.

The project deliberately keeps no count of self-hosted installs. There is no telemetry to strip out because there is none to begin with.

## What is in the repository

| Path | What it is |
|---|---|
| `index.html` | The whole application: interface, engine, self-tests |
| `demo.html` | The sample household — invented data, isolated storage |
| `tutorial.html` | Long-form written guide with a retrieval-backed Ask box |
| `feeder/` | Optional open-banking feeder CLI and price fetcher |
| `tools/` | Release tooling — data swapping, sample generation, this site |
| `www/` | The marketing site and the Cloudflare Workers behind sign-in |
| `docs/` | Product analytics spec, email digest spec, tutorial corpus |
| `SECURITY.md` | Threat model, scope, and how to report a vulnerability |

## Self-tests as a trust mechanism

The application ships hundreds of behavioural checks that you can run yourself, in your browser, against your own data. They exist for the usual engineering reasons, but they serve a second purpose here: they let a stranger confirm the engine's arithmetic without reading the whole file or trusting the author.

An honest limitation, learned the hard way: a check that asserts on something a user is entitled to change will turn red on a perfectly healthy install, and a red self-test tells someone not to trust the numbers. Assertions are written against invariants, not preferences.

## Contributing

Issues and pull requests are welcome at [github.com/SID-Apps/lithifyte](https://github.com/SID-Apps/lithifyte). Two constraints shape what can be accepted, and they are not negotiable:

- **No feature may require sending financial data to a server.** Not for convenience, not for AI, not for sync. If it needs a server, it needs a different product.
- **A shipped update must never destroy a user's data.** There is no server-side copy to restore from, so the upgrade path — snapshot, migrate, or refuse to run — is the entire safety net.

Security reports go through the process in `SECURITY.md` rather than a public issue.
