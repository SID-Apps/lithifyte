#!/usr/bin/env node
// GoCardless Bank Account Data → dashboard CSV feeder (P3-11).
//
// Pulls transactions from your own bank accounts through the GoCardless
// Bank Account Data API (the PSD2 service formerly called Nordigen) and
// writes one CSV per account in the exact format the household finance
// dashboard's "Upload a statement" form accepts:
//
//   date,description,debit,credit
//
// Re-running is always safe: the dashboard de-duplicates on upload
// (multiset fingerprints), and this script also fetches incrementally
// from the last seen booking date per account.
//
// Zero npm dependencies — Node 18+ (global fetch).
//
// Usage:
//   node feeder.mjs banks              list Irish institutions (pick an id)
//   node feeder.mjs connect <bankId>   authorise a bank; prints a consent link
//   node feeder.mjs fetch              write CSVs for every linked account
//   node feeder.mjs status             show linked accounts + last fetch
//   node feeder.mjs prices SYM[=tick]… keyless stock/ETF quotes (Yahoo + ECB FX)
//                                      → out/quotes-YYYY-MM-DD.json for the
//                                      dashboard's "Import quotes file" button
//   node feeder.mjs selftest           run the offline conversion tests
//
// Setup (once): create a free account at
// https://bankaccountdata.gocardless.com → User secrets → new secret,
// then: cp config.example.json config.json and fill in secretId/secretKey.

import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://bankaccountdata.gocardless.com/api/v2';
const CONFIG_PATH = join(HERE, 'config.json');
const STATE_PATH = join(HERE, 'state.json');

// ── pure conversion core (exercised by `selftest`) ─────────────────────────

// One GoCardless booked transaction → [date, description, debit, credit].
// Amount sign carries direction: negative = money out (debit column).
export function toCsvRow(t){
  const amt = Number(t.transactionAmount && t.transactionAmount.amount);
  if (!isFinite(amt)) return null;
  const date = t.bookingDate || t.valueDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const desc = [
    t.creditorName || t.debtorName || '',
    t.remittanceInformationUnstructured ||
      (Array.isArray(t.remittanceInformationUnstructuredArray) ? t.remittanceInformationUnstructuredArray.join(' ') : '')
  ].filter(Boolean).join(' — ').replace(/\s+/g, ' ').trim() || 'UNKNOWN';
  return [date, desc, amt < 0 ? (-amt).toFixed(2) : '', amt > 0 ? amt.toFixed(2) : ''];
}

export function toCsv(transactions){
  const esc = s => /[",\n]/.test(s) ? '"' + String(s).replace(/"/g, '""') + '"' : s;
  const rows = transactions.map(toCsvRow).filter(Boolean)
    .sort((a, b) => a[0] < b[0] ? -1 : 1);
  return {
    csv: 'date,description,debit,credit\n' + rows.map(r => r.map(esc).join(',')).join('\n') + (rows.length ? '\n' : ''),
    count: rows.length,
    lastDate: rows.length ? rows[rows.length - 1][0] : null
  };
}

// ── prices core (P5-22 Tier 2) — pure, exercised by `selftest` ─────────────
// Yahoo Finance keyless chart endpoint → EUR quotes file the dashboard's
// holdings card imports. Arg grammar: SYM or SYM=yahooTicker — the dashboard
// symbol on the left, Yahoo's on the right when they differ (US tickers need
// no suffix; European listings do: VWCE=VWCE.DE, LLOY=LLOY.L).

export function parseArgSym(arg){
  const [sym, tick] = String(arg).split('=');
  if (!sym) return null;
  return {sym: sym.toUpperCase(), tick: (tick || sym).toUpperCase()};
}

// Yahoo chart JSON → {price, ccy, date}. Currency comes from the exchange
// itself ('GBp' = London pence). Date = the quote's own market timestamp.
export function parseYahoo(json){
  const meta = json && json.chart && json.chart.result && json.chart.result[0] && json.chart.result[0].meta;
  if (!meta || !(meta.regularMarketPrice > 0) || !meta.currency) return null;
  const d = new Date((meta.regularMarketTime || 0) * 1000);
  return {price: meta.regularMarketPrice, ccy: meta.currency,
          date: isFinite(+d) && meta.regularMarketTime ? d.toISOString().slice(0, 10) : null};
}

// rows [{sym, price(listing ccy), ccy, date}] + fx {USD:0.92,...} (EUR per
// unit of ccy, i.e. multiply) → dashboard quotes file
export function toQuotesFile(rows, fx, today){
  const quotes = {};
  const warnings = [];
  for (const r of rows){
    let eur = r.price;
    if (r.ccy === 'GBp' || r.ccy === 'GBX') eur = r.price / 100 * (fx.GBP || 0);
    else if (r.ccy && r.ccy !== 'EUR') eur = r.price * (fx[r.ccy] || 0);
    if (!(eur > 0)){ warnings.push(r.sym + ': no FX rate for ' + r.ccy + ' — skipped'); continue; }
    quotes[r.sym] = {price: Math.round(eur * 10000) / 10000, asOf: r.date || today};
  }
  return {kind: 'hfd-quotes', base: 'EUR', asOf: today || new Date().toISOString().slice(0, 10), quotes, warnings};
}

// ── API plumbing ────────────────────────────────────────────────────────────

function loadJson(path, fallback){
  try{ return JSON.parse(readFileSync(path, 'utf8')); }catch(e){ return fallback; }
}
function saveState(st){ writeFileSync(STATE_PATH, JSON.stringify(st, null, 2)); }

function config(){
  const c = loadJson(CONFIG_PATH, null);
  if (!c || !c.secretId || !c.secretKey){
    console.error('No config.json with secretId/secretKey.\n' +
      'Create one: cp config.example.json config.json — secrets come from\n' +
      'https://bankaccountdata.gocardless.com → User secrets.');
    process.exit(1);
  }
  return c;
}

async function api(path, opts = {}, token){
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'accept': 'application/json',
      ...(opts.body ? {'content-type': 'application/json'} : {}),
      ...(token ? {authorization: 'Bearer ' + token} : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok){
    const msg = body.detail || body.summary || JSON.stringify(body);
    throw new Error(`${res.status} on ${path}: ${msg}`);
  }
  return body;
}

async function getToken(c){
  const t = await api('/token/new/', {method: 'POST', body: JSON.stringify({secret_id: c.secretId, secret_key: c.secretKey})});
  return t.access;
}

// ── commands ────────────────────────────────────────────────────────────────

async function cmdBanks(){
  const c = config();
  const token = await getToken(c);
  const list = await api(`/institutions/?country=${c.country || 'ie'}`, {}, token);
  for (const b of list) console.log(`${b.id.padEnd(28)} ${b.name} (history: ${b.transaction_total_days}d)`);
  console.log(`\n${list.length} institutions. Next: node feeder.mjs connect <id>`);
}

async function cmdConnect(bankId){
  if (!bankId){ console.error('Usage: node feeder.mjs connect <institutionId>  (see: banks)'); process.exit(1); }
  const c = config();
  const token = await getToken(c);
  const req = await api('/requisitions/', {method: 'POST', body: JSON.stringify({
    redirect: c.redirect || 'http://localhost:1/done',
    institution_id: bankId,
    reference: 'dd-feeder-' + Date.now(),
  })}, token);
  const st = loadJson(STATE_PATH, {requisitions: [], accounts: {}});
  st.requisitions.push({id: req.id, bank: bankId, created: new Date().toISOString()});
  saveState(st);
  console.log('Open this link in a browser and authorise your bank:\n\n  ' + req.link +
    '\n\nThe end page ("cannot connect" on localhost) is expected — consent is stored at the bank.' +
    '\nThen run: node feeder.mjs fetch');
}

async function linkedAccounts(token){
  const st = loadJson(STATE_PATH, {requisitions: [], accounts: {}});
  const out = [];
  for (const r of st.requisitions){
    try{
      const req = await api(`/requisitions/${r.id}/`, {}, token);
      for (const acct of req.accounts || []) out.push({acct, bank: r.bank, status: req.status});
    }catch(e){ console.error(`requisition ${r.id}: ${e.message}`); }
  }
  return {st, accounts: out};
}

async function cmdFetch(){
  const c = config();
  const token = await getToken(c);
  const {st, accounts} = await linkedAccounts(token);
  if (!accounts.length){ console.log('No linked accounts yet — run: connect <bankId>'); return; }
  const outDir = c.outputDir ? c.outputDir : join(HERE, 'out');
  mkdirSync(outDir, {recursive: true});
  for (const {acct, bank} of accounts){
    const known = st.accounts[acct] || {};
    const since = known.lastDate ? `?date_from=${known.lastDate}` : '';   // incremental; overlap is fine (dashboard dedupes)
    const tx = await api(`/accounts/${acct}/transactions/${since}`, {}, token);
    const {csv, count, lastDate} = toCsv((tx.transactions && tx.transactions.booked) || []);
    const file = join(outDir, `${bank.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${acct.slice(0, 8)}.csv`);
    writeFileSync(file, csv);
    st.accounts[acct] = {bank, lastDate: lastDate || known.lastDate || null, fetchedAt: new Date().toISOString()};
    console.log(`${file}: ${count} transactions${lastDate ? ' → ' + lastDate : ''}`);
  }
  saveState(st);
  console.log('\nUpload each CSV in the dashboard ("Upload a statement") — duplicates are skipped automatically.');
}

async function cmdStatus(){
  const c = config();
  const token = await getToken(c);
  const {st, accounts} = await linkedAccounts(token);
  console.log(`Requisitions: ${st.requisitions.length}, linked accounts: ${accounts.length}`);
  for (const {acct, bank, status} of accounts){
    const k = st.accounts[acct] || {};
    console.log(`  ${bank} ${acct} [${status}] last fetch: ${k.fetchedAt || 'never'} → ${k.lastDate || '-'}`);
  }
}

// Keyless quotes: Yahoo Finance chart endpoint + frankfurter.app (ECB) FX.
// No config or API key needed.
async function cmdPrices(){
  const args = process.argv.slice(3);
  if (!args.length){
    console.error('Usage: node feeder.mjs prices SYM[=yahooTicker] …\n' +
      '  e.g.  node feeder.mjs prices AAPL MSFT VWCE=VWCE.DE LLOY=LLOY.L\n' +
      'The left side is YOUR holding symbol in the dashboard; add =TICKER when\n' +
      'Yahoo names it differently (European listings need a suffix: .DE, .L, .PA…).');
    process.exit(1);
  }
  const wants = args.map(parseArgSym).filter(Boolean);
  const rows = [];
  for (const w of wants){
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(w.tick)}?interval=1d&range=1d`;
    const res = await fetch(url, {headers: {'user-agent': 'Mozilla/5.0'}});
    const q = parseYahoo(await res.json().catch(() => null));
    if (!q){ console.error(`  ${w.sym} (${w.tick}): no quote — wrong ticker? (try the exact Yahoo symbol)`); continue; }
    rows.push({sym: w.sym, price: q.price, ccy: q.ccy, date: q.date});
    console.log(`  ${w.sym} (${w.tick}): ${q.price} ${q.ccy} @ ${q.date}`);
  }
  if (!rows.length){ console.error('No quotes fetched.'); process.exit(1); }
  const ccys = [...new Set(rows.map(r => (r.ccy === 'GBp' || r.ccy === 'GBX') ? 'GBP' : r.ccy).filter(c => c && c !== 'EUR'))];
  const fx = {};
  for (const c of ccys){
    const res = await fetch(`https://api.frankfurter.app/latest?from=${c}&to=EUR`);
    const j = await res.json();
    fx[c] = j && j.rates && j.rates.EUR;
    console.log(`  FX ${c}→EUR: ${fx[c]}`);
  }
  const out = toQuotesFile(rows, fx, new Date().toISOString().slice(0, 10));
  for (const w of out.warnings) console.error('  ⚠ ' + w);
  const c = loadJson(CONFIG_PATH, {});
  const outDir = c.outputDir ? c.outputDir : join(HERE, 'out');
  mkdirSync(outDir, {recursive: true});
  const file = join(outDir, `quotes-${out.asOf}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\n${file}: ${Object.keys(out.quotes).length} EUR quote(s).` +
    '\nImport it in the dashboard: Wealth → Investments & crypto → “Import quotes file”.');
}

// ── offline self-test ───────────────────────────────────────────────────────

function cmdSelftest(){
  let pass = 0, fail = 0;
  const T = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + '  ' + name); cond ? pass++ : fail++; };

  const spend = {bookingDate: '2026-07-01', transactionAmount: {amount: '-12.34', currency: 'EUR'},
    creditorName: 'TESCO STORES', remittanceInformationUnstructured: 'POS 6752'};
  const income = {bookingDate: '2026-07-03', transactionAmount: {amount: '900.00', currency: 'EUR'},
    debtorName: 'ACME PAYROLL'};
  const noDate = {transactionAmount: {amount: '-5', currency: 'EUR'}};
  const comma = {bookingDate: '2026-07-02', transactionAmount: {amount: '-1.00', currency: 'EUR'},
    creditorName: 'SHOP, THE "BIG" ONE'};

  T('spend → debit column', JSON.stringify(toCsvRow(spend)) === JSON.stringify(['2026-07-01', 'TESCO STORES — POS 6752', '12.34', '']));
  T('income → credit column', JSON.stringify(toCsvRow(income)) === JSON.stringify(['2026-07-03', 'ACME PAYROLL', '', '900.00']));
  T('dateless row dropped', toCsvRow(noDate) === null);
  const {csv, count, lastDate} = toCsv([income, spend, noDate, comma]);
  T('csv: header + rows sorted by date, bad rows dropped', count === 3 && csv.startsWith('date,description,debit,credit\n') && csv.indexOf('2026-07-01') < csv.indexOf('2026-07-03'));
  T('csv: commas/quotes escaped', csv.includes('"SHOP, THE ""BIG"" ONE"'));
  T('lastDate tracks newest booking', lastDate === '2026-07-03');

  // prices core
  T('parseArgSym: bare symbol + explicit Yahoo ticker', JSON.stringify(parseArgSym('vwce=VWCE.DE')) === JSON.stringify({sym:'VWCE', tick:'VWCE.DE'}) &&
    JSON.stringify(parseArgSym('aapl')) === JSON.stringify({sym:'AAPL', tick:'AAPL'}));
  T('parseYahoo: meta extract + garbage dropped',
    JSON.stringify(parseYahoo({chart:{result:[{meta:{currency:'EUR', regularMarketPrice:166.14, regularMarketTime:1783697764}}]}})) ===
      JSON.stringify({price:166.14, ccy:'EUR', date:'2026-07-10'}) &&
    parseYahoo({chart:{error:'nope'}}) === null && parseYahoo(null) === null);
  const qf = toQuotesFile([
    {sym:'AAPL', price:200, ccy:'USD', date:'2026-07-10'},
    {sym:'VWCE', price:120, ccy:'EUR', date:'2026-07-10'},
    {sym:'LLOY', price:6000, ccy:'GBp', date:'2026-07-10'},
    {sym:'BROKE', price:50, ccy:'CHF', date:'2026-07-10'}], {USD:0.9, GBP:1.2}, '2026-07-12');
  T('toQuotesFile: EUR passthrough, USD×fx, pence÷100×GBP, missing-FX skipped',
    qf.quotes.VWCE.price === 120 && qf.quotes.AAPL.price === 180 && qf.quotes.LLOY.price === 72 &&
    !qf.quotes.BROKE && qf.warnings.length === 1 && qf.kind === 'hfd-quotes');

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}

// ── main (skipped when imported as a module, e.g. by tests) ─────────────────

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  const cmd = process.argv[2];
  const run = {banks: cmdBanks, connect: () => cmdConnect(process.argv[3]), fetch: cmdFetch, status: cmdStatus, prices: cmdPrices, selftest: cmdSelftest}[cmd];
  if (!run){
    console.log('Usage: node feeder.mjs banks | connect <bankId> | fetch | status | prices SYM[=ticker] … | selftest');
    process.exit(cmd ? 1 : 0);
  }
  Promise.resolve(run()).catch(e => { console.error('Error: ' + e.message); process.exit(1); });
}
