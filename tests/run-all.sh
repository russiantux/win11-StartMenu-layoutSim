#!/bin/sh
# Syntax-check every module and run the unit tests with macOS JavaScriptCore.
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
status=0
for f in js/*.js; do
  out=$("$JSC" -m "$f" 2>&1)
  # A ReferenceError for browser globals means the module parsed fine.
  if [ -n "$out" ] && ! echo "$out" | grep -q "ReferenceError: Can't find variable: \(document\|window\|localStorage\|navigator\)"; then
    echo "FAIL $f: $out"; status=1
  else
    echo "ok   $f"
  fi
done
for t in tests/test-*.mjs; do
  res=$("$JSC" -m "$t" 2>&1 | tail -1)
  echo "$res" | grep -q "ALL PASS" || status=1
  echo "$t: $res"
done
exit $status
