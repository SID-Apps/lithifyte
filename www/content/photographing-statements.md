---
title: Photographing a bank statement
shortTitle: Photo import
slug: photographing-statements
section: product
description: What happens when Lithifyte reads a photo or a scanned PDF of a bank statement — what leaves your device, what we do not store, how the figures are checked, and how the five free pages work.
summary: A photographed statement cannot be read in the browser. If you ask Lithifyte to read it, the page image is read by Lithifyte Pro (or by a model on your machine), transcribed, checked against the statement’s own totals, and offered to you as a preview. The image is not stored. Hosted reading is five pages for free, then Plus.
keywords: [photograph bank statement, scan PDF import, Lithifyte photo disclaimer, statement OCR privacy]
updated: 2026-08-25
priority: 0.7
related: [capturing-your-first-transaction, logging-receipts, security-and-privacy, commercial, faq, guide]
howto_name: Photograph a bank statement into Lithifyte
howto_time: PT8M
howto_steps: [Sign in and choose Take a photo|Open app.lithifyte.com/?capture=1 and sign in. Tick the notice on this page the first time., Photograph the page|On a computer scan the QR. On a phone use the camera. Fill the frame and avoid glare., Confirm the totals|Code checks opening movement and closing. If they disagree the statement is not imported. Confirm the preview to save.]
---

## The short version

A CSV, a spreadsheet, or a PDF with selectable text is read **in your browser**. Nothing is uploaded.

A **photograph** or a **scanned PDF** has no text the browser can trust. If you choose to import one, Lithifyte uses a vision model to copy what is printed, then **code** (not the model) checks that the figures add up. You still confirm every row before anything is saved.

A **till receipt** uses the same path with a smaller contract: shop name, date, and the amount paid. It is not treated as a bank table (there is no running balance to walk). The purchase lands in a **Receipts (cash)** account after you confirm.

This page is the notice the app asks you to acknowledge the first time you use that path. You can re-read it here at any time.

To try it: [Capture your first transaction](https://app.lithifyte.com/?capture=1) — sign in, five hosted pages are included, then photograph a statement or a receipt with your phone.

## What you are agreeing to

When you press **Read** on a photo or a scan:

1. **The page image leaves this browser** and is sent to a graphics processor we operate, unless you have pointed Lithifyte at a vision model on your own machine (Ollama, LM Studio, or any compatible endpoint). A local model never hits our servers.
2. **We do not store the image.** It exists for the seconds it takes to transcribe. If you used **Photograph with your phone**, the JPEG sits in a one-time pairing slot for at most ten minutes so your computer tab can collect it, then that slot is deleted.
3. **We do not store the transcription as a ledger.** Candidate rows come back to your browser. Nothing is written to your dashboard until you confirm the importer preview.
4. **The model is not allowed to invent money.** It copies printed strings. Dates, signed amounts and account masking are done in code. If opening balance, movement and closing balance do not agree, the statement is **not imported** and you are shown which line disagrees.
5. **The image never goes to a third-party model provider** on the hosted path. It is read on hardware we run. Your own model, if configured, stays on your computer.

CSV, Excel and text-layer PDFs are **not** covered by this notice. They never take this path.

## Who can use hosted photo import

| Account | Hosted photo / scan pages |
|---|---|
| Not signed in | Not available — sign in first |
| Free, after trial | **5 pages, once**, lifetime. A failed read is not counted |
| 7-day trial, or Lithifyte Plus | Unlimited hosted pages |
| Your own local vision model | Unlimited, and the image never leaves this device |

Five pages is enough to try a real statement. After that, hosted reading is part of [Lithifyte Plus](/commercial) (€9 / month or €90 / year). Export of data you already imported is never gated.

## Photograph with your phone

On a computer you can show a QR code instead of using this machine’s files. Scanning it opens a small camera page on the phone. The phone does not need to sign in: possessing the QR is the capability, and the slot is bound to the signed-in computer session.

The photo is not your ledger. It is a JPEG in transit, then gone. The same QR works for a receipt — one photo, then Send.

## What we cannot promise

A photograph is not a bank export. Glare, a cropped total, a folded corner or a column the model reads as the wrong direction will fail the arithmetic check — by design. The confirm screen is load-bearing. Do not treat this as unattended import.

If the check fails, retake the photo straighter and in better light, or import the bank’s CSV.

## How to revoke

In the app: **Settings → AI & what left this device → Forget photo-import acknowledgement**. The next photograph will show this notice again. Revoking does not delete transactions you already confirmed.

The full privacy model, including the co-pilot and the encrypted vault, is on [Security and privacy](/security-and-privacy).
