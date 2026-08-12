#!/usr/bin/env node
/**
 * build-site.mjs — renders the Lithifyte content library.
 *
 *   node tools/build-site.mjs            # build
 *   node tools/build-site.mjs --check    # build to memory and report, write nothing
 *
 * Sources  : www/content/**.md      (markdown + frontmatter)
 * Targets  : www/rev2/*.html, www/rev2/learn/*.html
 *            www/rev2/sitemap.xml, llms.txt, llms-full.txt, robots.txt
 *
 * Why a generator and not 20 hand-written files: the sitemap, the llms.txt
 * index and the internal link graph all have to agree with the pages. One
 * source of truth is the only way they stay agreeing. Same reasoning as
 * tools/swap-data.mjs — no dependencies, plain Node, readable output.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'www', 'content');
const OUT = join(ROOT, 'www', 'rev2');
const ORIGIN = 'https://lithifyte.com';
const APP = 'https://app.lithifyte.com';
const CHECK = process.argv.includes('--check');

/* ─────────────────────────── tiny markdown ─────────────────────────── */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const slugify = (s) =>
  s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);

/** Inline markdown. Escapes first, so the content can contain < & > safely. */
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
    const ext = /^https?:\/\//.test(href) && !href.startsWith(ORIGIN);
    const rel = ext ? ' rel="noopener"' : '';
    return `<a href="${href}"${rel}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/ -- /g, ' — ');
  return s;
}

/**
 * Block-level markdown, line-driven. Supports the subset this site uses:
 * h2-h4, paragraphs, ul, ol, blockquote (rendered as a callout), tables,
 * fenced code and horizontal rules. Returns { html, headings }.
 */
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  const headings = [];
  let i = 0;

  const isBlockStart = (l) =>
    !l.trim() ||
    /^#{2,4} /.test(l) ||
    /^[-*] /.test(l) ||
    /^\d+\. /.test(l) ||
    /^> /.test(l) ||
    /^\|/.test(l) ||
    /^```/.test(l) ||
    /^---+\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith('```')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{2,4}) (.+)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = slugify(text);
      headings.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^> /.test(line)) {
      const buf = [];
      while (i < lines.length && /^> /.test(lines[i])) buf.push(lines[i++].slice(2));
      out.push(`<div class="callout"><p>${inline(buf.join(' '))}</p></div>`);
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        let item = lines[i++].replace(/^[-*] /, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(item);
      }
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        let item = lines[i++].replace(/^\d+\. /, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(item);
      }
      out.push(`<ol>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.split('|').slice(1, -1).map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(
        `<div class="tablewrap"><table><thead><tr>${head
          .map((c) => `<th>${inline(c)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
      continue;
    }

    const para = [line];
    i++;
    while (i < lines.length && !isBlockStart(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return { html: out.join('\n'), headings };
}

/* ─────────────────────────── frontmatter ─────────────────────────── */

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) throw new Error('missing frontmatter');
  const end = raw.indexOf('\n---', 3);
  if (end === -1) throw new Error('unterminated frontmatter');
  const head = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n/, '');
  const meta = {};
  for (const line of head.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    let val = rawVal.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, '');
    }
    meta[key] = val;
  }
  return { meta, body };
}

/* ─────────────────────────── page shell ─────────────────────────── */

const NAV = [
  ['/how-it-works', 'How it works'],
  ['/learn', 'Learn'],
  ['/guide', 'Guide'],
  ['/faq', 'FAQ'],
  [`${APP}/demo`, 'Sample'],
  // Every page needs a route into the product. A reader who arrives on a learn
  // article from a search result should never have to go home to find one.
  ['https://access.lithifyte.com/', 'Sign in'],
];

function head(page) {
  const url = ORIGIN + page.path;
  const img = page.image || `${ORIGIN}/og.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} — Lithifyte</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#020b1a">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
${page.keywords ? `<meta name="keywords" content="${esc([].concat(page.keywords).join(', '))}">\n` : ''}<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="${page.kind === 'article' ? 'article' : 'website'}">
<meta property="og:site_name" content="Lithifyte">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${img}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/page.css">
<script type="application/ld+json">
${JSON.stringify(schemaFor(page), null, 2)}
</script>
</head>
<body>
<header class="site">
  <a class="brand" href="/"><img src="/icon-192.png" alt="" width="28" height="28"> LITHIFYTE</a>
  <nav class="site" aria-label="Site">
${NAV.map(([href, label]) => `    <a href="${href}"${href === page.path ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
  </nav>
  <button class="nav-burger" type="button" aria-expanded="false" aria-controls="siteMenu" aria-label="Menu">
    <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
  </button>
</header>
<div class="nav-menu" id="siteMenu" hidden>
${NAV.map(([href, label]) => `  <a href="${href}"${href === page.path ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
</div>
<div class="nav-scrim" hidden></div>
<script>
/* Mobile menu — plain and self-contained; these are static content pages. */
(function(){
  var b=document.querySelector('.nav-burger'), m=document.getElementById('siteMenu'), s=document.querySelector('.nav-scrim');
  if(!b||!m||!s) return;
  m.removeAttribute('hidden'); s.removeAttribute('hidden');   /* CSS owns visibility */
  function isOpen(){ return b.getAttribute('aria-expanded')==='true'; }
  function set(open){
    b.setAttribute('aria-expanded', open?'true':'false');
    m.classList.toggle('open', open); s.classList.toggle('open', open);
    document.body.style.overflow = open?'hidden':'';
  }
  b.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); set(!isOpen()); });
  s.addEventListener('click',function(){ set(false); });
  m.addEventListener('click',function(e){ if(e.target.closest('a')) set(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&isOpen()){ set(false); b.focus(); } });
  window.addEventListener('resize',function(){ if(isOpen()&&window.innerWidth>760) set(false); });
})();
</script>`;
}

function breadcrumbHtml(page) {
  if (page.path === '/') return '';
  const trail = crumbs(page);
  return `<nav class="crumbs" aria-label="Breadcrumb">${trail
    .map((c, n) =>
      n === trail.length - 1
        ? `<span aria-current="page">${esc(c.name)}</span>`
        : `<a href="${c.path}">${esc(c.name)}</a> <span class="sep">/</span> `
    )
    .join('')}</nav>`;
}

function crumbs(page) {
  const trail = [{ name: 'Home', path: '/' }];
  if (page.section === 'learn' && page.path !== '/learn') trail.push({ name: 'Learn', path: '/learn' });
  trail.push({ name: page.shortTitle || page.title, path: page.path });
  return trail;
}

const FOOTER = `<footer class="site">
  <span>© 2026 Lithifyte · <a href="https://www.sid-labs.com">SID Labs</a></span>
  <a href="/how-it-works">How it works</a>
  <a href="/learn">Learn</a>
  <a href="/faq">FAQ</a>
  <a href="/security-and-privacy">Security</a>
  <a href="/open-source">Open source</a>
  <a href="/privacy">Privacy</a>
  <a href="/terms">Terms</a>
  <a href="https://github.com/SID-Apps/lithifyte">Source (AGPL-3.0)</a>
</footer>
</body>
</html>`;

/* ─────────────────────────── schema.org ─────────────────────────── */

const ORG_REF = { '@id': `${ORIGIN}/#organization` };

function schemaFor(page) {
  const url = ORIGIN + page.path;
  const graph = [];

  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: crumbs(page).map((c, n) => ({
      '@type': 'ListItem',
      position: n + 1,
      name: c.name,
      item: ORIGIN + c.path,
    })),
  });

  const base = {
    '@id': `${url}#page`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${ORIGIN}/#website` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
    publisher: ORG_REF,
    dateModified: page.updated,
  };

  if (page.schema === 'faq') {
    graph.push({ ...base, '@type': 'FAQPage', mainEntity: page.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })) });
  } else if (page.schema === 'glossary') {
    graph.push({ ...base, '@type': ['WebPage', 'DefinedTermSet'], hasDefinedTerm: page.terms.map((t) => ({
      '@type': 'DefinedTerm',
      '@id': `${url}#${t.id}`,
      name: t.term,
      description: t.def,
      inDefinedTermSet: { '@id': `${url}#page` },
    })) });
  } else if (page.schema === 'collection') {
    graph.push({ ...base, '@type': 'CollectionPage', mainEntity: {
      '@type': 'ItemList',
      itemListElement: page.items.map((p, n) => ({
        '@type': 'ListItem',
        position: n + 1,
        url: ORIGIN + p.path,
        name: p.title,
      })),
    } });
  } else if (page.kind === 'article') {
    graph.push({
      '@type': ['Article', 'LearningResource'],
      '@id': `${url}#article`,
      url,
      headline: page.title,
      description: page.description,
      inLanguage: 'en',
      isAccessibleForFree: true,
      educationalLevel: 'Beginner',
      learningResourceType: 'Explainer',
      datePublished: page.published || page.updated,
      dateModified: page.updated,
      author: ORG_REF,
      publisher: ORG_REF,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntityOfPage: url,
      about: [].concat(page.about || page.keywords || []).map((t) => ({ '@type': 'Thing', name: t })),
      wordCount: page.words,
    });
  } else {
    graph.push({ ...base, '@type': 'WebPage' });
  }

  if (page.howto) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: page.howto.name,
      description: page.description,
      totalTime: page.howto.time,
      step: page.howto.steps.map((s, n) => ({
        '@type': 'HowToStep',
        position: n + 1,
        name: s.name,
        text: s.text,
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/* ─────────────────────────── extraction ─────────────────────────── */

/** FAQ pages: every h3 is a question, the prose under it is the answer. */
function extractFaq(body) {
  const out = [];
  const parts = body.split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const q = part.slice(0, nl).trim();
    const a = part
      .slice(nl)
      .split(/^## /m)[0]
      .replace(/^\s+|\s+$/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*`>]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

/** Glossary: every h3 is a term, its first paragraph is the definition. */
function extractTerms(body) {
  return extractFaq(body).map((f) => ({
    term: f.q,
    id: slugify(f.q),
    def: f.a.split(/(?<=\.)\s/)[0].trim(),
  }));
}

/* ─────────────────────────── render ─────────────────────────── */

function render(page, allPages) {
  const { html, headings } = mdToHtml(page.body);
  const h2s = headings.filter((h) => h.level === 2);
  const toc =
    page.kind === 'article' && h2s.length >= 4
      ? `<nav class="toc" aria-label="On this page"><h2 class="toch">On this page</h2><ul>${h2s
          .map((h) => `<li><a href="#${h.id}">${inline(h.text)}</a></li>`)
          .join('')}</ul></nav>`
      : '';

  const related = ([].concat(page.related || []))
    .map((slug) => allPages.find((p) => p.slug === slug))
    .filter(Boolean);
  const relatedHtml = related.length
    ? `<aside class="related"><h2>Keep reading</h2><ul>${related
        .map((p) => `<li><a href="${p.path}">${esc(p.title)}</a> <span class="rel-d">${esc(p.summary || p.description)}</span></li>`)
        .join('')}</ul></aside>`
    : '';

  const meta = [];
  if (page.updated) meta.push(`Updated ${fmtDate(page.updated)}`);
  if (page.kind === 'article') meta.push(`${Math.max(2, Math.round(page.words / 220))} min read`);

  const cta =
    page.kind === 'article'
      ? `<aside class="cta"><h2>See it on your own money</h2><p>Lithifyte does this arithmetic for you, in your browser, from your own bank statements. Nothing is uploaded.</p><p><a class="btn" href="${APP}/demo">Explore the sample household</a> <a class="btn ghost" href="/how-it-works">How it works</a></p>
<p class="disclaimer">This page is general financial education, not financial advice. It describes how the arithmetic works so you can do it yourself; it does not recommend a product, a provider or a course of action for your circumstances.</p></aside>`
      : page.slug === 'learn'
      ? ''
      : `<aside class="cta"><h2>Try it</h2><p>The sample household is fully populated with invented data — no sign-up, nothing to upload. When you are ready to use your own statements, sign-in is a magic link and holds no financial data.</p><p><a class="btn" href="${APP}/demo">Explore the sample household</a> <a class="btn ghost" href="https://access.lithifyte.com/">Sign in free</a></p></aside>`;

  return `${head(page)}

<main class="page">
${breadcrumbHtml(page)}
  <h1>${esc(page.title)}</h1>
${meta.length ? `  <p class="updated">${meta.join(' · ')}</p>` : ''}
${page.summary ? `  <p class="lede">${inline(page.summary)}</p>` : ''}
${toc}
${html}
${cta}
${relatedHtml}
</main>

${FOOTER}
`;
}

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

/* ─────────────────────────── hub page ─────────────────────────── */

/** Reading order of the hub. A group not listed here falls to the end. */
const GROUP_ORDER = ['Start here', 'Getting ahead', 'Getting out of debt', 'The bigger picture', 'Reference'];

function learnHub(articles, meta) {
  const groups = new Map(GROUP_ORDER.map((g) => [g, []]));
  for (const a of articles) {
    const g = a.group || 'More';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(a);
  }
  for (const [g, items] of groups) {
    if (!items.length) groups.delete(g);
    else items.sort((a, b) => Number(a.order || 99) - Number(b.order || 99));
  }
  const body = [...groups.entries()]
    .map(
      ([g, items]) =>
        `## ${g}\n\n` +
        items
          .map((a) => `- [${a.title}](${a.path}) — ${a.summary || a.description}`)
          .join('\n')
    )
    .join('\n\n');
  return { ...meta, body: meta.body + '\n\n' + body, items: [...groups.values()].flat() };
}

/* ─────────────────────────── generated files ─────────────────────────── */

/** One page as clean markdown, with just enough front matter to be citable. */
function markdownTwin(page) {
  return (
    `# ${page.title}\n\n` +
    `Source: ${ORIGIN}${page.path}\n` +
    `Updated: ${page.updated}\n` +
    `Licence: content CC-BY-4.0 · software AGPL-3.0-or-later\n\n` +
    (page.summary ? `${page.summary}\n\n` : '') +
    `${page.body.trim()}\n`
  );
}

/** The markdown homepage, served for `GET / ` with Accept: text/markdown. */
function markdownHome(pages) {
  const line = (p) => `- [${p.title}](${ORIGIN}${p.path}) — ${p.summary || p.description}`;
  return (
    `# Lithifyte\n\n` +
    `Free, open-source household finance software that runs as a single HTML file in your browser. ` +
    `It imports bank statements, draws a live map of people, accounts, categories and merchants, and computes ` +
    `budgets, forecasts, debt payoff plans and net worth locally. Financial data is never sent to a server — ` +
    `there is no finance backend to send it to.\n\n` +
    `- Application: ${APP}/\n- Sample household (no sign-up): ${APP}/demo\n` +
    `- Source: https://github.com/SID-Apps/lithifyte\n- Licence: AGPL-3.0-or-later, free forever\n\n` +
    `## Product\n\n${pages.filter((p) => p.section === 'product').map(line).join('\n')}\n\n` +
    `## Learn\n\n${pages.filter((p) => p.section === 'learn').map(line).join('\n')}\n\n` +
    `## Machine-readable\n\n` +
    `- ${ORIGIN}/llms.txt — site map for language models\n` +
    `- ${ORIGIN}/llms-full.txt — every page as one markdown file\n` +
    `- ${ORIGIN}/sitemap.xml\n\n` +
    `Any page here is available as markdown: request it with \`Accept: text/markdown\`, or append \`.md\`.\n`
  );
}

function sitemap(pages) {
  const rows = [
    { loc: `${ORIGIN}/`, lastmod: maxDate(pages), priority: '1.0', changefreq: 'weekly' },
    ...pages.map((p) => ({
      loc: ORIGIN + p.path,
      lastmod: p.updated,
      priority: p.priority || (p.kind === 'article' ? '0.6' : '0.8'),
      changefreq: p.kind === 'article' ? 'monthly' : 'monthly',
    })),
    { loc: `${ORIGIN}/privacy`, lastmod: '2026-07-18', priority: '0.3', changefreq: 'yearly' },
    { loc: `${ORIGIN}/terms`, lastmod: '2026-07-18', priority: '0.3', changefreq: 'yearly' },
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

const maxDate = (pages) => pages.map((p) => p.updated).sort().pop();

/**
 * llms.txt — the llmstxt.org convention: a plain-markdown map of the site so a
 * model can find the right page without executing JavaScript or guessing.
 */
function llmsTxt(pages) {
  const bySection = (s) => pages.filter((p) => p.section === s);
  // Plain-text consumers have no base URL, so relative links must be absolute.
  const abs = (s) => s.replace(/\]\((\/[^)]*)\)/g, (_, p) => `](${ORIGIN}${p})`);
  const line = (p) => `- [${p.title}](${ORIGIN}${p.path}): ${abs(p.summary || p.description)}`;
  return `# Lithifyte

> Lithifyte is free, open-source household finance software that runs as a single HTML file in the browser. It imports bank statements, draws a live map of people, accounts, categories and merchants, and computes budgets, forecasts, debt payoff plans and net worth locally. Financial data is never sent to a server — there is no finance backend to send it to.

Key facts, stated plainly for retrieval:

- Licence: AGPL-3.0-or-later. The core is free forever and the source is public at https://github.com/SID-Apps/lithifyte
- Where computation happens: entirely in the visitor's browser. Data is stored in localStorage and IndexedDB on the device, optionally encrypted at rest with a passphrase.
- What the servers do hold: an email address for magic-link sign-in, and privacy-safe product events (page/section names, never amounts) on the hosted app only. Self-hosted copies report nothing.
- Statement import: CSV, tab/semicolon-separated or Excel .xlsx, read in the browser. A column mapper where every decision is overridable, a before/after preview that is the import rather than a description of it, reconciliation against the statement's own running balance, remembered mappings, and duplicate detection on re-upload. No row is dropped in silence.
- AI co-pilot (optional, off until a model is connected): ask about your money in plain language, have it open any section, or design a budget or goal in a sandbox that changes nothing until you press Apply. Bring your own API key (Anthropic, OpenAI, xAI), any OpenAI-compatible endpoint including a local Ollama or LM Studio model, or the hosted Lithifyte AI. The model never produces a number — it resolves intent, the Engine computes figures on the device, and answers render from those computed values.
- What the co-pilot sends: the assembled context for your message (tool results computed locally, relevant note excerpts, the conversation), to the model provider you chose. A local model means nothing leaves the machine. The relay worker is a pass-through, not a finance database.
- Cost: €0 for the core application. No advertising, no data sale, no lock-in — every store can be exported.
- Made by: Lithifyte (SID Labs), Ireland. Global product; Ireland is an optional locale pack for local tax depth.

## Product

${bySection('product').map(line).join('\n')}

## Learn — plain-language money guides

${bySection('learn').map(line).join('\n')}

## Policies

- [Privacy policy](${ORIGIN}/privacy): what is and is not collected, in plain terms.
- [Terms of use](${ORIGIN}/terms): the licence and the no-warranty position.

## Optional

- [Full text of every page](${ORIGIN}/llms-full.txt): the whole content library as one markdown file.
- [The application](${APP}/): the live app.
- [Sample household](${APP}/demo): a fully populated invented household, no sign-up.
`;
}

function llmsFull(pages) {
  return (
    `# Lithifyte — full content library\n\n` +
    `Every page on lithifyte.com as plain markdown, generated ${new Date().toISOString().slice(0, 10)}. ` +
    `Canonical HTML lives at ${ORIGIN}. Licence: content CC-BY-4.0, software AGPL-3.0-or-later.\n\n` +
    pages
      .map(
        (p) =>
          `\n\n---\n\n# ${p.title}\n\nURL: ${ORIGIN}${p.path}\nUpdated: ${p.updated}\n\n${
            p.summary ? p.summary + '\n\n' : ''
          }${p.body.trim()}`
      )
      .join('\n')
  );
}

/* ─────────────────────────── main ─────────────────────────── */

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function main() {
  if (!existsSync(SRC)) throw new Error(`no content directory at ${SRC}`);

  const files = walk(SRC).sort();
  const pages = [];

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || basename(file, '.md');
    const section = meta.section || 'product';
    const path = meta.path || (section === 'learn' && slug !== 'learn' ? `/learn/${slug}` : `/${slug}`);
    const page = {
      ...meta,
      slug,
      section,
      path,
      body,
      kind: meta.kind || (section === 'learn' && slug !== 'learn' ? 'article' : 'page'),
      words: body.split(/\s+/).length,
      file,
    };
    if (page.schema === 'faq') page.faq = extractFaq(body);
    if (page.schema === 'glossary') page.terms = extractTerms(body);
    if (page.howto_steps) {
      page.howto = {
        name: page.howto_name || page.title,
        time: page.howto_time || 'PT10M',
        steps: [].concat(page.howto_steps).map((s) => {
          const [name, ...rest] = s.split('|');
          return { name: name.trim(), text: rest.join('|').trim() || name.trim() };
        }),
      };
    }
    pages.push(page);
  }

  // The Learn hub lists the articles, so it is assembled after they are known.
  const hubIndex = pages.findIndex((p) => p.slug === 'learn');
  const articles = pages.filter((p) => p.kind === 'article' && p.section === 'learn');
  if (hubIndex !== -1) {
    pages[hubIndex] = { ...learnHub(articles, pages[hubIndex]), schema: 'collection' };
  }

  // Sitemap, llms.txt and the hub all present pages in the same reading order.
  const learnRank = (p) =>
    p.slug === 'learn' ? [-1, 0] : [GROUP_ORDER.indexOf(p.group), Number(p.order || 99)];
  const ordered = [
    ...pages.filter((p) => p.section === 'product'),
    ...pages
      .filter((p) => p.section === 'learn')
      .sort((a, b) => {
        const [ga, oa] = learnRank(a);
        const [gb, ob] = learnRank(b);
        return ga - gb || oa - ob;
      }),
  ];

  const written = [];
  for (const page of ordered) {
    const html = render(page, ordered);
    const target = join(OUT, page.path.slice(1) + '.html');
    if (!CHECK) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, html);
      // A markdown twin of every page. worker.js serves these to any client
      // asking for text/markdown, so an agent gets the prose without parsing
      // a page of styling it has no use for.
      writeFileSync(join(OUT, page.path.slice(1) + '.md'), markdownTwin(page));
    }
    written.push({ path: page.path, bytes: html.length, words: page.words });
  }

  const generated = {
    'sitemap.xml': sitemap(ordered),
    'llms.txt': llmsTxt(ordered),
    'llms-full.txt': llmsFull(ordered),
    'index.md': markdownHome(ordered),
  };
  for (const [name, content] of Object.entries(generated)) {
    if (!CHECK) writeFileSync(join(OUT, name), content);
    written.push({ path: '/' + name, bytes: content.length, words: 0 });
  }

  const totalWords = ordered.reduce((n, p) => n + p.words, 0);
  console.log(`${CHECK ? 'checked' : 'built'} ${ordered.length} pages, ${totalWords.toLocaleString()} words`);
  for (const w of written) {
    console.log(`  ${w.path.padEnd(42)} ${String(w.bytes).padStart(7)}b${w.words ? `  ${w.words}w` : ''}`);
  }
  return written;
}

main();
