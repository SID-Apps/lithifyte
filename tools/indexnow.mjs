#!/usr/bin/env node
/**
 * indexnow.mjs — tell Bing, Yandex, Seznam and Naver that URLs changed.
 *
 *   node tools/indexnow.mjs                 # submit every URL in the sitemap
 *   node tools/indexnow.mjs /learn /faq     # submit specific paths
 *   node tools/indexnow.mjs --dry           # print the payload, send nothing
 *
 * IndexNow is a push protocol: instead of waiting to be recrawled, you post a
 * list of changed URLs and the participating engines fetch them. Google does
 * not participate — for Google, the sitemap plus Search Console is the path.
 *
 * Ownership is proved by hosting KEY.txt at the site root containing the key.
 * That file is committed alongside this script; if it is ever removed, every
 * submission starts failing silently with a 403.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = '1be1acc785b259195bf802c1a31bc775';
const HOST = 'lithifyte.com';
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const paths = args.filter((a) => !a.startsWith('--'));

function sitemapUrls() {
  const xml = readFileSync(join(ROOT, 'www', 'rev2', 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const urlList = paths.length
  ? paths.map((p) => (p.startsWith('http') ? p : `https://${HOST}${p.startsWith('/') ? p : '/' + p}`))
  : sitemapUrls();

const body = { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList };

console.log(`${dry ? 'would submit' : 'submitting'} ${urlList.length} URLs to IndexNow`);
for (const u of urlList) console.log('  ' + u);

if (dry) process.exit(0);

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

// 200 accepted, 202 accepted but key still being validated. Anything else is a
// real failure worth reading: 403 means the key file is missing or mismatched.
console.log(`\n${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}
console.log('accepted');
