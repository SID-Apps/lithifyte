# Lithifyte Immersive — Rev 2 (Claude Design Canvas)

Scroll-driven marketing experience exported from Claude’s Design Canvas
(`Lithifyte Immersive Rev2.dc.html` + `support.js`).

Rev 1 (Grok single-file landing) remains at [`../index.html`](../index.html).
This folder is **Rev 2** — a richer, interactive money-map canvas with sticky
chapters and force-directed nodes.

## What’s in the experience

| # | Chapter | Scene |
|---|---------|--------|
| 00 | Enter | First-person void → “Fly into your money map” |
| 01 | Living map | Approach: map grows as you scroll; nodes are draggable |
| 02 | Household | People, then accounts with balances |
| 03 | Merchants | Category hubs bloom into shops; transaction pulses on links |
| 04 | Goals & debts | Progress rings on goals; hollow debt nodes |
| 05 | Flow | Animated Sankey — €6,000 income splits by category |
| 06 | Privacy | Vault ring — bank data never leaves the browser |
| 07 | Dock | Demo + start account CTAs (sid-labs.com links) |

### Interaction (beyond Rev 1)

- Force-directed **Obsidian-style** node graph (home springs + link springs + light repulsion)
- **Hover tooltips** (label + amount) and **drag any node** (settles back on release)
- Scroll-linked **reveal** of map layers (core → people → accounts → hubs → merchants → goals/debts)
- Canvas **Sankey** that grows as you scroll the Flow chapter
- Chapter rail, top progress bar, mouse parallax, scanlines, reduced-motion fallback
- Design-canvas props (when opened in Claude): accent (Cyan/Mint/Magenta), star density, scanlines, mouse parallax

### Stack note

This is Claude **Design Canvas** format:

- `index.html` / `Lithifyte-Immersive-Rev2.dc.html` — `<x-dc>` template + `DCLogic` script
- `support.js` — dc-runtime (loads React 18 from unpkg, boots the canvas)

Needs a **local HTTP server** (file:// may block CDN React). Online preview needs network access for React UMD.

## Local preview

```bash
# from repo root — serve whole www so rev1 and rev2 are both reachable
python3 -m http.server 8787 --directory www
# Rev 2:  http://127.0.0.1:8787/rev2/
# Rev 1:  http://127.0.0.1:8787/
```

Or only this folder:

```bash
python3 -m http.server 8788 --directory www/rev2
# http://127.0.0.1:8788/
```

## CTAs (current)

| Control | Target |
|---------|--------|
| Demo | `https://lithifyte.sid-labs.com/demo.html` |
| Start account | `https://lithifyte.sid-labs.com/` |
| Source | `https://github.com/SID-Apps/lithifyte` |

Email waitlist / magic-link Worker is **not** wired in Rev 2 yet (Rev 1 has the form + `www/workers/` stub).

## Files

| File | Role |
|------|------|
| `index.html` | Servable copy of the canvas (same content as `.dc.html`) |
| `Lithifyte-Immersive-Rev2.dc.html` | Original export name (Design Canvas tooling) |
| `support.js` | Generated dc-runtime — do not hand-edit |
