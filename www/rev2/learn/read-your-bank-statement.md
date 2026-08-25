# How to read your bank statement properly

Source: https://lithifyte.com/learn/read-your-bank-statement
Updated: 2026-08-09
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

Bank statements are written for banks, not for you. Once you know what the columns mean, why one shop appears under six names, and how to check a statement reconciles, the rest of personal finance gets considerably easier.

If you only have paper, [photograph the page](/capturing-your-first-transaction) — Lithifyte copies the print and checks it against the statement’s own totals before you confirm. A CSV export is still the more reliable file.

## Why they are so hard to read

A bank statement is a legal record of account movements, designed to be complete and unambiguous for the bank. It is not designed to help you understand your own behaviour. That is why it lists a card terminal identifier instead of a shop name, why it splits one shopping trip across two lines, and why the same supermarket appears under six different strings.

None of that is malice. It is just the wrong document being used for the wrong job — and knowing what each part means makes it a usable one.

## The columns

**Date.** Often there are two: the date you made the payment and the date it settled at the bank. They can differ by several days, and a purchase made on the 31st can land on the 2nd of the next month. If you are wondering why a month's total does not match your memory, this is usually the reason. When a file offers both, the completed or posted date is the one that matches your balance.

**Description.** A concatenation of merchant name, location, terminal ID, and sometimes a scheme reference. This is the field that needs the most work, and it is where all the ambiguity lives.

**Debit and credit.** Money out and money in. Statements express this in one of two ways: two separate columns, or one signed amount column where negatives are outgoings. Getting this backwards is the classic import error — a whole account reading as though you spend everything and earn nothing.

**Balance.** The running balance after each transaction. Frequently ignored, and genuinely the most useful column on the page. See the reconciliation check below.

**Reference or type.** Codes like `SEPA DD` (direct debit), `POS` (card payment in person), `ATM`, `SO` (standing order), `INT` (interest). These tell you the *mechanism*, which is often more informative than the description: a `SEPA DD` you do not recognise is a subscription you have forgotten about.

## Direct debit versus standing order

Worth being precise about, because the difference matters when something goes wrong.

- A **standing order** is an instruction *you* give your bank: pay this fixed amount to this account on this date. You control it and you cancel it.
- A **direct debit** is permission you give a *company* to pull money from your account, and they set the amount. Convenient for variable bills. It also means an incorrect bill leaves your account before you can argue about it, though direct debit schemes generally give you a right to an immediate refund of an incorrect payment.

If you are trying to cut a recurring cost, this determines who you have to contact.

## Why one shop appears as six merchants

`TESCO STORES 3184`, `TESCO EXPRESS DUB`, `TESCO-STORES`, `TESCO STORES 4471` — four strings, one shop, and any total you compute per-string is wrong by three-quarters.

The store number, the town and sometimes the terminal all end up in the description. The fix is to normalise: strip the trailing noise and treat everything beginning `TESCO` as one merchant. Do this before you total anything, or your grocery spending will be scattered across a dozen entries small enough to look unimportant individually.

The reverse problem also exists. Payment processors — `SumUp`, `Stripe`, `PayPal`, `SQ *` — appear as themselves rather than the business you actually paid, so several unrelated purchases collapse into one meaningless line. Those have to be split apart by hand, usually by amount and date.

## Transfers are not spending

If you move €500 from your current account to savings, your statements record €500 out of one and €500 into the other. Counted naively, you have spent €500 and earned €500. Neither happened.

Every internal transfer has two sides, and both must be excluded before any total means anything. This single error is responsible for more nonsensical personal finance numbers than any other, and it is invisible unless you look for it — the arithmetic is perfectly correct, it is just measuring something that did not occur.

## The reconciliation check

Here is the check almost nobody does, and it is the only way to *prove* you have read a statement correctly rather than assume it.

Take the balance column. For each row: previous balance, plus credit, minus debit, should equal the new balance. Walk the whole file.

If every step agrees, your columns are right, your signs are right, your decimal separator is right and nothing has been skipped. If a step disagrees, you have found the exact row where your reading of the file breaks. This turns "the numbers look about right" into an actual proof, and the statement hands you the answer key for free.

There is a bonus. The balance *before* the first row is your opening balance, which is the number that turns a list of movements into an actual account balance.

## Five things to check on every statement

1. **Does the balance reconcile?** Walk it, as above.
2. **Are both dates present, and which one are you using?** Consistency matters more than which you pick.
3. **Do the debit and credit columns point the way you think?** A statement where everything is one direction is nearly always a misread, not a strange month.
4. **Have transfers been paired?** Both sides, or your income and spending are both inflated.
5. **Are annual and quarterly items visible?** If your history is too short to contain them, your picture of a normal month is wrong in a way that will surprise you later.

## Getting a CSV out of your bank

Almost every bank offers this, usually under "download", "export" or "statements" in online banking, with CSV, Excel and PDF options. Take CSV or Excel. A PDF is a picture of your data — it can be extracted, but you will lose fidelity and gain errors for no reason.

Export the longest period the bank offers, one account at a time. If it caps you at three months, do it four times.
