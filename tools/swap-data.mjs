#!/usr/bin/env node
// swap-data.mjs — the Lithifyte release tool.
//
// A Lithifyte build = one shared SHELL (all the code) + one embedded
// finance-data block (the transactions/rules/goals JSON). This script swaps
// the data block of one build into the shell of another, which covers both
// release directions:
//
//   Publish a new shell (code changed, keep your data private):
//     node tools/swap-data.mjs index.html my-dashboard.html my-dashboard.html
//     → your personal build gets the new code, your data never leaves it.
//
//   Regenerate the public blank-slate build after editing your personal one:
//     node tools/swap-data.mjs my-dashboard.html index.html index.html
//     → index.html gets the new code with its own (empty) seed data intact.
//
//   General form:  swap-data.mjs <code-from> <data-from> <out>
//
// The finance-data block is located with lastIndexOf, NOT a regex — the
// AI-contract comment at the top of the file mentions the tag in prose, so
// naive matching grabs the wrong occurrence. Keep it this way.

import {readFileSync, writeFileSync} from 'node:fs';

const TAG = '<script id="finance-data" type="application/json">';
const END = '</script>';

function block(s, name){
  const i = s.lastIndexOf(TAG);
  if (i < 0) throw new Error(name + ': no finance-data block found');
  const j = s.indexOf(END, i);
  if (j < 0) throw new Error(name + ': finance-data block never closes');
  return {i, j: j + END.length};
}

const [codeFrom, dataFrom, out] = process.argv.slice(2);
if (!codeFrom || !dataFrom || !out){
  console.error('Usage: node tools/swap-data.mjs <code-from.html> <data-from.html> <out.html>');
  process.exit(1);
}

const code = readFileSync(codeFrom, 'utf8');
const data = readFileSync(dataFrom, 'utf8');
const cb = block(code, codeFrom);
const db = block(data, dataFrom);
const dataBlock = data.slice(db.i, db.j);

// sanity: the data block must be valid JSON with the expected top-level keys
const json = JSON.parse(dataBlock.slice(TAG.length, dataBlock.length - END.length));
for (const k of ['transactions', 'users', 'accounts', 'goals'])
  if (!(k in json)) throw new Error(dataFrom + ': data block is missing "' + k + '"');

writeFileSync(out, code.slice(0, cb.i) + dataBlock + code.slice(cb.j));
console.log(out + ': ' + (code.length - (cb.j - cb.i) + dataBlock.length) + ' bytes — code from ' +
  codeFrom + ', data from ' + dataFrom + ' (' + json.transactions.length + ' embedded transactions)');
console.log('Now open it and check the self-test is green before shipping.');
