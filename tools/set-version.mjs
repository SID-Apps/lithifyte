#!/usr/bin/env node
/**
 * set-version.mjs — the single place a Lithifyte version number is decided.
 *
 *   node tools/set-version.mjs 2.0.0                 # bump, then rebuild
 *   node tools/set-version.mjs 2.0.0 --notes "..."   # with release notes
 *   node tools/set-version.mjs --check               # verify, write nothing
 *
 * Why this exists: on 2026-08-14 four sources disagreed about what version
 * the app was. The in-app constant said 1.2, the latest published GitHub
 * release said v1.1, the remote carried tags up to v1.8, and `git describe`
 * on main returned v1.0-71 — because the 2026-08-13 history rewrite orphaned
 * every tag from v1.1 onward. You cannot tell a user "you are on X, Y is
 * available" when nothing agrees on X.
 *
 * The fix is to stop deriving identity from git. `version.json` at the repo
 * root is the source of truth; APP_VER in the app must equal it; and
 * check-shell.mjs fails the build if they drift. Tags and releases become
 * cosmetic, which also means a future history rewrite cannot break versioning
 * again.
 *
 * The sha256 in version.json is of the built index.html, recorded AFTER
 * APP_VER is written into it. A self-updating client can fetch the new file
 * and verify it against this hash before replacing itself — never install
 * bytes you have not checked.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'version.json');
const APP = join(ROOT, 'index.html');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const STAMP = args.includes('--stamp');
const version = args.find((a) => /^\d+\.\d+\.\d+$/.test(a));
const notesIdx = args.indexOf('--notes');
const notes = notesIdx >= 0 ? args[notesIdx + 1] : null;

const APP_VER_RE = /(\bAPP_VER\s*=\s*')([^']*)(')/;

const readManifest = () =>
  existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

const appVersionOf = (file) => {
  const m = readFileSync(file, 'utf8').match(APP_VER_RE);
  return m ? m[2] : null;
};

const sha256 = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

/* ─────────────────────────────── stamp hash only ─────────────────────────────── */

if (STAMP) {
  const man = readManifest();
  if (!man.version) {
    console.error('version.json has no version — refuse to stamp');
    process.exit(1);
  }
  man.sha256 = existsSync(APP) ? sha256(APP) : null;
  writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
  console.log(`stamped sha256 ${man.sha256} for ${man.version}`);
  process.exit(0);
}

/* ─────────────────────────────── check ─────────────────────────────── */

if (CHECK || !version) {
  const man = readManifest();
  const inApp = existsSync(APP) ? appVersionOf(APP) : null;
  let bad = 0;
  const line = (ok, msg) => {
    console.log((ok ? '  ok  ' : '  FAIL') + '  ' + msg);
    if (!ok) bad++;
  };

  line(!!man.version, `version.json declares a version (${man.version || 'missing'})`);
  line(inApp != null, `index.html carries APP_VER (${inApp || 'missing'})`);
  line(man.version === inApp, `they agree (${man.version} vs ${inApp})`);
  if (man.sha256 && existsSync(APP)) {
    const actual = sha256(APP);
    line(
      man.sha256 === actual,
      `sha256 matches the built index.html` +
        (man.sha256 === actual ? '' : `\n         manifest ${man.sha256}\n         actual   ${actual}`)
    );
  }

  if (!version) {
    console.log(
      bad
        ? `\n${bad} problem(s). Fix with: node tools/set-version.mjs <x.y.z>`
        : '\nversioning is consistent.'
    );
    process.exit(bad ? 1 : 0);
  }
}

/* ─────────────────────────────── write ─────────────────────────────── */

const man = readManifest();
const prev = man.version || null;

// APP_VER lives in the shell, so it has to be written into every build that
// carries one. deposit-dashboard.html is the personal build and lives outside
// the repo; pass it explicitly when you want it bumped too.
const targets = [APP, join(ROOT, 'demo.html')]
  .concat(args.filter((a) => a.endsWith('.html') && existsSync(a)))
  .filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);

for (const f of targets) {
  const s = readFileSync(f, 'utf8');
  if (!APP_VER_RE.test(s)) {
    console.error(`  skip  ${f} — no APP_VER found`);
    continue;
  }
  writeFileSync(f, s.replace(APP_VER_RE, `$1${version}$3`));
  console.log(`  set   ${f} → APP_VER '${version}'`);
}

const next = {
  version,
  released: new Date().toISOString().slice(0, 10),
  notes: notes || man.notes || '',
  // A client on an older DATA_VERSION can tell from this whether updating
  // will migrate its stored data, and warn before it does.
  dataVersion: man.dataVersion || null,
  url: 'https://raw.githubusercontent.com/SID-Apps/lithifyte/main/index.html',
  // recorded last, over the file as it now stands
  sha256: existsSync(APP) ? sha256(APP) : null,
};

writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + '\n');
console.log(`  set   version.json → ${prev || '(none)'} → ${version}`);
console.log(`  sha256 ${next.sha256}`);
console.log('\nRebuild demo if the shell changed, then run: node tools/check-shell.mjs index.html');
