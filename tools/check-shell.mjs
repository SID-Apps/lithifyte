#!/usr/bin/env node
// check-shell.mjs — fail the release loop if the public shell drifted from
// the claims we make to users and to agents.
//
//   node tools/check-shell.mjs [index.html] [landing.html]
//
// Defaults: index.html and www/rev2/index.html, relative to cwd (the repo).
// Exit 0 only when every check passes. Does not upload anything.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const appPath = resolve(process.argv[2] || 'index.html');
const landPath = resolve(process.argv[3] || 'www/rev2/index.html');

const fails = [];
const ok = (name, pass, detail) => {
  if (pass) console.log('  ok   ' + name);
  else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
  }
};

function mustRead(p, label) {
  if (!existsSync(p)) {
    fails.push(label + ' missing at ' + p);
    return '';
  }
  return readFileSync(p, 'utf8');
}

const app = mustRead(appPath, 'app shell');
const land = mustRead(landPath, 'landing');

console.log('check-shell');
console.log('  app     ' + appPath);
console.log('  landing ' + landPath);

ok('app: __ddCatalog hook', /__ddCatalog\s*=/.test(app));
ok('app: __ddLastOutbound hook', /__ddLastOutbound\s*=/.test(app));
ok('app: __lfDemo flag', /__lfDemo/.test(app));
ok('app: self-test envelope keys', /R\.pass/.test(app) && /R\.n\s*=/.test(app) && /R\.fails/.test(app));
ok('app: first-run drop zone', /id="obDrop"/.test(app) && /id="ob-file"/.test(app));
ok('app: nav labels default on', /FCONF\.navLabels !== false/.test(app));
ok('app: net_worth tool', /id:'net_worth'/.test(app) || /id: 'net_worth'/.test(app));
ok('app: pulse tool', /id:'pulse'/.test(app) || /id: 'pulse'/.test(app));
ok('app: leaks tool', /id:'leaks'/.test(app) || /id: 'leaks'/.test(app));
ok('app: propose_rules tool', /id:'propose_rules'/.test(app) || /id: 'propose_rules'/.test(app));
ok('app: txRetrieve in-browser RAG', /txRetrieve\(/.test(app) && /\/\/ <tx-retrieve>/.test(app));
ok('app: payeeSummary last+total lookup', /payeeSummary\(/.test(app));
ok('app: cashflow what-if tool', /cashflow_whatif/.test(app) && /planHint\(text\)/.test(app));
ok('app: payment monthly uses typical bill', /payment_monthly/.test(app) && /paySeries\(/.test(app));
ok('app: save plan tool', /save_plan/.test(app));
ok('app: budget notice tool', /budget_notice/.test(app));
ok('app: household snapshot for LM fluency', /function householdSnapshot/.test(app) && /function catSpeak/.test(app));
ok('app: cacheable static system prompt', /function systemPromptStatic\(/.test(app) && /function systemPromptHousehold\(/.test(app));
ok('app: relay sends convId for Grok cache', /convId:\s*opts\.convId/.test(app));
ok('app: demo skips hosted consume', /!sample && purpose === 'chat'|!window\.__lfDemo/.test(app) && /__lfDemo/.test(app));
ok('app: cloud vault block', /id="cloudVaultBlock"/.test(app));
ok('app: hosted chrome wrapper', /id="hostedChrome"/.test(app));
// Retired 2026-08-14. This asserts the ABSENCE of a tax-pack applier: the
// shell must not carry code that writes statutory rates into FISCAL from a
// remote pack, because Lithifyte ships no tax figures for any jurisdiction.
// Inverted deliberately — the old check asserted its presence.
// The sign-in gate only executes on app.lithifyte.com, so nothing in the
// self-test ever runs it — which is how a dangling `localeStored()` reference
// shipped and threw on the live /demo page while every check stayed green.
// Actually EXECUTE it here, on the hosted-demo path, with enough of a browser
// stubbed to get through. Any undefined identifier throws, exactly as it would
// in the browser.
//
// The gate is found by CONTENT, not by position. It used to be matched as "the
// first <script> block", which meant adding any earlier script (the pre-paint
// theme applier, 2026-08-23) failed this check without the gate having changed
// at all. Searching for the block that defines isHostedApp still fails loudly
// if the gate is renamed or removed — it just no longer cares what precedes it.
ok('app: sign-in gate executes without throwing (hosted demo path)', (() => {
  const blocks = [...app.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]);
  const src = blocks.find(b => /isHostedApp/.test(b));
  if (!src) return false;   // gate missing entirely; fail loudly
  const noop = () => {};
  const el = new Proxy({}, {
    get: (t, k) => (k === 'style' || k === 'dataset' || k === 'classList'
      ? new Proxy({}, {get: () => noop, set: () => true})
      : (k === 'appendChild' || k === 'setAttribute' || k === 'addEventListener'
         || k === 'removeAttribute' || k === 'prepend' || k === 'remove' ? noop : '')),
    set: () => true,
  });
  const sandbox = {
    window: {}, document: {
      createElement: () => el, getElementById: () => el, querySelector: () => el,
      querySelectorAll: () => [], addEventListener: noop, body: el, documentElement: el,
      readyState: 'complete',
    },
    location: {hostname: 'app.lithifyte.com', pathname: '/demo', href: 'https://app.lithifyte.com/demo',
               search: '', origin: 'https://app.lithifyte.com', replace: noop, assign: noop},
    navigator: {language: 'en-US', languages: ['en-US'], sendBeacon: () => true, userAgent: 'node'},
    localStorage: {getItem: () => null, setItem: noop, removeItem: noop},
    sessionStorage: {getItem: () => null, setItem: noop, removeItem: noop},
    // never resolves: we are checking the synchronous path, not the network
    fetch: () => new Promise(() => {}),
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
    matchMedia: () => ({matches: false, addEventListener: noop}),
    console: {log: noop, warn: noop, error: noop},
    URLSearchParams: globalThis.URLSearchParams, JSON, Date, Math, String, Number,
    Object, Array, Promise, RegExp, Error,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  try {
    vm.runInNewContext(src, vm.createContext(sandbox), {timeout: 4000});
    return true;
  } catch (e) {
    console.log('       gate threw: ' + (e && e.message));
    return false;
  }
})());
ok('app: no tax-pack applier', !/applyFiscalPack/.test(app));
ok('app: ships no tax rates in the seed', (() => {
  const i = app.lastIndexOf('<script id="finance-data" type="application/json">');
  if (i < 0) return false;
  const j = app.indexOf('</script>', i);
  let d;
  try { d = JSON.parse(app.slice(i + '<script id="finance-data" type="application/json">'.length, j)); }
  catch (e) { return false; }
  const banned = ['country','netToGross','payeShareOfGross','pensionReliefRate','fundsExitTax',
                  'dirtRate','htbCap','htbYears','pensionAgeBands','capacityPerThousand',
                  'cgtRate','cgtExemption','verifiedOn'];
  return !banned.some(k => (d.fiscal || {})[k] != null);
})());
ok('app: declarative importer packs', /impRegisterDeclarative/.test(app));
ok('app: no public workers path', !/www\/workers\/access\.js/.test(app));
// Version identity. On 2026-08-14 four sources disagreed about what version
// the app was (in-app 1.2, latest release v1.1, tags to v1.8, describe v1.0-71
// after the history rewrite orphaned every tag from v1.1 on). version.json is
// now the single source and this fails the build if the app drifts from it —
// an update notifier is worthless if the app cannot state its own version.
ok('app: APP_VER matches version.json', (() => {
  const m = app.match(/\bAPP_VER\s*=\s*'([^']*)'/);
  if (!m) return false;
  let man;
  try { man = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf8')); }
  catch (e) { return false; }
  return !!man.version && man.version === m[1];
})());
ok('app: DATA_VERSION matches version.json', (() => {
  const m = app.match(/const DATA_VERSION = (\d+);/);
  if (!m) return false;
  let man;
  try { man = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf8')); }
  catch (e) { return false; }
  return man.dataVersion === Number(m[1]);
})());
(() => {
  let man;
  try { man = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf8')); }
  catch (e) { ok('app: version.json sha256 matches index.html', false, String(e && e.message || e)); return; }
  if (!man.sha256) { ok('app: version.json sha256 matches index.html', false, 'manifest has no sha256'); return; }
  const actual = createHash('sha256').update(readFileSync(appPath)).digest('hex');
  ok(
    'app: version.json sha256 matches index.html',
    man.sha256 === actual,
    man.sha256 === actual ? '' : ('manifest ' + man.sha256.slice(0, 12) + ' actual ' + actual.slice(0, 12))
  );
})();
ok('app: update UI is not inside hostedChrome', (() => {
  const u = app.indexOf('id="updateBlock"');
  const h = app.indexOf('id="hostedChrome"');
  const hEnd = app.indexOf('id="cloudVaultBlock"');
  if (u < 0 || h < 0) return false;
  return u < h || u > hEnd;
})());
ok('app: no Ireland-tax-pack sales pitch', !/Ireland tax \/ bank-preset/i.test(app) && !/live tax\/bank packs/i.test(app));
ok('app: no leftover personal name in finance-data seed', (() => {
  const i = app.lastIndexOf('<script id="finance-data" type="application/json">');
  if (i < 0) return false;
  const j = app.indexOf('</script>', i);
  const block = app.slice(i, j);
  try {
    const json = JSON.parse(block.slice(block.indexOf('{')));
    if (json.demo) return true;
    const n = (json.transactions || []).length;
    return n === 0 || 'seed has ' + n + ' transactions';
  } catch (e) {
    return 'finance-data is not JSON: ' + e.message;
  }
})());

const banned = [
  /Bank data never leaves your device/i,
  /Financial data is never sent to a server/i,
  /your bank data never leaves/i,
];
for (const re of banned) {
  ok('landing: no absolute claim ' + re.source, !re.test(land), re.test(land) ? 'still present' : '');
}
ok('landing: honest hosted-AI slice', /slice a question needs/i.test(land));
ok('landing: drop/start still points at the sample', /app\.lithifyte\.com\/demo/.test(land));

if (fails.length) {
  console.error('\n' + fails.length + ' check(s) failed.');
  process.exit(1);
}
console.log('\nall checks passed.');
