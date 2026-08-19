/**
 * copilot-40.mjs — the 40 sentences the co-pilot has to handle.
 *
 * Spec: vault "Lithifyte - LM Engine Redesign" §6. Every fixture asserts
 * BEHAVIOUR, not wording:
 *
 *   intent        Intent enum the turn should resolve to (§3)
 *   toolsIn       tools that may run; at least one must
 *   toolsNot      tools that must NOT run
 *   maxRounds     model rounds allowed before an answer
 *   hostedCalls   /chat calls the turn may cost (quota is ~50/day on the
 *                 free tier — a fixture that goes from 0 to 1 is a product
 *                 change, so it is asserted, not assumed)
 *   mustNotSay    regex the final answer must not match
 *   mustGround    every money figure in the answer traces to a tool or the user
 *   mustOfferDraft   the answer offers to draft something (the closer)
 *   mustEndWithQuestion  asserted only where a question is genuinely right —
 *                 asserting it everywhere trains a tic (§6)
 *   commandsOnly  must also pass with the model off
 *
 * Merchants and categories come from the recorded household (make-demo seed
 * 42). assertHouseholdMatches() fails loudly if a demo rebuild renames them,
 * rather than letting fixtures silently stop testing anything.
 */

export const FIXTURES = [
  // ── Greet — today's fixed string, and the anchored-regex miss ──
  { id: 1, say: 'Hi', group: 'greet',
    expect: { intent: 'greet', toolsNot: ['nav', 'help', 'budget_notice', 'cashflow_whatif'], maxRounds: 1, hostedCalls: 1, mustEndWithQuestion: true, varies: true } },
  { id: 2, say: 'hi there', group: 'greet',
    expect: { intent: 'greet', toolsNot: ['nav', 'help', 'budget_notice'], maxRounds: 1, hostedCalls: 1, mustEndWithQuestion: true } },
  { id: 3, say: "hey, how's it going", group: 'greet',
    expect: { intent: 'greet', toolsNot: ['nav', 'help', 'budget_notice'], maxRounds: 1, hostedCalls: 1, mustEndWithQuestion: true } },
  { id: 4, say: 'Hello', group: 'greet',
    expect: { intent: 'greet', toolsNot: ['nav', 'help'], maxRounds: 1, hostedCalls: 0, cached: true } },
  { id: 5, say: 'thanks', group: 'greet',
    expect: { intent: 'greet', toolsNot: ['nav', 'help', 'budget_notice'], maxRounds: 1, hostedCalls: 0, cached: true } },
  { id: 6, say: 'good morning', group: 'greet',
    expect: { intent: 'greet', toolsNot: ['nav', 'help'], maxRounds: 1, hostedCalls: 0, cached: true } },

  // ── Advice — today's refusal loop ──
  { id: 7, say: 'I need to restructure my finance, what can I do?', group: 'advice',
    expect: { writer: true,  intent: 'advice_open', toolsIn: ['budget_notice', 'spend_ranked'], toolsNot: ['propose_budget', 'nav'],
      maxRounds: 2, hostedCalls: 1, mustNotSay: /more specific|rephrase|did not ask/i, mustGround: true, mustOfferDraft: true } },
  { id: 8, say: 'how am I doing this month?', group: 'advice',
    expect: { writer: true,  intent: 'advice_open', toolsIn: ['budget_notice', 'cashflow_summary'], toolsNot: ['propose_budget'],
      maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 9, say: 'what do you notice', group: 'advice',
    expect: { writer: true,  intent: 'advice_open', toolsIn: ['budget_notice'], toolsNot: ['propose_budget'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 10, say: 'anything I can improve', group: 'advice',
    expect: { writer: true,  intent: 'advice_open', toolsIn: ['budget_notice', 'spend_ranked'], toolsNot: ['propose_budget'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 11, say: 'help me get my money in order', group: 'advice',
    expect: { writer: true,  intent: 'advice_open', toolsIn: ['budget_notice', 'spend_ranked'], toolsNot: ['propose_budget'],
      maxRounds: 2, hostedCalls: 1, mustNotSay: /more specific|rephrase|did not ask/i, mustOfferDraft: true } },
  { id: 12, say: 'where can I cut back', group: 'advice',
    expect: { writer: true,  intent: 'advice_open', toolsIn: ['spend_ranked', 'budget_notice'], toolsNot: ['propose_budget'], maxRounds: 2, hostedCalls: 1, mustGround: true } },

  // ── Standing order / category / rows ──
  { id: 13, say: 'how much is the Avant Money payment', group: 'money',
    expect: { writer: true,  intent: 'standing', toolsIn: ['payment_monthly'], toolsNot: ['cat_monthly'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 14, say: 'how has Groceries done', group: 'money',
    expect: { writer: true,  intent: 'category', toolsIn: ['cat_monthly'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 15, say: 'show me what I spent at Tesco', group: 'money',
    expect: { writer: true,  intent: 'rows', toolsIn: ['find_transactions'], toolsNot: ['nav', 'propose_budget'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 16, say: 'list the Aldi transactions', group: 'money',
    expect: { writer: true,  intent: 'rows', toolsIn: ['find_transactions'], toolsNot: ['nav'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 17, say: 'what did I spend on Groceries last month', group: 'money',
    expect: { writer: true,  intent: 'category', toolsIn: ['cat_monthly', 'find_transactions'], maxRounds: 2, hostedCalls: 1, mustGround: true } },

  // ── Afford / what-if / save ──
  { id: 18, say: 'can I afford €300 a month', group: 'money',
    expect: { writer: true,  intent: 'afford', toolsIn: ['affordability'], toolsNot: ['balances', 'propose_budget'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 19, say: 'can I take on a 250 installment', group: 'money',
    expect: { writer: true,  intent: 'afford', toolsIn: ['affordability'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 20, say: 'if I cut shoppy by 200', group: 'money',
    expect: { writer: true,  intent: 'whatif', toolsIn: ['cashflow_whatif'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 21, say: 'Avant Money is finished, how does that change month-end', group: 'money',
    expect: { writer: true,  intent: 'whatif', toolsIn: ['cashflow_whatif'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 22, say: 'how much can I save', group: 'money',
    expect: { writer: true,  intent: 'save_plan', toolsIn: ['save_plan'], maxRounds: 2, hostedCalls: 1, mustGround: true } },
  { id: 23, say: 'can I reach 5000 by December without the loan payment', group: 'money',
    expect: { writer: true,  intent: 'save_plan', toolsIn: ['save_plan'], maxRounds: 2, hostedCalls: 1, mustGround: true } },

  // ── Nav / range / status. §10.4: these keep the local path, so hostedCalls
  //    stays 0 — the demotion must not put every turn on a 50/day quota. ──
  { id: 24, say: 'show cashflow', group: 'nav',
    expect: { intent: 'nav', toolsIn: ['nav'], maxRounds: 0, hostedCalls: 0, commandsOnly: true } },
  { id: 25, say: 'balances', group: 'nav',
    expect: { writer: true, intent: 'balances', toolsIn: ['balances'], maxRounds: 2, hostedCalls: 1, commandsOnly: true } },
  { id: 26, say: 'next month outlook', group: 'nav',
    expect: { writer: true, intent: 'outlook', toolsIn: ['summary_outlook'], maxRounds: 2, hostedCalls: 1, commandsOnly: true } },
  { id: 27, say: 'open Budget', group: 'nav',
    expect: { intent: 'nav', toolsIn: ['nav'], toolsNot: ['propose_budget'], maxRounds: 0, hostedCalls: 0, commandsOnly: true } },
  { id: 28, say: 'last 12 months', group: 'nav',
    expect: { intent: 'range', toolsIn: ['set_range'], maxRounds: 0, hostedCalls: 0, commandsOnly: true } },
  { id: 29, say: "what's my net worth", group: 'status',
    expect: { writer: true,  intent: 'net_worth', toolsIn: ['net_worth'], maxRounds: 2, hostedCalls: 1, mustGround: true, commandsOnly: true } },
  { id: 30, say: 'pulse', group: 'status',
    expect: { writer: true,  intent: 'pulse', toolsIn: ['pulse'], maxRounds: 2, hostedCalls: 1, mustGround: true, commandsOnly: true } },
  { id: 31, say: 'leaks', group: 'status',
    expect: { writer: true,  intent: 'leaks', toolsIn: ['leaks'], maxRounds: 2, hostedCalls: 1, mustGround: true, commandsOnly: true } },

  // ── Draft — the only fixtures allowed to create a sandbox, and only after
  //    a confirmation the user can decline ──
  { id: 32, say: 'design a budget from my last 12 months', group: 'draft',
    expect: { writer: true,  intent: 'budget_draft', toolsIn: ['budget_notice', 'propose_budget'], toolsNot: ['apply_scenario'],
      maxRounds: 2, hostedCalls: 1, mustConfirmBeforeWrite: true } },
  { id: 33, say: 'propose a wedding budget', group: 'draft',
    expect: { writer: true,  intent: 'budget_draft', toolsIn: ['budget_notice', 'propose_budget'], toolsNot: ['apply_scenario'],
      maxRounds: 2, hostedCalls: 1, mustConfirmBeforeWrite: true } },
  { id: 34, say: 'help me set up a goal for a holiday', group: 'draft',
    expect: { writer: true,  intent: 'goal_draft', toolsIn: ['goals_status', 'propose_goal'], toolsNot: ['apply_scenario'],
      maxRounds: 2, hostedCalls: 1, mustConfirmBeforeWrite: true } },
  { id: 35, say: 'suggest categorisation rules', group: 'draft',
    expect: { writer: true,  intent: 'rules_draft', toolsIn: ['leaks', 'propose_rules'], toolsNot: ['apply_scenario'],
      maxRounds: 2, hostedCalls: 1, mustConfirmBeforeWrite: true } },

  // ── Ask / unknown / honesty ──
  { id: 36, say: 'can I afford it', group: 'honesty',
    expect: { writer: true,  intent: 'afford', asks: true, toolsNot: ['propose_budget'], maxRounds: 2, hostedCalls: 1, mustEndWithQuestion: true, mustGround: true } },
  { id: 37, say: 'how much is the current payment', group: 'honesty',
    expect: { writer: true,  intent: 'standing', asks: true, maxRounds: 2, hostedCalls: 1, mustEndWithQuestion: true } },
  { id: 38, say: "what's my tax bill", group: 'honesty',
    expect: { writer: true,  intent: 'unknown', toolsNot: ['propose_budget'], maxRounds: 2, hostedCalls: 1, mustGround: true,
      mustNotSay: /revenue|hmrc|irs|paye|vat rate|tax rate of/i } },
  // Written before Understand existed, when 'unknown' was the only way to say
  // "no subject". "Show me" IS a rows request — the user just did not say of
  // what — so asking is the right answer and better than refusing. What the
  // fixture actually guards is unchanged: no ledger dump.
  { id: 39, say: 'show me everything', group: 'honesty',
    expect: { writer: true,  intent: ['rows', 'unknown'], asks: true, toolsNot: ['propose_budget'], maxRounds: 2, hostedCalls: 1, maxRowsOut: 25 } },
  { id: 40, say: '   ', group: 'honesty',
    expect: { intent: 'none', toolsNot: ['*'], maxRounds: 0, hostedCalls: 0, silent: true } },

  // ── Recall — the banking-app job. They remember a name, not a category. ──
  { id: 41, say: 'how much did I pay Tesco', group: 'recall',
    expect: { writer: true, intent: 'rows', toolsIn: ['find_transactions'], toolsNot: ['nav', 'cat_monthly', 'payment_monthly'],
      maxRounds: 2, hostedCalls: 1 } },
  { id: 42, say: 'when did I last pay Tesco', group: 'recall',
    expect: { writer: true, intent: 'rows', toolsIn: ['find_transactions'], toolsNot: ['nav'],
      maxRounds: 2, hostedCalls: 1 } },
  { id: 43, say: 'how much have I paid to Tesco', group: 'recall',
    expect: { writer: true, intent: 'rows', toolsIn: ['find_transactions'], toolsNot: ['payment_monthly'],
      maxRounds: 2, hostedCalls: 1 } },
  { id: 44, say: 'search Tesco', group: 'recall',
    expect: { writer: true, intent: 'rows', toolsIn: ['find_transactions'], toolsNot: ['nav'],
      maxRounds: 2, hostedCalls: 1 } },
  { id: 45, say: 'Tesco', group: 'recall',
    expect: { writer: true, intent: 'rows', toolsIn: ['find_transactions'], toolsNot: ['nav', 'cat_monthly'],
      maxRounds: 2, hostedCalls: 1 } },
];

/** Fail loudly if a demo rebuild renamed what the fixtures talk about. */
export function assertHouseholdMatches(h) {
  const problems = [];
  const merchants = h.TX.map((t) => t.m.toUpperCase()).join('|');
  for (const needle of ['TESCO', 'ALDI', 'AVANT MONEY']) {
    if (merchants.indexOf(needle) < 0) problems.push('fixture merchant missing from household: ' + needle);
  }
  for (const cat of ['Groceries', 'Rent']) {
    if (!h.categories.includes(cat)) problems.push('fixture category missing from household: ' + cat);
  }
  if (h.MONTHS.length < 12) problems.push('household has ' + h.MONTHS.length + ' months, fixtures assume 12+');
  return problems;
}

export const GROUPS = ['greet', 'advice', 'money', 'nav', 'status', 'draft', 'honesty', 'recall'];
