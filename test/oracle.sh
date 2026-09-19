#!/usr/bin/env bash
# Mechanical oracle: fails before qwen-cases.json exists, passes after.
set -euo pipefail
cd "$(dirname "$0")/.."

test -f core.js
test -f test/run.cjs
test -f test/qwen-cases.json

python3 - <<'PY'
import json
from pathlib import Path
raw = json.loads(Path("test/qwen-cases.json").read_text())
tests = raw["tests"] if isinstance(raw, dict) else raw
if not isinstance(tests, list) or len(tests) < 100:
    raise SystemExit("need >=100 tests in test/qwen-cases.json, have %s" % (len(tests) if isinstance(tests, list) else type(tests)))
required = {"id", "fn", "args", "expected"}
allowed = {
    "completePreserving", "paintCase", "format", "copyPayload", "splitDraft",
    "damerau", "applyAccept", "undoLastAccept", "shouldInterceptTab",
    "letterFlags", "ghostParts", "formatDestroysUserCase", "outputText",
    "uniqueReady",
}
for i, row in enumerate(tests):
    missing = required - set(row)
    if missing:
        raise SystemExit("test %s missing %s" % (i, missing))
    if row["fn"] not in allowed:
        raise SystemExit("fn not allowed: %s" % row["fn"])
print("qwen-cases schema ok n=%d" % len(tests))
PY

node --check core.js
node --check app.js

python3 - <<'PY'
from pathlib import Path
text = Path("core.js").read_text()
idx = text.find("function format(")
chunk = text[idx:idx+1800]
default = chunk.split("default:")[1].split("}")[0]
if "lower.join" in default:
    raise SystemExit("BUG: format() default still lowercases")
if "tokens.join" not in default:
    raise SystemExit("format() default must keep typed tokens")
print("format-default-keeps-case ok")
PY

node -e 'const C=require("./core.js"); if (C.copyPayload("Ritalin ","as-typed")!=="Ritalin") process.exit(1); if (C.copyPayload("RITALIN HORSE ","as-typed")!=="RITALIN HORSE") process.exit(1); console.log("copy-keeps-case ok")'

node test/run.cjs
