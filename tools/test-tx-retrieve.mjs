#!/usr/bin/env node
/**
 * test-tx-retrieve.mjs — extract Engine.txRetrieve from index.html and run
 * it in Node. Retrieval is the product's RAG: it must rank in the browser
 * and never invent a match. Hourly validate runs this so a broken extract
 * marker or a year-as-amount regression fails the loop.
 *
 *   node tools/test-tx-retrieve.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const m = html.match(/\/\/ <tx-retrieve>\n([\s\S]*?)\/\/ <\/tx-retrieve>/);
if (!m) {
  console.error('tx-retrieve block missing from index.html');
  process.exit(1);
}

const Engine = {};
new Function(
  'Engine',
  `Object.assign(Engine, {\n${m[1]}\n});`
)(Engine);

const fails = [];
const T = (name, fn) => {
  let got;
  try { got = fn(); }
  catch (e) { fails.push(name + ' threw ' + ((e && e.message) || e)); return; }
  if (got === true) console.log('  ok   ' + name);
  else fails.push(name + ' — ' + (got === false ? 'false' : String(got)));
};

const rows = [
  {d:'2026-01-02', m:'TESCO STORES 3184', c:'Groceries', de:42.1, cr:0, mo:'2026-01'},
  {d:'2026-01-03', m:'VIRGIN MEDIA', c:'Bills', de:60, cr:0, mo:'2026-01'},
  {d:'2026-01-04', m:'TESCO EXPRESS', c:'Groceries', de:8.5, cr:0, mo:'2026-01'},
  {d:'2026-01-05', m:'TESCO REFUND', c:'Groceries', de:0, cr:12, mo:'2026-01'},
  {d:'2026-01-06', m:'ACME PAYROLL', c:'Income', de:0, cr:2400, mo:'2026-01'}
];

T('ranks tesco above unrelated spend', () => {
  const got = Engine.txRetrieve({query:'tesco groceries', rows, limit:5});
  if (got.hits.length < 2) return 'expected tesco hits, got ' + got.hits.length;
  if (!/tesco/i.test(got.hits[0].m)) return 'top hit was not tesco: ' + got.hits[0].m;
  return true;
});
T('unknown query returns no rows', () => {
  const got = Engine.txRetrieve({query:'zzzz-no-such-merchant', rows, limit:10});
  return got.hits.length === 0;
});
T('year in a date is not a minimum amount', () => {
  const h = Engine.txQueryHint('show me tesco spending in 2026-01');
  return h.month === '2026-01' && h.min == null && h.query.indexOf('tesco') >= 0 && h.wantsRows;
});
T('month name + year parses', () => {
  const h = Engine.txQueryHint('show me tesco spending in January 2026');
  return h.month === '2026-01' && h.min == null;
});
T('marked amount is a minimum', () => {
  const h = Engine.txQueryHint('show me tesco over €50');
  return h.min === 50 && !h.month && h.wantsRows;
});
T('spending query skips incoming rows', () => {
  const got = Engine.txRetrieve({query:'tesco', rows, limit:10});
  return got.hits.length === 2 && got.hits.every(r => r.de > 0);
});
T('prefix match ranks tesco for tes', () => {
  const got = Engine.txRetrieve({query:'tes', rows, limit:5});
  return got.hits.length >= 1 && /tesco/i.test(got.hits[0].m);
});
T('how-much-at is a retrieve question', () => {
  const h = Engine.txQueryHint('how much did I spend at tesco');
  return h.wantsRows && h.query.indexOf('tesco') >= 0;
});
T('income query keeps payroll, not tesco', () => {
  const got = Engine.txRetrieve({query:'payroll', rows, income:true, limit:5});
  return got.hits.length === 1 && got.hits[0].cr === 2400;
});
T('empty unknown-looking query does not dump the ledger when tokens exist', () => {
  const got = Engine.txRetrieve({query:'xyzzy-plugh', rows, limit:40});
  return got.hits.length === 0 && got.matched === 0;
});
T('plan hint parses a bundle of cuts and an ended payment', () => {
  if (typeof Engine.planHint !== 'function') return 'planHint missing';
  const h = Engine.planHint('if i cut back on shoppy by 200 euros, and reduce my groceries by 100, car payments PTSB are finished, and I reduce bills by around 30 euros, how does this effect my monthly outcome');
  if (!h.wantsWhatIf) return 'not what-if';
  const by = (k) => h.cuts.find(c => c.label.indexOf(k) >= 0);
  if (!by('shoppy') || by('shoppy').monthly !== 200) return 'shoppy';
  if (!by('groceries') || by('groceries').monthly !== 100) return 'groceries';
  if (!by('bills') || by('bills').monthly !== 30) return 'bills';
  const ended = h.cuts.find(c => c.end);
  return !!(ended && ended.label.indexOf('ptsb') >= 0);
});
T('plan hint: follow-up if these are deducted is a what-if', () => {
  const h = Engine.planHint('so how do I improve my end of month cash flow if these sections are deducted?');
  return !!h.wantsWhatIf;
});
T('plan hint: what do you notice is advice', () => {
  const h = Engine.planHint('What do you notice?');
  return !!(h.wantsAdvice && !h.wantsWhatIf);
});
T('paySeries: 11x270 in 12 months is 270 not 248', () => {
  if (typeof Engine.paySeries !== 'function') return 'paySeries missing';
  const rows = [];
  for (let i = 1; i <= 11; i++){
    const mo = '2025-' + String(i).padStart(2, '0');
    rows.push({d: mo + '-05', m:'PTSB ASSET FI SEPA DD', c:'Financial', de:270, cr:0, mo});
  }
  const s = Engine.paySeries({query:'ptsb', rows});
  return s.typical === 270 && s.monthsActive === 11;
});
T('plan hint: how much am I paying PTSB each mont', () => {
  const h = Engine.planHint('How much am i paying PTSB each mont?');
  return !!(h.wantsPayment && h.paymentQuery && h.paymentQuery.indexOf('ptsb') >= 0);
});
T('plan hint: do not need PTSB + save target is save plan', () => {
  const h = Engine.planHint('how much can i save, I do not need the PTSB payment, I want to reach 5000 by 2027-06');
  const ended = (h.cuts || []).find(c => c.end && c.label.indexOf('ptsb') >= 0);
  return !!(h.wantsSavePlan && ended && h.target === 5000 && h.by === '2027-06');
});

if (fails.length){
  console.error('tx-retrieve FAIL (' + fails.length + ')');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('tx-retrieve: ' + '16/16');
