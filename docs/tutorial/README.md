# Lithifyte tutorial & Ask RAG

Webhosted guide for new users, plus the knowledge corpus that powers **Ask**.

| Asset | Path | Role |
|---|---|---|
| **Hosted tutorial** | [`/tutorial`](../../tutorial) | Journey UI, section notes, Ask panel |
| **RAG corpus** | [`docs/rag/chunks.json`](../rag/chunks.json) | 40+ feature chunks (id, order, phase, location, body, tags, selectors) |
| **Tour definition** | [`docs/tutorial/tour.json`](tour.json) | Same order + CSS selectors for a future in-app spotlight |
| **Live URL** | https://lithifyte.sid-labs.com/tutorial.html | Cloudflare Pages (static) |

## Design principles

1. **Opt-in** — never blocks first-run onboarding; user opens Tutorial when they want it.
2. **Order of use** — not alphabetical: start → name → account → CSV → goal → clean data → understand → plan → wealth → backup.
3. **Location always stated** — every chunk has a `location` (Space dock path + Classic section) and optional `selectors` for highlighting later.
4. **One corpus, two consumers** — tutorial page renders chunks; Ask retrieves the same JSON.
5. **No household data in the corpus** — public, shippable, AGPL-safe.
6. **Ask is product help, not a CFO** — never invent the user’s balances; point them at Goals / Forecast / etc.

## Phases (order of use)

| Phase | What the user does |
|---|---|
| 0 Start | What Lithifyte is, sample option, Space vs Classic, dock map |
| 1 Onboarding | Name → account kind → CSV → goal (map lights up) |
| 2 Explore | Map controls, range/search, cash HUD, privacy |
| 3 Data | People, balances, transfers, audit, rules, merchants, optional AI categoriser |
| 4 Understand | Cashflow, Sankey, categories, leaks |
| 5 Plan | Goals deep, link pot, budget, forecast, simulator, plan cards |
| 6 Wealth | Pulse, net worth, debts, invest, Irish schemes, readiness |
| 7 Ops | Backup/lock, self-test, feeder CLI, classic view |
| 8 Meta | How tutorial/Ask work |

## Ask + RAG architecture

```
User question
    │
    ▼
┌───────────────────┐
│ Sparse retrieve   │  token overlap on title/tags/body/id
│ docs/rag/chunks   │  (tutorial.html today)
└─────────┬─────────┘
          │ top-k chunks
          ▼
┌───────────────────┐     optional
│ Extractive answer │ ────────────► Local OpenAI-compatible LM
│ (always works)    │   context = chunks, system = product guide
└───────────────────┘   (Ollama / LM Studio / future qwen gateway)
```

### Later upgrades (not required for v1 tutorial)

- Dense embeddings (e.g. local `nomic-embed`) over `title + body`
- In-app Ask dock panel loading the same `chunks.json`
- In-app guided tour: read `tour.json`, spotlight `selectors`, advance steps
- Shared LM endpoint prefs with the categoriser card (`dd-lm-v1`)

### System prompt contract (for any LM head)

- Answer only from supplied chunks; cite `id`s.
- No invented euro figures for the user’s household.
- Prefer “open Budget in Planning → …” location language.
- Refuse out-of-scope (tax legal advice beyond the in-app estimates disclaimer).

## In-app Space tour (shipped)

Live inside **Space view** (not only the hosted HTML guide):

| Entry | Action |
|---|---|
| Floating **📘 Tour** (bottom-left in Space) | Start full playthrough |
| Settings → **▶ Guided Space tour** | Same |
| `window.__ddTour.start()` / `.startPart(n)` | Programmatic (tests) |

**7 parts** (user can jump to any): Space shell · First data · Look around · Clean data · Understand · Plan · Wealth & backup.

Each step: opens the real dock panel / mini tool, **spotlights** the control (outline pulse), **fades** the rest of the viewport (four shade rects + hole ring), **arrow** from the coach card to the feature, **Next / Back / End**, keyboard ←/→/Esc.

Implementation lives in the single HTML shell (`SpaceTour`); hosted `/tutorial` remains the long-form + Ask RAG companion.

## In-app spotlight (tour.json — content source / future parity)


`tour.json` steps include CSS selectors already present in the shell (`#onboarding`, `#sec-budget`, `#pulseCard`, …). A small runtime can:

1. `opt-in` from Settings → “Show tutorial”
2. For each step: `document.querySelector(sel)`, draw a cutout mask, show `title`/`body`
3. Space view: `openPanel(dockKey)` when the step names a panel
4. Persist progress in `dd-tutorial-v1` (ride backups)

Do **not** auto-start the tour for returning users with data.

## Editing the corpus

1. Edit generation inputs or `docs/rag/chunks.json` directly (keep `schema: 1`).
2. Keep `id`s stable — Ask links and deep links use `#chunk-<id>`.
3. Recompute nothing in the finance engine; this is docs only.
4. Open `/tutorial` and smoke Ask: `Where do I upload?`, `What is cautious forecast?`

## Privacy

- Tutorial and RAG contain **product** documentation only.
- Ask must not read `finance-data`, localStorage uploads, or backups unless a future feature explicitly scopes that (default: no).
