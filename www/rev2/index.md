# Lithifyte

Free, open-source household finance software that runs as a single HTML file in your browser. It imports bank statements, draws a live map of people, accounts, categories and merchants, and computes budgets, forecasts, debt payoff plans and net worth locally. There is no finance backend — statements stay on the device. Optional hosted AI sends only the slice a question needs, never the statement file.

- Application: https://app.lithifyte.com/
- Sample household (no sign-up): https://app.lithifyte.com/demo
- Source: https://github.com/SID-Apps/lithifyte
- Licence: AGPL-3.0-or-later, free forever

## Product

- [Plus and commercial licensing](https://lithifyte.com/commercial) — The calculator is free forever. Official Lithifyte sells the living product — AI, vault, bank presets — and a commercial licence of the Engine for white-label use.
- [Frequently asked questions](https://lithifyte.com/faq) — Short, direct answers. If a question you have is not here, the [guide](/guide) goes deeper and the [source code](https://github.com/SID-Apps/lithifyte) settles any argument about what the software actually does.
- [The Lithifyte guide](https://lithifyte.com/guide) — A complete feature reference, ordered the way you actually encounter things: get data in, make it trustworthy, understand it, then plan with it. There is also an interactive version inside the app with an Ask box.
- [How Lithifyte works](https://lithifyte.com/how-it-works) — You upload a bank statement to a web page. The page reads it in your browser, works out who spent what and where it went, and draws the result as a living map. No file is transmitted, because there is no server on the other end to receive it.
- [Open source, and why it matters here](https://lithifyte.com/open-source) — A privacy promise you cannot verify is marketing. The Engine is published under AGPL-3.0-or-later as a single readable file, so the claim that we never store your ledger is something you can check. Official Lithifyte also sells hosted intelligence and maintained bank import presets — those are not required to run the file.
- [Security and privacy, in technical terms](https://lithifyte.com/security-and-privacy) — The claim is narrow and testable: there is no finance backend, so statements are never stored by us. The one exception is hosted AI, which you consent to per lane and which sends only the slice that question needs — that is set out in full below, along with the parts we cannot fix.

## Learn

- [Learn — plain-language money guides](https://lithifyte.com/learn) — Personal finance is mostly a small number of ideas explained badly. These guides explain them properly: what a budget really is, why most of them fail in the second month, how debt payoff maths works, and what your own spending is trying to tell you. Read one in five minutes.
- [What a budget actually is](https://lithifyte.com/learn/what-is-a-budget) — A budget is a **prediction**, not a permission slip. You are guessing where your money will go, then comparing the guess to what happened. Understanding it that way changes what a "failed" budget means — and stops you abandoning the whole thing in week three.
- [How to build a budget that survives real life](https://lithifyte.com/learn/make-a-budget-that-survives) — Most budgets fail for structural reasons, not moral ones: the numbers were invented, annual bills were ignored, and progress was measured against a monthly total rather than the calendar. Fix those three things and a budget stops being an act of willpower.
- [How to read your bank statement properly](https://lithifyte.com/learn/read-your-bank-statement) — Bank statements are written for banks, not for you. Once you know what the columns mean, why one shop appears under six names, and how to check a statement reconciles, the rest of personal finance gets considerably easier.
- [How to categorise spending so the numbers mean something](https://lithifyte.com/learn/categorise-spending) — Categories exist to support decisions, not to file things tidily. Use between eight and fifteen, name them after choices you could actually make, and automate the sorting with rules — otherwise you will be doing data entry forever and quit within two months.
- [How big should an emergency fund be?](https://lithifyte.com/learn/emergency-fund) — The honest answer is: enough to cover your **essential** spending for as long as it would realistically take to replace your income. That is usually a smaller number than the standard advice implies, and it is calculable from your own statements rather than borrowed from a rule of thumb.
- [Sinking funds — the fix for bills that ambush you](https://lithifyte.com/learn/sinking-funds) — Car insurance is not a surprise. It arrives every year, on a date you know. A sinking fund converts every predictable-but-irregular bill into a flat monthly amount, which is the single highest-return change most people can make to how they handle money.
- [How to find the money leaking out of your account](https://lithifyte.com/learn/find-money-leaks) — Most wasted money is not spent, it is *leaked* — recurring charges nobody decided to keep paying. An hour with your statements and a systematic method will usually surface between €40 and €150 a month, permanently.
- [Saving for a house deposit without guessing](https://lithifyte.com/learn/save-house-deposit) — Two numbers matter: what you actually need, and what you actually save each month. Divide the first by the second and you have a date. Most people never do this calculation, which is why the goal stays permanently vague and permanently discouraging.
- [What an interest rate actually costs you](https://lithifyte.com/learn/what-interest-really-costs) — An interest rate is an abstraction; euro per month is not. Learn one piece of arithmetic — `balance × rate ÷ 12` — and every borrowing decision you ever make becomes concrete.
- [Avalanche vs snowball — which pays off debt faster?](https://lithifyte.com/learn/avalanche-vs-snowball) — Avalanche (highest interest rate first) always costs less. Snowball (smallest balance first) always finishes a debt sooner. The gap between them is usually smaller than people expect, which is why the one you will actually stick to is generally the right answer.
- [Your money has patterns — here is how to see them](https://lithifyte.com/learn/money-patterns) — Spending feels random from inside it and is remarkably regular from outside. Once you can see the four common patterns — rhythm, cliff, season and drift — a year of transactions stops being a list and becomes something you can read.
- [How to forecast next month's cashflow](https://lithifyte.com/learn/cashflow-forecast) — Forecasting is not fortune telling. Most of next month is already determined by standing orders, direct debits and habits you have had for years. Add those up, use a median for the rest, and add a buffer based on how erratic you actually are.
- [Net worth, explained without the jargon](https://lithifyte.com/learn/net-worth) — Net worth is everything you own minus everything you owe. It is the only single number that captures your whole financial position — and its value lies almost entirely in watching it move, not in what it says today.
- [Why 50/30/20 breaks, and what to do instead](https://lithifyte.com/learn/why-50-30-20-breaks) — 50/30/20 is a useful teaching device and a poor operating budget. It assumes housing costs that many people do not have, splits needs from wants along a line that does not exist, and ignores the annual bills that actually break budgets.
- [Plain-English money glossary](https://lithifyte.com/learn/glossary) — Every term you are likely to meet on a statement, in a loan document or in a budgeting guide, defined plainly and without circularity. Definitions first, context second.

## Machine-readable

- https://lithifyte.com/llms.txt — site map for language models
- https://lithifyte.com/llms-full.txt — every page as one markdown file
- https://lithifyte.com/sitemap.xml

Any page here is available as markdown: request it with `Accept: text/markdown`, or append `.md`.
