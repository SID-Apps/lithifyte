#!/usr/bin/env node
// make-demo.mjs — generates demo.html: the hosted try-before-you-upload build.
//
//   node tools/make-demo.mjs [shell.html] [out.html]     (defaults: index.html demo.html)
//
// Produces a deterministic, entirely invented household — two earners, four
// accounts, ~24 months of transactions — tuned to light up every feature:
// merchant-name variants (canonicalisation), standing-order savings pairs
// (transfer matching + goal pot), a loan DD and a yearly insurance premium
// (recurring detection), seasonal electricity, a December bump, one holiday
// spike, and a trickle of uncategorised card-machine noise for the audit and
// AI-assist views. The data block gets demo:true, which the shell uses to
// namespace every localStorage/IndexedDB key (-demo) so the demo can never
// touch real data on the same origin.

import {readFileSync, writeFileSync} from 'node:fs';

const [shellPath = 'index.html', outPath = 'demo.html'] = process.argv.slice(2);

// deterministic PRNG — same demo every build
let seed = 42;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const between = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const MONTHS = [];
for (let y = 2024, m = 7; y < 2026 || m <= 6; m++){ if (m > 12){ m = 1; y++; } MONTHS.push(y + '-' + String(m).padStart(2, '0')); }
const day = (mo, d) => mo + '-' + String(Math.min(d, 28)).padStart(2, '0');
const winter = mo => { const m = +mo.slice(5); return m <= 2 || m >= 11 ? 60 : (m === 3 || m === 10 ? 25 : 0); };

const TX = [];
const add = (d, merchant, cat, sub, de, cr, conf, acct) => TX.push([d, merchant, cat, sub, de, cr, conf, acct]);

const GROCERS = [
  ['TESCO STORES 5544', 'Supermarket'], ['TESCO STORES 6102', 'Supermarket'],
  ['SUPERVALU RANELAGH', 'Supermarket'],
  ['ALDI 887 DUBLIN', 'Discount Supermarket'], ['ALDI 923 DUBLIN', 'Discount Supermarket'],
  ['LIDL 1442 DUBLIN', 'Discount Supermarket'],
  ['SPAR GT GEORGES ST', 'Convenience Store'], ['CENTRA CAMDEN ST', 'Convenience Store'],
];
const DINING = [
  ['BOOJUM ABBEY ST', 'Takeaway'], ['FIVE GUYS DUNDRUM', 'Fast Food'],
  ['DELIVEROO *PIZZA', 'Takeaway'], ['MILANO DAWSON ST', 'Restaurant'],
  ['THE OLD MILL CAFE', 'Coffee'], ['WAGAMAMA D2', 'Restaurant'],
];
const NOISE = ['SUMUP *KIOSK 42', 'ZETTLE_*BURRITO SHED', 'VDP-MURPHY J', 'CARPARK DUB 003', 'AN POST COUNTER'];

let ccPending = 380;                     // last month's card spend → this month's payment
for (let i = 0; i < MONTHS.length; i++){
  const mo = MONTHS[i];
  const raise = mo >= '2026-01' ? 1.04 : 1;
  let ccSpend = 0;
  const cc = (d, merchant, cat, sub, amt) => { ccSpend += amt; add(d, merchant, cat, sub, amt, 0, 0.9, 'd-cc'); };

  // ── fixed monthly rhythm ──
  add(day(mo, 1), 'RESIDENTIAL LETTINGS DD', 'Rent', 'Rent', 1600, 0, 0.95, 'd-ava');
  add(day(mo, 25), 'ACME LABS PAYROLL', 'Income', 'Salary', 0, Math.round(3150 * raise * 100) / 100, 0.95, 'd-ava');
  add(day(mo, 28), 'TECHFLOW LTD SALARY', 'Income', 'Salary', 0, Math.round(2850 * raise * 100) / 100, 0.95, 'd-ben');
  add(day(mo, 26), 'SO CREDIT UNION SAVER', 'Deposit savings', 'Standing order', 600, 0, 0.95, 'd-ava');
  add(day(mo, 26), 'TRANSFER AVA BYRNE', 'Deposit savings', 'Standing order', 0, 600, 0.95, 'd-sav');
  add(day(mo, 27), 'REVOLUT TRANSFER SAVER', 'Deposit savings', 'Standing order', 300, 0, 0.95, 'd-ben');
  add(day(mo, 27), 'TRANSFER BEN KELLY', 'Deposit savings', 'Standing order', 0, 300, 0.95, 'd-sav');
  add(day(mo, 15), 'ELECTRIC IRELAND DD', 'Bills & Utilities', 'Electricity', between(85, 105) + winter(mo), 0, 0.9, 'd-ava');
  add(day(mo, 12), 'EIR BROADBAND DD', 'Bills & Utilities', 'Internet/TV', 55, 0, 0.9, 'd-ava');
  add(day(mo, 8), 'VODAFONE IRELAND', 'Bills & Utilities', 'Mobile', 45, 0, 0.9, 'd-ben');
  add(day(mo, 6), 'VHI HEALTHCARE DD', 'Insurance', 'Health', 95, 0, 0.9, 'd-ava');
  add(day(mo, 10), 'AVANT MONEY LOAN', 'Bills & Utilities', 'Loan repayment', 285, 0, 0.9, 'd-ben');
  cc(day(mo, 3), 'NETFLIX.COM', 'Entertainment', 'Streaming', 17.99);
  add(day(mo, 5), 'SPOTIFY P2E4A1', 'Entertainment', 'Streaming', 11.99, 0, 0.9, 'd-ben');

  // credit-card payment pair — matched as an internal transfer
  const pay = Math.round(ccPending);
  add(day(mo, 20), 'VISA PAYMENT AIB', 'Internal transfer', 'Credit card payment', pay, 0, 0.95, 'd-ava');
  add(day(mo, 20), 'PAYMENT RECEIVED - THANK YOU', 'Internal transfer', 'Credit card payment', 0, pay, 0.95, 'd-cc');

  // ── variable life ──
  for (let n = int(7, 11); n--;){
    const [m, sub] = pick(GROCERS);
    const r = rnd(), acct = r < 0.6 ? 'd-ava' : r < 0.85 ? 'd-ben' : null;
    const amt = between(16, sub === 'Convenience Store' ? 32 : 105);
    if (acct) add(day(mo, int(1, 28)), m, 'Groceries', sub, amt, 0, 0.9, acct);
    else cc(day(mo, int(1, 28)), m, 'Groceries', sub, amt);
  }
  for (let n = 4; n--;) add(day(mo, int(2, 27)), pick(['CIRCLE K DUBLIN RD', 'APPLEGREEN M50']), 'Transport', 'Fuel', between(50, 78), 0, 0.9, 'd-ben');
  for (let n = 2; n--;) add(day(mo, int(2, 27)), 'LEAP TOP-UP DUBLIN', 'Transport', 'Public transport', 20, 0, 0.9, 'd-ava');
  for (let n = int(4, 7); n--;){
    const [m, sub] = pick(DINING), amt = between(12, 68);
    if (rnd() < 0.4) cc(day(mo, int(1, 28)), m, 'Dining', sub, amt);
    else add(day(mo, int(1, 28)), m, 'Dining', sub, amt, 0, 0.9, pick(['d-ava', 'd-ben']));
  }
  for (let n = 3; n--;) add(day(mo, int(1, 28)), 'INSOMNIA COFFEE 122', 'Dining', 'Coffee', between(3.8, 5.6), 0, 0.9, 'd-ava');
  for (let n = int(1, 2); n--;) add(day(mo, int(1, 28)), 'BOOTS 1123 DUBLIN', 'Health & Pharmacy', 'Pharmacy', between(8, 35), 0, 0.9, 'd-ava');
  const shopN = mo.endsWith('-12') ? 5 : 2;
  for (let n = shopN; n--;)
    cc(day(mo, int(1, 28)), 'AMZN MKTP IE*' + Math.floor(rnd() * 9e5 + 1e5).toString(36).toUpperCase(), 'Shopping', 'Online', between(12, mo.endsWith('-12') ? 140 : 85));
  if (i % 2 === 0) add(day(mo, int(1, 28)), 'PENNEYS MARY ST', 'Shopping', 'Clothing', between(15, 60), 0, 0.9, 'd-ava');
  for (let n = int(1, 2); n--;) add(day(mo, int(1, 28)), pick(NOISE), 'Uncategorized', 'Uncategorized', between(5, 40), 0, 0.1, pick(['d-ava', 'd-ben']));

  // ── one-offs ──
  if (mo === '2025-06' || mo === '2026-06') add(day(mo, 14), 'AXA CAR INSURANCE', 'Insurance', 'Car', 682, 0, 0.9, 'd-ben');
  if (mo === '2025-05') add(day(mo, 19), 'REVENUE COMMISSIONERS', 'Income', 'Tax refund', 0, 420, 0.9, 'd-ava');
  if (mo === '2025-07'){
    cc(day(mo, 2), 'AER LINGUS EI0482', 'Travel', 'Flights', 486);
    cc(day(mo, 4), 'BOOKING.COM AMSTERDAM', 'Travel', 'Hotel', 624.5);
    for (let n = 4; n--;) cc(day(mo, int(10, 17)), 'CAFE VAN GOGH AMS', 'Travel', 'Eating out', between(22, 74));
  }
  ccPending = ccSpend;
}
TX.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

// integrity block: same accumulation the page performs on load
const r2 = x => Math.round(x * 100) / 100;
const data = {
  demo: true,
  goal: 40000,
  integrity: {
    txCount: TX.length,
    debitSum: r2(TX.reduce((s, t) => s + t[4], 0)),
    creditSum: r2(TX.reduce((s, t) => s + t[5], 0)),
  },
  fiscal: {
    verifiedOn: '2026-07-09', country: 'IE', netToGross: 0.68, payeShareOfGross: 0.24,
    pensionReliefRate: 0.4, fundsExitTax: 0.41, dirtRate: 0.33, htbCap: 30000, htbYears: 4,
    pensionAgeBands: [[0, 15], [30, 20], [40, 25], [50, 30], [55, 35], [60, 40]],
    capacityPerThousand: 5.28, depositRateLow: 0.02, depositRateHigh: 0.03,
    growthNominal: 0.05, mortgageRate: 0.035, cashRate: 0.02, cgtRate: 0.33, cgtExemption: 1270,
  },
  goals: [
    {id: 'house', name: 'House deposit', target: 40000, targetMonth: null, pot: null, autoFromSavings: true},
    {id: 'trip', name: 'Japan trip', target: 4000, targetMonth: '2027-03', pot: null, autoFromSavings: true},
  ],
  users: [
    {id: 'u-ava', name: 'Ava', type: 'personal'},
    {id: 'u-ben', name: 'Ben', type: 'personal'},
  ],
  accounts: [
    {id: 'd-ava', name: 'Ava — AIB current', kind: 'current', userId: 'u-ava'},
    {id: 'd-ben', name: 'Ben — Revolut', kind: 'current', userId: 'u-ben'},
    {id: 'd-sav', name: 'House savings — Credit Union', kind: 'savings', userId: 'u-ava'},
    {id: 'd-cc', name: 'Ava — Visa credit card', kind: 'credit', userId: 'u-ava'},
  ],
  categories: [{name: 'Travel', color: '#4dc9f0'}],
  recurring: [], manualRecurring: [], transfers: [],
  rules: [
    {label: 'Streaming is entertainment', merchantContains: 'NETFLIX', amountEquals: null, setCategory: 'Entertainment', note: 'sample rule — first match wins', enabled: true},
  ],
  leverHints: [],
  transactions: TX,
};

const TAG = '<script id="finance-data" type="application/json">';
const shell = readFileSync(shellPath, 'utf8');
const i = shell.lastIndexOf(TAG);
if (i < 0) throw new Error(shellPath + ': no finance-data block');
const j = shell.indexOf('</scr' + 'ipt>', i);
writeFileSync(outPath, shell.slice(0, i) + TAG + JSON.stringify(data) + shell.slice(j));
console.log(outPath + ': ' + TX.length + ' invented transactions across ' + MONTHS.length + ' months, ' +
  data.accounts.length + ' accounts — open it and check the self-test before shipping.');
