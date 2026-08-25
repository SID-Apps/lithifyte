# Capture your first transaction

Source: https://lithifyte.com/capturing-your-first-transaction
Updated: 2026-08-25
Licence: content CC-BY-4.0 · software AGPL-3.0-or-later

Sign in at app.lithifyte.com/?capture=1. Choose Upload a file (CSV, Excel or a text PDF — never uploaded) or Take a photo (QR on a computer, camera on a phone). Confirm the preview before anything is saved. Five hosted photo pages are free.

## The short version

[Capture your first transaction](https://app.lithifyte.com/?capture=1) signs you in and asks **how the page arrives**. You do not have to set up the household first.

- **Upload a file** — CSV, Excel, or a PDF with selectable text. Read **in this browser**. Nothing is uploaded.
- **Take a photo** — on a computer, a QR opens the camera on your phone; on a phone, the camera sheet opens here. Hosted reading is five pages free (a failed read is not counted), then [Plus](/commercial).
- **Log a receipt** — one till slip: shop, date, amount paid. Same camera. See [Logging a receipt](/logging-receipts).

Nothing reaches your dashboard until you confirm the importer preview.

## Step by step

1. Open [app.lithifyte.com/?capture=1](https://app.lithifyte.com/?capture=1), or tap **Capture your first transaction** on [lithifyte.com](https://lithifyte.com).
2. Sign in (Google or email magic link). The link remembers that you came to capture, so you land back on this path.
3. Choose **Upload a file**, **Take a photo**, or **Log a receipt**.
4. The first photograph asks you to tick [how a page image is handled](/photographing-statements). A local vision model (Ollama / LM Studio) never hits our servers.
5. Check the preview. For a statement, Lithifyte walks the printed opening and closing balances in code. If the rows do not add up, it is **not imported**.
6. Confirm. The map lights up from those rows.

## Photograph with your phone (from a computer)

1. Choose **Take a photo**. A QR appears on this tab.
2. Scan it. The phone does not sign in — possessing the QR is the capability.
3. Fill the frame, avoid glare, send. The JPEG sits in a one-time slot for at most ten minutes, then is deleted.
4. This computer tab reads it the same way as an upload.

On a phone already in the app, **Take a photo** opens the camera on that device.

## If the read fails

A photograph is not a bank export. Glare, a cropped total or a folded corner will fail the arithmetic check — by design. Retake the page straighter, or import the bank’s CSV instead. A failed hosted read is **not** counted against the five free pages.

## After the first one

Drop further files under **People → upload**, or use chat **＋**. CSV and text PDFs stay unlimited and on-device. Hosted photos stay on the five-page lifetime allowance after the trial, or unlimited on Plus / a local model.

The in-app [Tutorial](https://app.lithifyte.com/tutorial) still walks the map, budgets and backup once you have data in.
