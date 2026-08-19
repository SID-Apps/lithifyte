#!/usr/bin/env node
/**
 * eval-copilot.mjs — behavioural eval for the LM co-pilot.
 *
 * Spec: vault "Lithifyte - LM Engine Redesign" §6 / §10. This is step 1 of the
 * build order, and it is expected to be RED: it measures today's engine against
 * the behaviour the redesign is supposed to produce.
 *
 *   node tools/eval-copilot.mjs                 mock   (default, no network)
 *   node tools/eval-copilot.mjs --mode live-N   live nano through the relay
 *   node tools/eval-copilot.mjs --mode live-S   live Grok (needs XAI_API_KEY set)
 *   node tools/eval-copilot.mjs --only 7,13     run some fixtures
 *   node tools/eval-copilot.mjs --verbose       print the answer and the path
 *
 * HOW IT RUNS THE APP
 * The routing and guard code is extracted verbatim from index.html between the
 * `// <lm-route>` and `// <lm-guards>` markers and run in Node — the same
 * extract-and-run pattern as tools/test-tx-retrieve.mjs. Those regions are
 * DOM-free by contract; if someone moves a document call into them, the
 * extract throws here instead of failing silently.
 *
 * WHAT IT DOES NOT TEST
 * Engine arithmetic. Tools are stubbed, because the Engine already has its own
 * self-tests and this harness exists to test the engine's *decisions*: which
 * tool ran, how many rounds it took, how many hosted calls it cost, and whether
 * the model's sentence survived. `mustGround` therefore checks that every
 * figure in the answer traces to a tool result or the user's own words — not
 * that the figure is arithmetically right.
 *
 * THE DRIVER
 * `runTurn()` re-implements the decision order of handle() / askLm() using the
 * extracted functions. It is deliberately thin, and it shrinks as the redesign
 * lands: once Understand / Brief / Speak are pure functions inside the markers,
 * the driver calls them instead of mirroring them. If the driver and the app
 * ever disagree, the driver is wrong — that is what live-N mode is for.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadHousehold } from './fixtures/household.mjs';
import { FIXTURES, assertHouseholdMatches, GROUPS } from './fixtures/copilot-40.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RELAY = 'https://lithifyte-ai.sidethecomputer.workers.dev';

// ── args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const argOf = (flag, dflt) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const MODE = argOf('--mode', 'mock');
const VERBOSE = argv.includes('--verbose');
// The write layer only exists once the user grants assistant consent, so the
// consent-off run — which is all the harness could do before — does not cover
// the configuration the product actually ships in.
const CONSENT = argv.includes('--consent');
const ONLY = (argOf('--only', '') || '').split(',').map((s) => +s.trim()).filter(Boolean);
if (!['mock', 'live-N', 'live-S'].includes(MODE)) {
  console.error('unknown --mode ' + MODE + ' (mock | live-N | live-S)');
  process.exit(2);
}

// ── extract the engine out of the shell ───────────────────────────────────
function extract(html, name) {
  const re = new RegExp('//\\s*<' + name + '>\\n([\\s\\S]*?)//\\s*</' + name + '>');
  const m = html.match(re);
  if (!m) throw new Error('<' + name + '> markers missing from index.html');
  const body = m[1];
  // Scan code only — the marker's own comment says the word "document".
  const code = body.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const dom = code.match(/\b(document|localStorage|window\.|indexedDB)\b/);
  if (dom) throw new Error('<' + name + '> is no longer DOM-free (found "' + dom[1] + '") — the harness cannot run it');
  return body;
}

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const txBlock = extract(html, 'tx-retrieve');
const routeBlock = extract(html, 'lm-route');
const guardBlock = extract(html, 'lm-guards');

const H = loadHousehold();
const problems = assertHouseholdMatches(H);
if (problems.length) {
  console.error('recorded household no longer matches the fixtures:\n  ' + problems.join('\n  '));
  process.exit(2);
}

// Engine: the real retrieve/planHint kernels, plus the few helpers the
// extracted regions call that live elsewhere in the shell.
const H_RANGE = { from: H.range[0], to: H.range[H.range.length - 1], months: H.range };

// Shell-wide helpers the extracted kernels reach for. Stubbed, not
// re-implemented: they format, they do not decide.
globalThis.fmtMoLbl = (m) => String(m || '');
globalThis.esc = (s) => String(s == null ? '' : s);
// The shell's live range window (index.html:6547). The recorded household is
// the last 12 recorded months.
globalThis.rangeFrom = H_RANGE.from;
globalThis.rangeTo = H_RANGE.to;
globalThis.RANGE = new Set(H_RANGE.months);
globalThis.RN = H_RANGE.months.length;

const Engine = {};
new Function('Engine', `Object.assign(Engine, {\n${txBlock}\n});`)(Engine);
Engine.minimise = { scrub: (s) => String(s || ''), revealText: (s) => String(s || '') };
Engine.flexOf = (s) => (/rent|loan|mortgage|insurance|avant/i.test(String(s)) ? 'fixed' : 'movable');
Engine.CAT_SYN = Engine.CAT_SYN || { grocery: 'groceries', shop: 'shopping', food: 'groceries' };

const eur = (n) => '€' + (Math.round((+n || 0) * 100) / 100).toLocaleString('en-IE');
const ctx = {
  Engine,
  A: H.A,
  TX: H.TX,
  MONTHS: H.MONTHS,
  REC: H.REC,
  INT_CAT: 'Internal transfer',
  MONEY: { base: 'EUR', locale: 'en-IE' },
  eur,
  lmEnabled: () => MODE !== 'commands',
  cashflowFigures: () => H.figures,
  rangeLabel: () => H.rangeLabel,
  acctMap: () => ({ aliases: { acct_1: 'd-ava', acct_2: 'd-ben' } }),
  historyBudgetLines: () =>
    H.A.cats12.slice(0, 12).map((c) => ({
      category: c.category,
      amount: Math.round(c.avg),
      rangeAvg: Math.round(c.avg),
      flex: Engine.flexOf(c.category),
    })),
  // recentAsk folds in earlier user turns; single-turn fixtures have none.
  recentAsk: (t) => String(t || ''),
  aiAssistantGranted: () => CONSENT,
};

const EXPORTS = [
  'registry', 'toolSchemasForPrompt', 'norm', 'allCatNames', 'findCategory', 'findMonth',
  'findRangePreset', 'findSection', 'isSmallTalk', 'greetSay', 'match', 'understand', 'prefetchFor', 'sameAsk', 'missingSlots', 'ASK_FOR', 'askFor', 'greetBrief', 'tidySay', 'LOCAL_INTENTS',
  'normLmObj', 'parseLmJson', 'systemPromptStatic', 'systemPromptHousehold', 'systemPrompt',
  'joinSays', 'amts', 'moneyish', 'wantsDraft', 'unbackedFigures', 'briefFor', 'householdSnapshot',
];
const keys = Object.keys(ctx);
const engine = new Function(
  ...keys,
  `${routeBlock}\n${guardBlock}\nreturn {${EXPORTS.join(',')}};`
)(...keys.map((k) => ctx[k]));

// ── tool stubs ────────────────────────────────────────────────────────────
// Recorded sentences over the recorded household. Figures are plain arithmetic
// so `mustGround` has something real to trace against.
const topCat = H.A.cats12.find((c) => c.category === 'Groceries') || H.A.cats12[0];
const loan = H.REC.find((r) => /avant/i.test(r.merchant)) || H.REC[0];
const F = H.figures;

const TOOL_SAYS = {
  help: 'I can show cashflow, categories, balances, budgets, goals and transactions.',
  nav: 'Opening that section.',
  set_range: 'Range set to ' + H.rangeLabel + '.',
  cashflow_summary: `Over ${H.rangeLabel}: ${eur(F.income)} in, ${eur(F.spend)} out — ${eur(F.spare)} left over a month.`,
  cat_monthly: `${topCat.category} ran ${eur(topCat.avg)} a month over ${H.range.length} months.`,
  balances: 'Balances across four accounts.',
  summary_outlook: `Next month looks like ${eur(F.spare)} spare on current pace.`,
  affordability: `On ${eur(F.spare)} spare a month that commitment fits with room left.`,
  cashflow_whatif: `With those changes month-end moves to ${eur(F.spare + 200)}.`,
  payment_monthly: `${loan.merchant} is ${eur(loan.avg)} a month — the standing order, not a range average.`,
  save_plan: `You could put aside about ${eur(F.spare)} a month.`,
  budget_notice: `You have ${eur(F.spare)} spare. Rent (${eur(1600)}) is fixed; ${topCat.category} at ${eur(topCat.avg)} is the movable one.`,
  spend_ranked: H.A.cats12.slice(0, 3).map((c) => `${c.category} ${eur(c.avg)}`).join(', ') + ' are the biggest lines.',
  find_transactions: 'TESCO STORES — last 2026-06-12 · €42.10 (Groceries). 8 payments · €336.80 total across all imported statements.',
  net_worth: 'Net worth across cash, pots and holdings.',
  pulse: 'Household pulse is 72 out of 100.',
  leaks: 'Supermarket top-ups and card-machine noise are the leak groups.',
  notes_for: 'No notes on that yet.',
  goals_status: 'Two goals: house deposit and a trip.',
  propose_budget: 'Drafted a sandbox budget from history — nothing is live until you apply it.',
  propose_goal: 'Drafted a sandbox goal — nothing is live until you apply it.',
  propose_rules: 'Drafted categorisation rules — nothing is live until you apply them.',
  run_scenario: 'Ran the scenario in the sandbox.',
  apply_scenario: 'Applied.',
};
const SANDBOX = ['propose_budget', 'propose_goal', 'propose_rules', 'apply_scenario'];

function runTool(intent) {
  const t = intent.tool;
  const say = TOOL_SAYS[t] || ('Ran ' + t + '.');
  return {
    tool: t,
    ok: !!TOOL_SAYS[t],
    say,
    data: t === 'find_transactions' ? { rows: new Array(8).fill(0).map((_, i) => ({ m: 'TESCO STORES', de: 20 + i })) } : {},
    provenance: H.rangeLabel,
    writes: SANDBOX.includes(t),
  };
}

// ── the model ─────────────────────────────────────────────────────────────
// mock: the measured nano. Every reply on 15 Aug collapsed the envelope (tool
// name in "type") and none was ever type:final — including on "Hi", which came
// back as a nav. Reproduced deterministically so mock mode tests our handling
// of the worst case we have actually observed.
function nanoSim(userText, nudges, state) {
  const n = String(userText || '').toLowerCase();

  if (state.greet) {
    const spare = (String(state.grounded || '').match(/about ([^\n]+?) left over/) || [])[1] || '';
    return JSON.stringify({ type: 'final',
      say: 'Hello — you have about ' + spare + ' left over a month. What would you like to look at?' });
  }
  // Told there is no tool for this, a model that reads its instructions says
  // so. Profile E may not — that is what live-N is for.
  if (state.unknownIntent) {
    return JSON.stringify({ type: 'final',
      say: 'I can only go on what you have imported, and there is nothing in it that tells me that. ' +
           'I can show you what you actually paid out if that helps.' });
  }
  if (state.needSlots && state.needSlots.length && !nudges.includes('noask')) {
    return JSON.stringify({ type: 'ask', question: 'Which one did you have in mind?' });
  }

  // Given the real numbers back, it answers with them. This is the behaviour
  // the correction round depends on, and the one profile E showed live: it can
  // write a final, it just does not check its arithmetic first.
  if (state.corrected) {
    return JSON.stringify({ type: 'final', say: 'Right — ' + String(state.grounded || '').split('\n')[0] +
      (state.adviceOpen ? ' Want me to draft that as a sandbox budget you can edit before applying?' : '') });
  }

  // Once it has a tool result it usually commits to an answer rather than
  // calling another tool. Measured live on 16 Aug: fixture 7 ran three tools
  // and then produced prose that the guards struck out for an invented figure.
  // Deterministic per sentence so the run is repeatable.
  if (state.advise) {
    return JSON.stringify({ type: 'final',
      say: String(state.grounded || '').split('\n')[0] +
        ' Rent is fixed, so the movable lines are the place to start. ' +
        'Want me to draft that as a sandbox budget you can edit before applying?' });
  }
  if (state.stepCount >= 1 && !nudges.length) {
    const invents = userText.length % 2 === 0;
    const first = String(state.grounded || '').split('\n')[0];
    const offer = state.adviceOpen
      ? ' Want me to draft that as a sandbox budget you can edit before applying?'
      : '';
    return JSON.stringify({
      type: 'final',
      say: invents
        ? first + ' You could free up €1,250 a month by trimming that.' + offer   // €1,250 came from nowhere
        : first + ' The fixed lines are the ones to leave alone.' + offer,
    });
  }

  const pick = () => {
    if (nudges.length) {
      // measured escalation after a refusal: another read tool, then a repeat
      const seq = ['cat_monthly', 'spend_ranked', 'cat_monthly', 'budget_notice'];
      return seq[Math.min(nudges.length - 1, seq.length - 1)];
    }
    if (/^(hi|hello|hey|good morning|thanks)/.test(n)) return 'nav';
    if (/\brules?\b/.test(n)) return 'propose_rules';
    if (/\bgoal\b|save for|saving for/.test(n)) return 'propose_goal';
    if (/restructure|in order|budget/.test(n)) return 'propose_budget';
    if (/notice|how am i doing|improve|cut back/.test(n)) return 'budget_notice';
    if (/afford|installment/.test(n)) return 'affordability';
    if (/show me|list|spent at|transactions|did i pay|last pay|paid to|search /.test(n)) return 'find_transactions';
    if (/payment|how much is/.test(n)) return 'payment_monthly';
    if (/save|reach/.test(n)) return 'save_plan';
    if (/cut .* by|finished/.test(n)) return 'cashflow_whatif';
    if (/net worth/.test(n)) return 'net_worth';
    if (/pulse/.test(n)) return 'pulse';
    if (/leak/.test(n)) return 'leaks';
    if (/tax/.test(n)) return 'cashflow_summary';
    return 'cat_monthly';
  };
  return JSON.stringify({ type: pick(), args: {} }); // collapsed envelope
}

// What actually answered in a live run. A live-N run silently served by the
// Workers AI fallback is not a live-N run, and the report has to say so.
let liveCapability = null;
// Answer-only: the same envelope minus "tool". Once the Engine has already run
// what the question needed, a tool call is not a shape the model should be able
// to emit — the full schema below still permits one, and that permission is
// what cost a second hosted call on Grok.
const ANSWER_SCHEMA = {
  type: 'json_schema',
  json_schema: { name: 'copilot_answer', strict: true, schema: {
    type: 'object', additionalProperties: false,
    properties: { type: { type: 'string', enum: ['final', 'ask'] },
                  say: { type: ['string', 'null'] }, question: { type: ['string', 'null'] } },
    required: ['type', 'say', 'question'] } },
};
// Nothing missing → no ask. Mirrors the app's FINAL_SCHEMA.
const FINAL_SCHEMA = JSON.parse(JSON.stringify(ANSWER_SCHEMA));
FINAL_SCHEMA.json_schema.name = 'copilot_final';
FINAL_SCHEMA.json_schema.schema.properties.type.enum = ['final'];
async function liveModel(messages, shape) {
  const res = await fetch(RELAY + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.lithifyte.com' },
    body: JSON.stringify({
      provider: 'lithifyte', purpose: 'chat', convId: 'eval', temperature: 0, max_tokens: 1600, messages,
      response_format: shape === 'final' ? FINAL_SCHEMA : shape === 'answer' ? ANSWER_SCHEMA : {
        type: 'json_schema',
        json_schema: {
          name: 'lithifyte_turn',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              type: { type: 'string', enum: ['tool', 'final', 'ask'] },
              name: { type: ['string', 'null'] },
              args: { type: ['object', 'null'] },
              say: { type: ['string', 'null'] },
              question: { type: ['string', 'null'] }
            },
            required: ['type']
          }
        }
      }
    }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'relay HTTP ' + res.status);
  // Record what actually answered. A live-N run that is silently served by the
  // Workers AI fallback is not a live-N run, and the report has to say so.
  if (d.capability) liveCapability = d.capability;
  else if (d.upstream || d.fallback) liveCapability = { upstream: d.upstream || 'workers-ai', profile: '?' };
  return String(d.content || '');
}

let greetCache = null;   // one "session" per harness run

// ── the driver: handle() / askLm() decision order ─────────────────────────
async function runTurn(text) {
  const path = { tools: [], rounds: 0, hostedCalls: 0, refusals: 0, say: '', route: '', substituted: false, wrote: false };
  if (!String(text || '').trim()) { path.route = 'empty'; return path; }

  if (engine.isSmallTalk(text)) {
    // A turn, not a lookup: the model writes it once per session from a
    // three-line brief, and later greetings reuse it for free.
    path.route = 'greet';
    if (greetCache) { path.say = greetCache; path.cached = true; return path; }
    path.hostedCalls++;
    path.rounds++;
    const raw = MODE === 'mock'
      ? nanoSim(text, [], { greet: true, grounded: engine.greetBrief() })
      : await liveModel([{ role: 'system', content: 'Greet them in one short sentence and ask what they want to look at. Reply {"type":"final","say":"…"}' },
                         { role: 'user', content: engine.greetBrief() + '\n\nThey said: ' + text }]);
    const parsed = engine.parseLmJson(raw);
    const t = engine.tidySay((parsed && (parsed.say || parsed.question)) || raw);
    path.say = (t && !engine.unbackedFigures(engine.greetBrief(), t, text).length) ? t : engine.greetSay();
    if (path.say !== engine.greetSay()) { greetCache = path.say; path.spoken = true; }
    return path;
  }

  // Step 4: the driver no longer mirrors match()/planHint() — it calls the
  // app's own Understand, which is the point of having one intent layer.
  const LOCAL_INTENTS = engine.LOCAL_INTENTS || ['nav', 'set_range', 'help'];
  const u = engine.understand(text);
  path.declared = u.intent;
  path.confidence = u.confidence;
  const intent = u.tool ? { tool: u.tool, args: u.args || {}, score: u.confidence } : null;
  if (intent && intent.score >= 0.8) {
    if (LOCAL_INTENTS.includes(intent.tool) || MODE === 'commands') {
      path.route = 'match-local';           // nothing to compose — §10.4
      const r = runTool(intent);
      path.tools.push(r.tool);
      path.say = r.say;
      return path;
    }
  }

  // askLm — prefetch, then the model loop
  path.route = 'askLm';
  const steps = [];
  const messages = [
    { role: 'system', content: engine.systemPromptStatic() },
    { role: 'system', content: engine.systemPromptHousehold() },
    { role: 'user', content: text },
  ];
  const seen = new Map();
  const attach = (r, args, note) => {
    if (!r || !r.ok) return;
    steps.push(r);
    path.tools.push(r.tool);
    seen.set(r.tool, r.say);
    seen.set(r.tool + ':args', args || {});
    // The app's attachQuiet puts the result in front of the model. The driver
    // did not, which went unnoticed while the model could still call the tool
    // itself — and produced "I don't have that figure" the moment it could not.
    messages.push({ role: 'user', content: (note || 'Engine result (computed, not a guess). Use these numbers:') +
      '\n' + JSON.stringify({ tool: r.tool, say: r.say, data: r.data }) });
  };

  const needSlots = u.missing || [];
  let asked = false;
  const pre = engine.prefetchFor(u);
  if (pre && pre.tool) attach(runTool(pre), pre.args);
  const plan = Engine.planHint(text);
  if (needSlots.length) { /* ask first — the cascade would guess */ }
  else if (pre && pre.tool) { /* prefetched */ }
  else if (plan.wantsPayment && plan.paymentQuery) attach(runTool({ tool: 'payment_monthly' }));
  else if (plan.wantsSavePlan) attach(runTool({ tool: 'save_plan' }));
  else if (plan.wantsWhatIf && plan.cuts.length) attach(runTool({ tool: 'cashflow_whatif' }));
  else if (plan.wantsAdvice) attach(runTool({ tool: 'budget_notice' }));

  const hint = Engine.txQueryHint(text);
  if (hint.wantsRows && !needSlots.length && !(pre && pre.tool === 'find_transactions'))
    attach(runTool({ tool: 'find_transactions' }), { query: hint.query, month: hint.month });

  const nudges = [];
  let groundedRetry = false;
  let figureRetry = false;
  let repeats = 0;
  let offeredDraft = null;

  const maxRounds = 5;
  for (let round = 0; round < maxRounds; round++) {
    path.rounds++;
    path.hostedCalls++;
    const raw = MODE === 'mock'
      ? nanoSim(text, nudges, { stepCount: steps.length, grounded: engine.joinSays(steps), corrected: figureRetry, advise: !!offeredDraft, adviceOpen: u.intent === 'advice_open', needSlots, unknownIntent: u.intent === 'unknown' })
      : await liveModel(messages,
          needSlots.length ? 'answer' : (steps.length && u.confidence >= 0.85) ? 'final' : null);
    const parsed = engine.parseLmJson(raw);

    if (parsed && parsed.type === 'tool' && parsed.name) {
      if (parsed.name === 'help' && !/^(help|\?|commands|what can you do)/i.test(text)) {
        nudges.push('help'); messages.push({ role: 'user', content: 'Do not list commands.' }); continue;
      }
      // Mirrors index.html: the advice pivot is skipped once assistant consent
      // is granted, so with consent ON a premature propose_* runs instead of
      // being turned into spoken advice.
      if (SANDBOX.includes(parsed.name) && parsed.name !== 'apply_scenario' && !engine.wantsDraft(text) && !CONSENT) {
        // Advice, not a refusal: run what an adviser would look at and ask for
        // speech that ends in an offer.
        if (!offeredDraft) {
          offeredDraft = parsed.name;
          if (!seen.has('budget_notice')) attach(runTool({ tool: 'budget_notice' }));
          if (!seen.has('spend_ranked')) attach(runTool({ tool: 'spend_ranked' }));
        }
        path.offeredDraft = true;
        nudges.push('advise');
        messages.push({ role: 'user', content: 'Do not create a draft yet. Talk to them first, then offer it.' });
        continue;
      }
      if (seen.has(parsed.name) && engine.sameAsk(seen.get(parsed.name + ':args') || {}, parsed.args || {})) {
        if (++repeats >= 3) break;
        nudges.push('repeat');
        messages.push({
          role: 'user',
          content: 'You already have that result:\n' + seen.get(parsed.name) +
            '\n\nDo not call ' + parsed.name + ' again. Answer the question now with {"type":"final","say":"…"}.'
        });
        continue;
      }
      const r = runTool({ tool: parsed.name });
      seen.set(parsed.name, r.say);
      seen.set(parsed.name + ':args', parsed.args || {});
      steps.push(r);
      path.tools.push(r.tool);
      if (r.writes) path.wrote = true;
      messages.push({ role: 'assistant', content: raw });
      messages.push({ role: 'user', content: 'Tool result: ' + r.say });
      continue;
    }

    if (parsed && parsed.type === 'ask' && parsed.question) {
      if (needSlots.length && !asked) {
        let q = engine.tidySay(parsed.question).slice(0, 200);
        if (q && !/\?\s*$/.test(q)) q = q.replace(/[.\s]*$/, '?');
        path.say = q || engine.askFor(needSlots[0], u.intent);
        path.asked = path.say;
        return path;
      }
      nudges.push('noask');
      messages.push({ role: 'user', content: 'You have what you need — answer.' });
      continue;
    }
    let say = (parsed && typeof parsed === 'object' && ('say' in parsed || 'question' in parsed))
      ? String(parsed.say || parsed.question || '').trim()
      : String(raw).slice(0, 1500);
    if (engine.moneyish(say) && !steps.length && !groundedRetry) {
      groundedRetry = true;
      for (const t of ['cashflow_summary', 'balances', 'summary_outlook']) {
        const r = runTool({ tool: t }); steps.push(r); path.tools.push(t);
      }
      messages.push({ role: 'user', content: 'You answered with figures but called no tool.' });
      continue;
    }
    // Speak: verify, ask for one correction, and only then fall back.
    if (steps.length && say) {
      const grounded = engine.joinSays(steps);
      if (grounded) {
        const groundedAll = grounded + '\n' + steps.map((s) => JSON.stringify(s.data || '')).join(' ');
        const unbacked = engine.unbackedFigures(groundedAll, say, text);
        if (unbacked.length && !figureRetry) {
          figureRetry = true;
          path.verifyRetry = true;
          messages.push({ role: 'user', content: 'Those figures are not in the data: ' + unbacked.join(', ') });
          continue;
        }
        if (unbacked.length) {
          const helpful = steps.find((s) => ['cashflow_whatif', 'budget_notice', 'affordability', 'payment_monthly', 'save_plan'].includes(s.tool));
          say = (helpful && helpful.say) || grounded;
          path.substituted = true;
        }
      }
    }
    if (!say && steps.length) { say = engine.joinSays(steps); path.substituted = true; }
    if (needSlots.length && !steps.length) {
      const q = engine.askFor(needSlots[0], u.intent);
      const t = engine.tidySay(say);
      path.say = /\?\s*$/.test(t) ? t : (t && t.length > 8 ? t.replace(/[.\s]*$/, '?') : q);
      path.asked = path.say;
      return path;
    }
    path.say = engine.tidySay(say);
    return path;
  }
  if (needSlots.length && !steps.length) {
    path.say = engine.askFor(needSlots[0], u.intent);
    path.asked = path.say;
    return path;
  }
  path.say = steps.length
    ? engine.joinSays(steps) + '\n\nThat is what I could work out — tell me which part to dig into.'
    : 'I could not work that one out from what is imported. Tell me the category, the month, or the payment you mean and I will look it up.';
  path.substituted = true;
  path.exhausted = true;
  return path;
}

// ── intent the turn actually resolved to ──────────────────────────────────
const TOOL_INTENT = {
  nav: 'nav', set_range: 'range', help: 'help',
  payment_monthly: 'standing', cat_monthly: 'category', find_transactions: 'rows',
  affordability: 'afford', cashflow_whatif: 'whatif', save_plan: 'save_plan',
  budget_notice: 'advice_open', spend_ranked: 'advice_open',
  net_worth: 'net_worth', pulse: 'pulse', leaks: 'leaks', notes_for: 'notes',
  propose_budget: 'budget_draft', propose_goal: 'goal_draft', propose_rules: 'rules_draft',
  cashflow_summary: 'cashflow', balances: 'balances', summary_outlook: 'outlook', goals_status: 'goals',
};
function observedIntent(path) {
  if (path.route === 'empty') return 'none';
  if (path.route === 'greet') return 'greet';
  // Understand's own answer IS the thing under test — including when it says
  // it does not know. Falling back to "whichever tool happened to run" would
  // grade the model instead of the intent layer.
  if (path.declared) return path.declared;
  for (const t of path.tools) if (TOOL_INTENT[t] && TOOL_INTENT[t] !== 'unknown') return TOOL_INTENT[t];
  return 'unknown';
}

// ── assertions ────────────────────────────────────────────────────────────
function check(fx, path) {
  const e = fx.expect;
  const fails = [];
  const intent = observedIntent(path);

  const want = e.intent == null ? null : [].concat(e.intent);
  if (want && !want.includes(intent)) fails.push(`intent ${intent} ≠ ${want.join('|')}`);
  if (e.toolsIn && !path.tools.some((t) => e.toolsIn.includes(t)))
    fails.push(`no tool from [${e.toolsIn}] ran (ran: ${path.tools.join(',') || 'none'})`);
  if (e.toolsNot) {
    const bad = e.toolsNot.includes('*') ? path.tools : path.tools.filter((t) => e.toolsNot.includes(t));
    if (bad.length) fails.push(`forbidden tool ran: ${[...new Set(bad)].join(',')}`);
  }
  if (e.maxRounds != null && path.rounds > e.maxRounds) fails.push(`${path.rounds} rounds > ${e.maxRounds}`);
  // §3 freezes the budget at one hosted call per turn, "two only on a failed
  // figure-verify, and the retry does not consume entitlement". Allow exactly
  // that one extra, and say so, rather than reading a correct correction round
  // as an overspend.
  if (e.hostedCalls != null) {
    const allowed = e.hostedCalls + (path.verifyRetry ? 1 : 0);
    if (path.hostedCalls > allowed)
      fails.push(`${path.hostedCalls} hosted calls > ${allowed}` + (path.verifyRetry ? ' (incl. one free figure-verify retry)' : ''));
  }
  if (e.mustNotSay && e.mustNotSay.test(path.say)) fails.push(`answer matched ${e.mustNotSay}`);
  if (e.silent && path.say) fails.push('answered an empty message');
  if (e.mustEndWithQuestion && !/\?\s*$/.test(String(path.say).trim())) fails.push('did not end with a question');
  if (e.mustOfferDraft && !/\b(draft|shall i|want me to|would you like)\b/i.test(path.say))
    fails.push('never offered to draft anything');
  if (e.asks && !/\?/.test(path.say)) fails.push('needed a clarifying question, asked none');
  if (e.mustConfirmBeforeWrite && path.wrote && !/\b(apply|nothing is live|before you)\b/i.test(path.say))
    fails.push('wrote a sandbox draft without saying it is not live');
  if (e.mustGround) {
    const grounded = engine.joinSays(path.tools.map((t) => ({ say: TOOL_SAYS[t] || '' })));
    const unbacked = engine.unbackedFigures(grounded, path.say, fx.say);
    if (unbacked.length) fails.push(`ungrounded figures: ${unbacked.slice(0, 3).join(', ')}`);
  }
  // A money answer has to be spoken by the model. Two ways today's build fails
  // that without ever calling a tool wrong: match() ≥ 0.8 answers with the
  // Engine paragraph and never calls the model at all, and the guards swap the
  // model's sentence for the tool text. Both look like a pass on tools alone.
  if (e.writer) {
    if (path.route === 'match-local') fails.push('answered from the Engine paragraph — match() bypassed the model');
    if (path.route === 'greet') fails.push('answered from the canned greeting');
  }
  if (path.exhausted) fails.push('the model never answered — the Engine wrote it');
  if (path.substituted) fails.push('guards replaced the model sentence with the Engine paragraph');
  if (path.refusals) fails.push(`${path.refusals} refusal loop(s)`);
  return { fails, intent };
}

// ── run ───────────────────────────────────────────────────────────────────
// --intent "some sentence"  → print what Understand makes of it and stop.
const askIntent = argOf('--intent', '');
if (askIntent) {
  const u = engine.understand(askIntent);
  console.log(JSON.stringify(u, null, 2));
  console.log('prefetch:', JSON.stringify(engine.prefetchFor(u)));
  if (engine.briefFor) console.log('brief:', JSON.stringify(engine.briefFor(u), null, 2));
  process.exit(0);
}

// Stage 2: the brief is a slice, not a dump. Fail here so a fixture that
// happens to pass cannot hide a wholesale snapshot coming back.
{
  const dump = engine.householdSnapshot();
  const standingU = engine.understand('how much is the Avant Money payment');
  const standingB = engine.briefFor(standingU);
  const standingText = (standingB.facts || []).join('\n');
  const adviceB = engine.briefFor(engine.understand('I need to restructure my finance, what can I do?'));
  const adviceText = (adviceB.facts || []).join('\n');
  const navB = engine.briefFor(engine.understand('open Budget'));
  const rowsB = engine.briefFor(engine.understand('show me everything'));
  const briefFails = [];
  if (standingB.tier !== 'aggregate') briefFails.push('standing tier ' + standingB.tier);
  if (!/avant/i.test(standingText)) briefFails.push('standing brief missed the payment');
  if (/tesco|aldi/i.test(standingText)) briefFails.push('standing brief listed a grocer');
  if (adviceB.tier !== 'aggregate') briefFails.push('advice tier ' + adviceB.tier);
  if ((dump.recs || []).filter((r) => adviceText.indexOf(r.merchant) >= 0).length > 2)
    briefFails.push('advice brief still lists standing orders');
  if (navB.tier !== 'shape') briefFails.push('nav tier ' + navB.tier);
  if ((rowsB.rows || []).length) briefFails.push('empty rows brief dumped the ledger');
  const slim = engine.systemPromptHousehold(standingU);
  const fat = engine.systemPromptHousehold();
  if (slim.length >= fat.length) briefFails.push('standing household prompt not smaller than the dump');
  if (briefFails.length) {
    console.error('brief preflight failed:\n  ' + briefFails.join('\n  '));
    process.exit(2);
  }
}

const chosen = FIXTURES.filter((f) => !ONLY.length || ONLY.includes(f.id));
const results = [];
console.log(`\nLithifyte co-pilot eval · mode=${MODE} · assistant consent=${CONSENT ? 'ON' : 'off'} · household=${H.counts.tx} tx / ${H.counts.months} months / ${H.rangeLabel}`);
console.log(`${chosen.length} fixtures\n`);
if (MODE !== 'mock') {
  const h = await fetch(RELAY + '/health').then((r) => r.json()).catch(() => ({}));
  if (h.configured) console.log(`relay would try: ${h.configured.map((c) => c.upstream + ':' + c.model).join(' → ')}`);
  if (h.openRouterBlocked) console.log(`relay reports openrouter blocked: ${h.openRouterBlocked}`);
  console.log('');
}

for (const fx of chosen) {
  let path, err = null;
  try { path = await runTurn(fx.say); }
  catch (e) { err = (e && e.message) || String(e); path = { tools: [], rounds: 0, hostedCalls: 0, say: '', route: 'threw' }; }
  const { fails, intent } = err ? { fails: ['threw: ' + err], intent: 'error' } : check(fx, path);
  results.push({ fx, path, fails, intent });
}

// Cross-fixture: a greeting that is the same sentence every time is the
// original complaint. Assert variety across the greet group rather than
// pattern-matching one answer.
// The greeting must be WRITTEN, not recited. Identical text across a session is
// by design once it is cached — what must not happen is the canned sentence
// coming back because nothing ever asked a model.
const greets = results.filter((r) => r.fx.group === 'greet' && r.path.route === 'greet');
if (greets.length && !greets.some((r) => r.path.spoken)) {
  for (const r of greets) r.fails.push('greeting was never written by the model — still the canned sentence');
}

for (const r of results) {
  const mark = r.fails.length ? '✗' : '✓';
  console.log(`${mark} ${String(r.fx.id).padStart(2, ' ')} [${r.fx.group}] ${JSON.stringify(r.fx.say)}`);
  for (const f of r.fails) console.log(`      → ${f}`);
  if (VERBOSE) {
    console.log(`      route=${r.path.route} intent=${r.intent} tools=[${r.path.tools.join(',')}] rounds=${r.path.rounds} calls=${r.path.hostedCalls}`);
    if (r.path.say) console.log(`      say: ${String(r.path.say).slice(0, 160).replace(/\n/g, ' ')}`);
  }
}

const pass = results.filter((r) => !r.fails.length).length;
console.log(`\n── ${pass}/${results.length} passing ──`);
for (const g of GROUPS) {
  const inG = results.filter((r) => r.fx.group === g);
  if (!inG.length) continue;
  const p = inG.filter((r) => !r.fails.length).length;
  console.log(`   ${g.padEnd(8)} ${p}/${inG.length}`);
}
const reasons = {};
for (const r of results) for (const f of r.fails) {
  const key = f.replace(/\d+/g, 'N').replace(/\[.*?\]/g, '[…]').replace(/:.*/, '').slice(0, 62);
  reasons[key] = (reasons[key] || 0) + 1;
}
console.log('\nmost common failures:');
for (const [k, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`   ${String(n).padStart(3)} × ${k}`);
}
const hosted = results.reduce((s, r) => s + r.path.hostedCalls, 0);
if (liveCapability) {
  const c = liveCapability;
  console.log(`\nupstream that actually answered: ${c.upstream} (profile ${c.profile}` +
    `${c.tools != null ? ', tools ' + c.tools : ''}${c.jsonSchema != null ? ', jsonSchema ' + c.jsonSchema : ''})`);
  if (MODE === 'live-S' && c.profile !== 'S') console.log('   ⚠ live-S asked for Grok and did not get it — this run does not measure Grok.');
  if (MODE === 'live-N' && c.upstream !== 'openrouter') console.log('   ⚠ live-N did not reach OpenRouter — this run measures ' + c.upstream + '.');
}
// Separate "the behaviour is right but the turn costs two calls" from a real
// behavioural failure — the one-call budget is a step 4/5 target (§3), so
// mixing them would hide progress.
const budgetOnly = results.filter((r) => r.fails.length && r.fails.every((f) => /hosted calls >|rounds >/.test(f)));
if (budgetOnly.length) {
  console.log(`\n${budgetOnly.length} fixture(s) fail ONLY on the call budget — behaviour is right, the turn costs an extra round:`);
  console.log('   ' + budgetOnly.map((r) => r.fx.id).join(', ') + '   (Understand/Brief prefetch, steps 4-5)');
}
console.log(`\nhosted /chat calls this run: ${hosted}` + (MODE === 'mock' ? ' (simulated)' : ' (real — free tier is ~50/day)'));
console.log('Step 1 of the redesign: red is the expected result.\n');
process.exit(pass === results.length ? 0 : 1);
