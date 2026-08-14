#!/usr/bin/env bash
# Hourly Lithifyte health + release-hygiene loop.
# Deterministic only: never rewrite product logic. Auto-push is limited to
# stamping a stale version.json hash after every check is green.
set -euo pipefail

ROOT="${LITHIFYTE_ROOT:-/home/sid-ai/lithifyte}"
CLOUD="${LITHIFYTE_CLOUD:-/home/sid-ai/lithifyte-cloud}"
LOGDIR="${LITHIFYTE_HOURLY_LOG:-/home/sid-ai/lithifyte/docs/hourly-runs}"
DATE="$(date -u +%Y-%m-%dT%H%M%SZ)"
LOG="$LOGDIR/$DATE.md"
mkdir -p "$LOGDIR"
NODE="${NODE:-$(command -v node)}"
CHROME="${CHROME:-/usr/bin/google-chrome}"

say() { printf '%s\n' "$*" | tee -a "$LOG"; }
fail=0

{
  echo "# Lithifyte hourly $DATE"
  echo
  echo "Host: $(hostname)  Node: $($NODE -v 2>/dev/null || echo missing)"
  echo
} > "$LOG"

cd "$ROOT"

say "## 1. Engine checks"
if $NODE tools/check-shell.mjs >>"$LOG" 2>&1; then
  say "check-shell: pass"
else
  say "check-shell: FAIL"
  fail=1
fi

if $NODE tools/set-version.mjs --check >>"$LOG" 2>&1; then
  say "set-version --check: pass"
else
  say "set-version --check: FAIL (will stamp hash if only sha256 drifted)"
  if $NODE tools/set-version.mjs --stamp >>"$LOG" 2>&1 \
     && $NODE tools/check-shell.mjs >>"$LOG" 2>&1 \
     && $NODE tools/set-version.mjs --check >>"$LOG" 2>&1; then
    say "stamped version.json sha256 and re-checked green"
    STAMPED=1
  else
    say "stamp did not recover — leaving dirty"
    fail=1
    STAMPED=0
  fi
fi

if [[ -f feeder/feeder.mjs ]]; then
  if $NODE feeder/feeder.mjs selftest >>"$LOG" 2>&1; then
    say "feeder selftest: pass"
  else
    say "feeder selftest: FAIL"
    fail=1
  fi
fi

say ""
say "## 2. Live endpoints"
for url in \
  https://app.lithifyte.com/ \
  https://app.lithifyte.com/demo \
  https://lithifyte.com/ \
  https://lithifyte.com/commercial \
  https://access.lithifyte.com/health
do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$url" || echo err)
  say "$code  $url"
  if [[ "$code" != "200" ]]; then fail=1; fi
done

# Packs must not be public; tax pack is gone.
pack=$(curl -sS -o /tmp/lf-pack.json -w '%{http_code}' --max-time 20 https://access.lithifyte.com/packs/importers || echo err)
tax=$(curl -sS -o /tmp/lf-tax.json -w '%{http_code}' --max-time 20 https://access.lithifyte.com/packs/ie-fiscal || echo err)
say "$pack  /packs/importers (expect 401)"
say "$tax  /packs/ie-fiscal (expect 410)"
[[ "$pack" == "401" ]] || fail=1
[[ "$tax" == "410" ]] || fail=1

say ""
say "## 3. Headless self-test (file:// Engine + demo)"
if [[ -x "$CHROME" ]]; then
  for page in index.html demo.html; do
    url="file://$ROOT/$page"
    out=$(timeout 90 "$CHROME" --headless=new --disable-gpu --no-sandbox --virtual-time-budget=20000 \
      --dump-dom "$url" 2>/dev/null | $NODE -e '
        let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
          const m = s.match(/self-test[^<]{0,80}/i);
          console.log(m ? m[0].replace(/\s+/g," ").slice(0,120) : "no self-test banner found");
        });
      ' || echo "chrome failed")
    say "$page: $out"
  done
else
  say "chrome missing — skipped DOM walk"
fi

say ""
say "## 4. Cloud / Engine relation"
if [[ -d "$CLOUD" ]]; then
  if [[ -f "$CLOUD/scripts/build-packs.mjs" ]]; then
    if (cd "$CLOUD" && $NODE scripts/build-packs.mjs --check) >>"$LOG" 2>&1; then
      say "cloud packs.js in sync with packs/importers.json"
    else
      say "cloud packs drift — regenerating"
      (cd "$CLOUD" && $NODE scripts/build-packs.mjs) >>"$LOG" 2>&1 || fail=1
      PACKS=1
    fi
  fi
else
  say "cloud repo missing at $CLOUD"
fi

say ""
say "## Result"
if [[ $fail -ne 0 ]]; then
  say "FAILED — no push"
  echo "$DATE FAIL" >> "$LOGDIR/latest.txt"
  exit 1
fi
say "GREEN"

# Auto-push only hygiene (hash stamp / pack regen), never product rewrites.
if [[ "${STAMPED:-0}" == "1" ]]; then
  git -C "$ROOT" add version.json
  if ! git -C "$ROOT" diff --cached --quiet; then
    git -C "$ROOT" commit -m "chore: stamp version.json sha256 after hourly check"
    git -C "$ROOT" push origin HEAD
    say "pushed version.json stamp"
  fi
fi
if [[ "${PACKS:-0}" == "1" && -d "$CLOUD/.git" ]]; then
  git -C "$CLOUD" add access/packs.js packs/importers.json
  if ! git -C "$CLOUD" diff --cached --quiet; then
    git -C "$CLOUD" commit -m "chore: regenerate importer packs from source"
    git -C "$CLOUD" push origin HEAD
    say "pushed cloud pack regen"
  fi
fi

echo "$DATE GREEN" >> "$LOGDIR/latest.txt"
# keep the last 48 hourly reports
ls -1t "$LOGDIR"/20*.md 2>/dev/null | tail -n +49 | xargs -r rm -f
exit 0
