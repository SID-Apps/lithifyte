# Contributing to Lithifyte

Two constraints are not negotiable:

1. **No feature may require sending financial data to a server in the clear.** Encrypted blobs the server cannot read (the Plus vault) are allowed. A finance backend is a different product.
2. **A shipped update must never destroy a user's data.** Snapshot, migrate, or refuse to run.

## Licence

This repository is AGPL-3.0-or-later. Opening a pull request accepts the [CLA](CLA.md) so SID Labs can keep offering a commercial licence of the Engine.

Do not send pull requests that add identity, billing, Stripe, admin tokens, or the AI relay. That code lives in a private repository and is not accepted here.

## How to work

The application is one file: `index.html`. After any edit:

- The self-test in the footer must stay green.
- Do not commit `*personal*.html`, feeder `config.json`, or `.dev.vars`.
- Regenerated sample: `node tools/make-demo.mjs`
- Marketing pages: edit `www/content/*.md`, then `node tools/build-site.mjs`

Issues and security reports: see [SECURITY.md](SECURITY.md).
