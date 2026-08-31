---
title: Logging a till receipt
shortTitle: Receipts
slug: logging-receipts
section: product
description: How to photograph a shop receipt into Lithifyte. Shop name, date and amount paid land in a Receipts cash account after you confirm. Same vision path as a statement — not a bank table.
summary: Photograph a till slip. Lithifyte copies the shop, the date and the amount paid. It does not invent a running balance. Confirm the preview and the purchase lands in a Receipts cash account. One hosted page per successful read.
keywords: [log a receipt Lithifyte, photograph till slip, cash receipt tracker, receipt OCR privacy]
updated: 2026-08-25
priority: 0.7
howto_name: Log a till receipt in Lithifyte
howto_time: PT5M
howto_steps: [Open the receipt path|From Capture your first transaction pick Log a receipt. In the app use Log a receipt under People or chat plus., Photograph the slip|On a computer scan the QR with your phone. On a phone take the photo here. Fill the frame and avoid glare., Confirm shop date and total|Check the preview. Lithifyte copies what is printed. It does not walk a bank balance. Save when the row is right.]
related: [capturing-your-first-transaction, photographing-statements, guide, faq]
---

## The short version

A till slip is **one purchase**, not a bank statement. Lithifyte copies the shop name, the date and the amount paid. It does **not** invent debit/credit columns or a running balance.

After you confirm, the row lands in a **Receipts (cash)** account. Cash you already spent on card should stay on the bank statement — this path is for paper you would otherwise lose.

Start from [Capture your first transaction](https://app.lithifyte.com/?capture=1) and pick **Log a receipt**, or in the app: **People → Log a receipt**, or chat **＋ → Log a receipt**.

## What is read

| Field | What we copy |
|---|---|
| Shop | The name as printed |
| Date | The purchase date as printed |
| Total | The amount paid / grand total, separators included |
| Currency | If printed; otherwise your household currency |

Item lines are optional. Dense tables that cannot be copied faithfully are skipped rather than guessed.

## How a page image is handled

The same notice as a photographed statement: the JPEG is read by Lithifyte Pro (or by a model you run locally), **not stored**, and nothing is saved until you confirm. Full text: [Photographing a bank statement](/photographing-statements).

A successful hosted read counts as **one page** against the five free pages (unlimited on the trial, Plus, or a local model). A failed read is not counted.

## Tips

- Fill the frame with the slip. Avoid glare on thermal paper.
- One photo is enough. You do not add extra pages for a receipt.
- If the total is unreadable, retake it. The app will not invent a figure.

CSV imports of a cash book still work and never take this path.
