# SEO and AI search — operator runbook

How Lithifyte gets found, by search engines and by the answer engines (ChatGPT
search, Claude, Perplexity, Google AI overviews). Written to be followed in
order the first time and dipped into afterwards.

**The position, decided 2026-08-09:** search engines and AI *answer* engines are
welcome and explicitly allowed. AI *training* crawlers are not. Being findable
and being training data are separate things, and `robots.txt` separates them.

---

## 0 · Google-Extended, Gemini, and Cloudflare's Managed robots.txt

> **Status, 2026-08-26: RESOLVED. Managed robots.txt is off.**
>
> Verified on both hosts: the live file now opens with our own header, there is
> exactly one `User-agent: *` group, `Google-Extended` is `Allow: /` with no
> earlier `Disallow`, and `CloudflareBrowserRenderingCrawler` is no longer
> blocked. Everything below is kept because the toggle can be re-enabled by a
> future dashboard change and the symptom is invisible from the repo.
>
> Re-check with `curl -s https://lithifyte.com/robots.txt | grep -c 'BEGIN Cloudflare Managed'`
> — it must return `0`. Note this was always a zone toggle: **no deploy fixes
> it**, so do not spend a deploy trying if it comes back.

**The token that actually gates Gemini is `Google-Extended`.** It is not a
separate crawler and it is not training-only. Google's own crawler list says
publishers use it to control whether crawled content may be used **for Gemini
training *and* for grounding in Gemini Apps** (feeding the Search index to the
model at prompt time). `Disallow: /` for `Google-Extended` is why Gemini
answers "lithifyte.com isn't accessible or indexed / private / unreleased /
blocked" while Googlebot is still allowed and the public site returns 200.

Google does not offer a robots.txt split between those two uses. Lithifyte's
position is still "cite us, don't train": `Content-Signal: ai-train=no` stays,
and training-only crawlers (GPTBot, ClaudeBot, CCBot, …) stay disallowed.
`Google-Extended` is listed with the **answer engines** because blocking it
makes Gemini refuse to ground on the site. `www/rev2/robots.txt` and the app
host `robots.txt` both `Allow` it.

Cloudflare's **Managed robots.txt** is enabled on the `lithifyte.com` zone. It
prepends its own block list, which **includes `Google-Extended`**. Even after
our file allows Gemini, the live `/robots.txt` still contains Cloudflare's
`Disallow` until that setting is off. Turn it off — this is an unblock, not
tidiness:

- Cloudflare's prepended `User-agent: Google-Extended` / `Disallow: /` is the
  Gemini grounding opt-out.
- The served file also has **two `User-agent: *` groups with different
  `Content-Signal` lines** — Cloudflare's `search=yes,ai-train=no,use=reference`
  (no `ai-input`) and ours `search=yes, ai-input=yes, ai-train=no`. A parser
  that takes the first group never sees "quoting this in an answer is fine".
- Our repo file stops being the source of truth for what the site says.

Check what is actually live:

```bash
curl -s https://lithifyte.com/robots.txt | head -40
curl -s https://app.lithifyte.com/robots.txt | head -40
```

If you see a `# BEGIN Cloudflare Managed content` block, it is still on.

**To turn it off:** Cloudflare dashboard → select the `lithifyte.com` zone →
**AI Crawl Control** (previously under Security → Bots) → **Managed robots.txt**
→ off. Direct link pattern: Security Settings → filter **Bot traffic** →
**Set your preference to block training in robots.txt**. Do it for the zone;
both hosts are on it. Then confirm with the curl commands above that the live
file matches `www/rev2/robots.txt` and `robots.txt` in the repo root, and that
`Google-Extended` is `Allow: /` with no earlier `Disallow`.

Gemini still needs the pages in **Google Search**. IndexNow does not notify
Google. After robots.txt is clean: Search Console → inspect `https://lithifyte.com/`
and **Request indexing**, and confirm the sitemap `https://lithifyte.com/sitemap.xml`
is submitted on the domain property. Give Gemini a recrawl window after that;
the canned "not accessible or indexed" reply can lag the file change by hours.

There is also an **agent-readiness** panel on the same Cloudflare screen,
scored by isitagentready.com. Scan the site directly rather than trusting the
panel's cached result, which goes stale the moment you deploy:

```bash
curl -s -X POST https://isitagentready.com/api/scan \
  -H "Content-Type: application/json" -d '{"url":"https://lithifyte.com"}' | jq .checks
```

As of 2026-08-09 the site is **level 3, Agent-Readable**: robots.txt, sitemap,
AI bot rules, content signals, Link headers and markdown negotiation all pass.
The remaining failures are `dnsAid` (DNS-AID records, needs DNS access) and the
eight `discovery` checks — API catalog, OAuth discovery, auth.md, MCP server
card, A2A agent card, agent skills, WebMCP. **Those eight describe a site that
exposes a callable API with authentication. Lithifyte deliberately has no data
API, and an MCP server over user finances was considered and rejected.** Do not
publish discovery documents for endpoints that do not exist to move a score.
The one honest option, if it is ever wanted, is an MCP server over the *public
documentation* — `docs/rag/chunks.json` is already that corpus — which would
legitimately satisfy `mcpServerCard` and `agentSkills` without touching a
single user's data.

While you are there, confirm no **Block AI Scrapers and Crawlers** WAF rule is
enabled. It was *not* enabled when this was written — every bot user-agent got
a 200 — but it is the other switch that would silently undo all of this.

---

## 1 · Google Search Console

The domain property is already verified by DNS TXT
(`google-site-verification=USdukkBAQ6-…` on `lithifyte.com`). A domain property
covers every subdomain, so `app.lithifyte.com` is included.

Do these once:

1. **Submit both sitemaps** — Sitemaps → add `sitemap.xml`, and add
   `https://app.lithifyte.com/sitemap.xml`.
2. **Inspect the key URLs** and request indexing: `/`, `/how-it-works`, `/faq`,
   `/guide`, `/learn`. Everything else will be discovered from the sitemap and
   the internal links.
3. **Check Page Indexing** a week later. Expect the app shell and `/demo` to
   appear as *Excluded by robots.txt* — that is deliberate, not a fault.
4. **Confirm the rich results.** Use the [Rich Results
   Test](https://search.google.com/test/rich-results) on `/faq` (FAQPage) and
   any learn article (Article). All schema on the site is generated and was
   validated as parsing at build time, but the Google-specific eligibility
   check is worth doing once.

Then check monthly: which queries bring impressions, and which pages get them.

## 2 · Bing, and IndexNow

Bing matters more than its market share suggests, because **ChatGPT search
leans on the Bing index**. Being absent from Bing means being absent from a
large share of AI answers.

1. Bing Webmaster Tools → **Import from Google Search Console** (fastest path,
   carries the verification across).
2. Submit the same two sitemaps.

IndexNow pushes changed URLs to Bing, Yandex, Seznam and Naver instead of
waiting for a recrawl. The key file is committed at both hosts' roots.

```bash
node tools/indexnow.mjs --dry      # show what would be submitted
node tools/indexnow.mjs            # submit every URL in the sitemap
node tools/indexnow.mjs /faq       # submit specific pages after an edit
```

A 403 from IndexNow means the key file at `https://lithifyte.com/<key>.txt` is
missing or does not match the key in `tools/indexnow.mjs`. Do not rotate one
without the other.

## 3 · What makes the AI answer engines cite you

They fetch a page, extract text, and quote whatever answers the question. Three
things follow from that, and the content library is built around them.

- **They mostly do not run JavaScript.** Every content page is static HTML with
  the prose in the source. The immersive landing also carries its copy in the
  raw HTML — check that any future landing edit keeps that true.
- **They quote the first substantive paragraph.** Every page opens with a
  `summary` that answers its own title directly. Keep that habit.
- **They favour specific, checkable statements.** "€40–150 a month, from an
  hour of work" gets quoted; "save money on subscriptions" does not.

Two files serve them directly:

| File | What it is |
|---|---|
| `/llms.txt` | The [llmstxt.org](https://llmstxt.org) convention — a plain-markdown map of the site plus the key facts about the product, stated for retrieval |
| `/llms-full.txt` | Every page's full text as one markdown file |
| `<page>.md` | A markdown twin of every page, generated alongside the HTML |

`worker.js` serves those twins to anything asking for markdown — either
`Accept: text/markdown` on the normal URL, or the `.md` path directly — and
adds a `Link: …rel="alternate"; type="text/markdown"` header to every HTML
response so the twin is discoverable. Browsers are unaffected; the worker
passes everything it does not handle straight to the asset handler, and falls
back to it on any error.

Both are generated by `tools/build-site.mjs`. Do not hand-edit them.

## 4 · Editing the content library

One source of truth. Markdown in `www/content/`, everything else generated.

```bash
node tools/build-site.mjs --check    # render and report, write nothing
node tools/build-site.mjs            # write pages, sitemap, llms.txt, llms-full.txt
```

Frontmatter fields that matter:

| Field | Effect |
|---|---|
| `title`, `description` | `<title>`, meta description, OG tags |
| `summary` | The lede paragraph, the hub card, and the llms.txt line |
| `section` | `product` or `learn` — decides the URL and the hub |
| `group`, `order` | Placement on the `/learn` hub (`GROUP_ORDER` in the script sets the group sequence) |
| `schema` | `faq` builds FAQPage from the `###` headings; `glossary` builds DefinedTermSet |
| `mainEntity` | `software` points the page's WebPage node at the homepage's `#software` @id. Use it on entity pages so they reinforce one SoftwareApplication instead of declaring rival ones |
| `related` | Slugs for the "keep reading" block |
| `updated` | Drives `dateModified` and the sitemap `lastmod` — **bump it when you edit** |

Adding an article is one markdown file. The hub, sitemap, llms.txt and
internal links update themselves.

After a content change: rebuild, deploy, then `node tools/indexnow.mjs` with
the changed paths.

## 5 · Deploying

```bash
# the marketing site and the whole content library
cd /home/sid-ai/lithifyte/www/rev2 && wrangler deploy

# the app host (robots.txt, sitemap.xml, tutorial.html live here)
# auto-deploys on push to main — no manual step
git push
```

`wrangler` OAuth expires periodically. If a deploy 401s, the user needs to run
`wrangler login` themselves.

Verify after deploying:

```bash
for u in / /how-it-works /faq /guide /learn /learn/glossary /llms.txt /sitemap.xml /robots.txt; do
  printf "%-24s " "$u"; curl -s -o /dev/null -w "%{http_code}\n" "https://lithifyte.com$u"
done
```

## 6 · Two gates that are not SEO but block on the same deploys

**Mail from-address.** The private Cloud access worker sends from
`Lithifyte <signin@lithifyte.com>`. **`lithifyte.com` must be a verified domain
in Resend** or `/waitlist` returns 502 and nobody can sign in. Verify first:
Resend → Domains → add `lithifyte.com` → add the DKIM and SPF records it prints
to Cloudflare DNS → wait for *Verified*. Confirm with:

```bash
dig +short TXT resend._domainkey.lithifyte.com
```

**Rev 1.8 is uncommitted.** `index.html` and `demo.html` in the repo root carry
the built-but-unshipped Rev 1.8 statement importer. A `git add -A` while
committing this SEO work will ship Rev 1.8 to production at the same time,
because pushing `main` auto-deploys the app. Either ship it deliberately (it is
self-tested at 235/235) or stage selectively. Once it does ship, the import
section of `www/content/guide.md` should gain the XLSX reader, the column
mapper and reconciliation — it currently describes only what is live.

## 6b · The bottleneck is external, not on this site

**Measured 2026-08-26.** Layers 1 and 2 of this runbook are done to a standard
almost no site of this size reaches. They are producing nothing, and the reason
is not on the site.

- A web search for the exact string `lithifyte.com` returns the Merriam-Webster
  entry for *lithify*, the Wikipedia article on **lithification**, and
  **lithify.com** (a rocks-and-minerals shop). Not us.
- A search for `Lithifyte budgeting app` returns NerdWallet, Actual Budget and
  Kiplinger. Not us.
- The GitHub repo is public, correctly topic-tagged, and sits at **0 stars**.

Nothing on the internet points here. That is the whole finding. More articles
do not fix it — 16 were live and unlinked when this was measured, and thirty
more would have multiplied the same zero.

**The brand name is also a permanent tax.** *Lithifyte* is one letter from
*lithify*, which has Merriam-Webster and OED entries, a Wikipedia article, and
an active commercial domain. Engines will autocorrect and entity resolution
will collide. Never ship the bare brand word without the category attached to
it — that is why `/budgeting-app` exists and why the homepage `<title>` now
says what the thing is.

### The one lever left, in priority order

All free. Ranked by how heavily the source is quoted back by models.

1. **AlternativeTo.net** — submit as a free/open-source YNAB alternative. This
   is literally the page models quote for "alternatives to X".
2. **awesome-selfhosted** and **awesome-privacy** PRs — high authority, densely
   crawled, and present in training corpora, which is the one route to being
   named without a search.
3. **Show HN** — single HTML file, AGPL, bank data never leaves the browser.
   That is an HN-shaped story and it is true.
4. **opensourcealternative.to**, Privacy Guides discussion.
5. Reddit: r/selfhosted, r/privacy, r/plaintextaccounting, r/ireland —
   disclosing authorship.

Each also produces a real backlink, which is what layers 1 and 2 have been
waiting for.

### Resolved — `lithifyte-com.pages.dev` deleted 2026-08-26

The Cloudflare **Pages** project `lithifyte-com` still serves a ~1-month-old
copy of the whole marketing site, with **no robots.txt, no canonical, and a 200
for every path** — `/budgeting-app` and `/zzz-nonsense` both return the old
homepage. Unlimited soft-404 duplicates on an indexable host.

It was not the cause of anything in Search Console (the domain property covers
`lithifyte.com` only), but it diluted external signal. **The Pages project was
deleted on 2026-08-26**; `lithifyte-com.pages.dev` no longer resolves.

Checked before deleting, and worth repeating if a mirror is ever recreated: the
project had **no custom domains** (only `lithifyte-com.pages.dev`), and both
`lithifyte.com` and `www.lithifyte.com` were served by the `lithifyte-landing`
Worker — confirmed by both returning the *new* homepage `<title>` while the
Pages copy still returned the old one. If a mirror is wanted again, give it a
blanket-`Disallow` robots.txt and a canonical to the apex before it goes live.

### The trade to keep stating out loud

`GPTBot` and `ClaudeBot` are disallowed, and that stays. Be clear what it buys
and costs: Lithifyte can be **cited when a model searches**, and can never be
**recommended from memory**. "What is the best free budgeting app?" asked
without a search tool will not say Lithifyte, by construction. That is the
price of the position and it is payable — but it is exactly why third-party
mentions, which *are* in the corpora, matter more here than for a site that
lets the training crawlers in.

## 7 · What to watch, and what not to expect

Give it six to twelve weeks. A new content library on a young domain does not
rank quickly, and the AI answer engines only cite pages they have crawled.

| Signal | Where | Healthy looks like |
|---|---|---|
| Pages indexed | GSC → Page Indexing | 20+ valid, app shell and `/demo` excluded by robots |
| Query impressions | GSC → Performance | Long-tail question queries first — "how big should an emergency fund be" before "budgeting app" |
| AI citations | Ask ChatGPT/Claude/Perplexity a question the library answers | Lithifyte pages cited by URL |
| Crawl activity | Cloudflare → Analytics, filtered by user agent | `OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot` present and not 403ing |
| Gemini | Ask Gemini "what is lithifyte.com?" | It cites lithifyte.com. If it says the domain is private/unindexed, `Google-Extended` is still `Disallow` (ours or Cloudflare Managed) or Search Console has not indexed the URL yet |

Do not chase keyword volume for the head terms — "budgeting app" is contested
by companies with marketing budgets. The library is aimed at the questions
those companies do not answer plainly, which is where an answer engine goes
looking.
