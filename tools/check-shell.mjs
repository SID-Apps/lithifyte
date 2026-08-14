#!/usr/bin/env node
// check-shell.mjs — fail the release loop if the public shell drifted from
// the claims we make to users and to agents.
//
//   node tools/check-shell.mjs [index.html] [landing.html]
//
// Defaults: index.html and www/rev2/index.html, relative to cwd (the repo).
// Exit 0 only when every check passes. Does not upload anything.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
ok('app: demo skips hosted consume', /!sample && purpose === 'chat'|!window\.__lfDemo/.test(app) && /__lfDemo/.test(app));
ok('app: cloud vault block', /id="cloudVaultBlock"/.test(app));
ok('app: hosted chrome wrapper', /id="hostedChrome"/.test(app));
// Retired 2026-08-14. This asserts the ABSENCE of a tax-pack applier: the
// shell must not carry code that writes statutory rates into FISCAL from a
// remote pack, because Lithifyte ships no tax figures for any jurisdiction.
// Inverted deliberately — the old check asserted its presence.
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
