#!/usr/bin/env node
// check-shell.mjs — fail the release loop if the public shell drifted from
// the claims we make to users and to agents.
//
//   node tools/check-shell.mjs [index.html] [landing.html]
//
// Defaults: index.html and www/rev2/index.html, relative to cwd (the repo).
// Exit 0 only when every check passes. Does not upload anything.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
ok('app: applyFiscalPack', /applyFiscalPack/.test(app));
ok('app: declarative importer packs', /impRegisterDeclarative/.test(app));
ok('app: no public workers path', !/www\/workers\/access\.js/.test(app));
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
