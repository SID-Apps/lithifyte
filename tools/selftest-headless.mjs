#!/usr/bin/env node
/**
 * selftest-headless.mjs — run the app's own self-test in headless Chrome and
 * report the real pass/fail counts.
 *
 *   node tools/selftest-headless.mjs [index.html demo.html]
 *
 * Why: hourly-validate.sh's "headless self-test" step greps the dumped DOM for
 * /self-test[^<]{0,80}/ — which matches a source comment, so it printed a
 * cheerful line whether or not a single test passed. This drives the page over
 * CDP and calls window.__ddSelfTest(), which resolves to {pass, n, fails}.
 *
 * No dependencies: Chrome's DevTools protocol over the WebSocket built into
 * Node 22.
 */
import { spawn } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html', 'demo.html'];
const PORT = 9333 + (process.pid % 400);
const TIMEOUT_MS = 120000;

if (!existsSync(CHROME)) {
  console.error('chrome not found at ' + CHROME + ' (set CHROME=/path/to/chrome)');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/lithifyte-selftest-' + process.pid,
  'about:blank',
], { stdio: 'ignore' });

const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

async function endpoint() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await sleep(100);
  }
  throw new Error('chrome did not open a debugging port');
}

/** Minimal CDP client: send a command, await its reply by id. */
function cdp(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const waiting = new Map();
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve: ok, reject: no } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? no(new Error(msg.error.message)) : ok(msg.result);
    }
  };
  return {
    ready,
    send(method, params = {}, sessionId) {
      const mid = ++id;
      return new Promise((ok, no) => {
        waiting.set(mid, { resolve: ok, reject: no });
        ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
        setTimeout(() => { if (waiting.has(mid)) { waiting.delete(mid); no(new Error(method + ' timed out')); } }, TIMEOUT_MS);
      });
    },
    close() { try { ws.close(); } catch {} },
  };
}

const client = cdp(await endpoint());
await client.ready;

let bad = 0;
for (const page of PAGES) {
  const file = resolve(ROOT, page);
  if (!existsSync(file)) { console.log(`${page}: MISSING`); bad++; continue; }

  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Page.enable', {}, sessionId);
  await client.send('Runtime.enable', {}, sessionId);
  await client.send('Page.navigate', { url: 'file://' + file }, sessionId);

  // The self-test hook is installed during boot; boot is not instant on a
  // 1.4 MB single-file app with a 1,100-row household.
  let out = null;
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    const r = await client.send('Runtime.evaluate', {
      expression: 'typeof window.__ddSelfTest === "function"', returnByValue: true,
    }, sessionId);
    if (r.result && r.result.value) { out = 'ready'; break; }
  }
  if (!out) { console.log(`${page}: __ddSelfTest never appeared`); bad++; continue; }

  const r = await client.send('Runtime.evaluate', {
    expression: `(async () => { const r = await window.__ddSelfTest();
      // pass is a boolean, n is the test count, fails are objects.
      return { ok: !!r.pass, n: r.n,
               fails: (r.fails || []).slice(0, 12).map(f =>
                 typeof f === 'string' ? f
                   : [f.name, f.msg || f.message || f.err || f.reason].filter(Boolean).join(' — ') || JSON.stringify(f)) }; })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);

  const v = r.result && r.result.value;
  if (!v) { console.log(`${page}: self-test returned nothing`); bad++; continue; }
  const ok = v.ok && !(v.fails || []).length;
  console.log(`${page}: ${ok ? 'all ' + v.n + ' pass' : (v.n - (v.fails || []).length) + '/' + v.n + '  ← FAILING'}`);
  for (const f of v.fails || []) console.log('   FAIL ' + String(f).slice(0, 160));
  if (!ok) bad++;
  await client.send('Target.closeTarget', { targetId });
}

client.close();
cleanup();
process.exit(bad ? 1 : 0);
