/**
 * household.mjs — the recorded household the co-pilot eval runs against.
 *
 * Source is demo.html's <script id="finance-data"> block: the deterministic,
 * entirely invented household that tools/make-demo.mjs generates from a fixed
 * seed (two earners, four accounts, ~24 months, standing orders, a loan DD,
 * seasonal bills, uncategorised noise). Nothing here comes from a real
 * statement, and rebuilding the demo rebuilds the fixture.
 *
 * What this module provides is the *app state the routing layer reads* —
 * A, TX, MONTHS, REC, cashflow figures — not the Engine. Figures below are
 * plain arithmetic over the recorded rows (sum / count / median), deliberately
 * NOT a re-implementation of Engine kernels: the Engine already has its own
 * self-tests, and this harness exists to test the engine's *decisions*.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadHousehold(htmlPath = join(ROOT, 'demo.html')) {
  const html = readFileSync(htmlPath, 'utf8');
  // The file documents its own data block in a comment further up, so take the
  // LAST match that actually opens with an object.
  const re = /<script id="finance-data" type="application\/json">(\{[\s\S]*?)<\/script>/g;
  let m, last = null;
  while ((m = re.exec(html))) last = m;
  if (!last) throw new Error('finance-data block missing from ' + htmlPath);

  const data = JSON.parse(last[1]);
  const rows = Array.isArray(data.transactions) ? data.transactions : [];
  if (!rows.length) throw new Error('recorded household has no transactions');

  // Positional columns, same order the shell reads at index.html:6526 —
  // [date, merchant, category, subcategory, debit, credit, confidence, account].
  // No header row.
  const num = (v) => {
    const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.-]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const TX = [];
  for (const r of rows) {
    const d = String(r[0] || '');
    if (!/^\d{4}-\d{2}-\d{2}/.test(d)) continue;
    TX.push({
      d,
      mo: d.slice(0, 7),
      m: String(r[1] || ''),
      c: String(r[2] || ''),
      s: String(r[3] || ''),
      de: num(r[4]),
      cr: num(r[5]),
      acct: String(r[7] || ''),
    });
  }
  if (!TX.length) throw new Error('no dated rows parsed from the recorded household');

  const MONTHS = [...new Set(TX.map((t) => t.mo))].sort();
  // Range the co-pilot defaults to: the last 12 recorded months.
  const range = MONTHS.slice(-12);
  const inRange = TX.filter((t) => range.includes(t.mo));

  const cats = [...new Set(TX.map((t) => t.c).filter(Boolean))];
  const catTotals = {};
  for (const t of inRange) {
    if (!t.c || !t.de) continue;
    catTotals[t.c] = (catTotals[t.c] || 0) + t.de;
  }
  const cats12 = Object.entries(catTotals)
    .map(([category, total]) => ({ category, total, avg: total / range.length }))
    .sort((a, b) => b.total - a.total);

  const income = inRange.reduce((s, t) => s + t.cr, 0) / range.length;
  const spend = inRange.reduce((s, t) => s + t.de, 0) / range.length;

  // Standing orders, recorded not detected: a merchant charged in at least 8 of
  // the 12 months. Enough for the prompt's "quote the bill" line; the real
  // Engine.recurring stays the app's job.
  const byMerchant = {};
  for (const t of inRange) {
    if (!t.de) continue;
    const key = t.m.replace(/\s+\d{3,}$/, '').trim().toUpperCase().slice(0, 42);
    (byMerchant[key] = byMerchant[key] || []).push(t);
  }
  const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const REC = Object.entries(byMerchant)
    .map(([merchant, ts]) => ({
      merchant,
      months: new Set(ts.map((t) => t.mo)).size,
      avg: median(ts.map((t) => t.de)),
      cat: ts[0].c || '',
      kind: 'expense',
      isSave: false,
      period: 1,
    }))
    .filter((r) => r.months >= 8 && r.avg >= 15)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 18);

  return {
    TX,
    MONTHS,
    range,
    REC,
    categories: cats,
    A: { cats12, allCats: cats },
    figures: {
      income: Math.round(income * 100) / 100,
      spend: Math.round(spend * 100) / 100,
      spare: Math.round((income - spend) * 100) / 100,
    },
    rangeLabel: range.length ? range[0] + ' → ' + range[range.length - 1] : 'no data',
    // Merchants a fixture may search for, so the fixtures never hard-code a
    // name the generator might rename.
    topMerchants: REC.slice(0, 6).map((r) => r.merchant),
    counts: { tx: TX.length, months: MONTHS.length, cats: cats.length, rec: REC.length },
  };
}
