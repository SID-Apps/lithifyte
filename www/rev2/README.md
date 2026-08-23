# Lithifyte Immersive — Rev 2 (Claude Design Canvas)

Scroll-driven marketing experience exported from Claude’s Design Canvas
(`Lithifyte Immersive Rev2.dc.html` + `support.js`).

Rev 1 (Grok single-file landing) remains at [`../index.html`](../index.html).
This folder is **Rev 2** — a richer, interactive money-map canvas with sticky
chapters and force-directed nodes.

## What’s in the experience

| # | Chapter | Scene |
|---|---------|--------|
| 00 | Enter | Release badge, one-line pitch, sample + sign-in |
| 01 | **Ask** | Co-pilot job replay: six question chips, one device panel, real answers |
| 02 | **Proof** | Four preview plays — scripted clips of the product being used |
| 03 | Living map | Approach: map grows as you scroll; nodes are draggable |
| 04 | Household | People, then accounts with balances |
| 05 | Merchants | Category hubs bloom into shops; transaction pulses on links |
| 06 | Goals & debts | Progress rings on goals; hollow debt nodes |
| 07 | Flow + inside the app | Animated Sankey, then horizontal frames (budgets → goals → debts → holdings → crypto) |
| 08 | Privacy | Vault scene — statements stay on the device; hosted AI is optional |
| 09 | Price | €0 core, forever |
| 10 | Inside | What the single file contains |
| 11 | Enter | Sample + sign-in CTAs + footer (no extra scroll past this page) |

Ask and Proof open the tour: the argument now lands before the map tour rather
than after it. Because chapters move, the canvas camera is keyed by each
section's `data-scene`, never by its index — an index-keyed switch points every
scene at the wrong camera the moment anything is reordered.

**Type.** The page is set in **Geist** (`--fd`) with **Geist Mono** (`--fm`) for
tabular numbers and small labels, both from Google Fonts, falling back to
`system-ui` / `ui-monospace`. `page.css` carries the same pair for the content
pages, so the landing and the library match.

**Ask (01)** and **Proof (02)** are driven by one plain 50ms interval in a
`<script>` at the end of `index.html` — deliberately outside the React runtime,
like the mobile menu, because the runtime re-renders the body and would detach
anything bound at load. The opening Ask thread ships already revealed in the markup and its clock
starts at that thread's last cue, so arriving at the section shows a finished
answer rather than an empty panel filling in while the page boots; every later
thread, and any chip a visitor clicks, animates. All their markup is static; the driver only toggles
classes and keeps its clock in `data-` attributes. The clock is anchored to
`Date.now()`, not accumulated from the interval delta: these clips now start
while the page is still booting React and settling the force layout, and an
accumulated clock turned that jank into a slow first play. Proof is the one
chapter that is **not** pinned: four players do not fit a 900px viewport, and
it carries no `[data-copy]`, which is what opts a chapter out of the scroll fade.

**Scroll rhythm.** Chapters are ~1.2–1.4 viewports, not the 1.7–2.2 they were:
a pinned screen that holds for a full extra viewport after its copy has landed
reads as a pause, not as pacing. The whole page is ~19 viewports (was ~26). The
in-app slide (07) compresses its horizontal travel at `RATE = 0.36` — six
full-width frames are 500vw of track, and mapping that 1:1 onto scroll cost
four viewports of dragging on its own. The copy fade-out is measured in pixels
of scroll (`fadePx`), not as a fixed share of the section, so short chapters
hand over instead of blinking. Ask (01) carries no `[data-copy]` at all: it
stays pinned and slides away under the header as Proof arrives, which is why
the header background has to cover rather than tint.

### Interaction (beyond Rev 1)

- **Product-style money map**: household → people → accounts → category hubs → merchants; goals with progress rings; hollow debts
- Force layout matches the app (repulsion + link rest lengths + capped collision + center gravity + **alpha cooling**) — settles instead of jittering
- **Hover tooltips** and **drag** free nodes (soft kick to re-settle on release)
- Scroll-linked **reveal** tiers (core → people/accounts → hubs → merchants → wealth)
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
| Sample | `https://app.lithifyte.com/demo` (`demo.html`) |
| Start account | `https://app.lithifyte.com/` |
| Source | `https://github.com/SID-Apps/lithifyte` |

Email waitlist / magic-link is handled by the private Cloud (`access.lithifyte.com`), not this marketing tree.

## Files

| File | Role |
|------|------|
| `index.html` | Servable copy of the canvas (same content as `.dc.html`) |
| `Lithifyte-Immersive-Rev2.dc.html` | Original export name (Design Canvas tooling) |
| `support.js` | Generated dc-runtime — do not hand-edit |
