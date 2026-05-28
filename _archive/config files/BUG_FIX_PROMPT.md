# BUG FIX PROMPT

## CONTEXT
Read CONTEXT.md first. That is your memory.
Do NOT add any new features.
Do NOT refactor anything not directly related to the errors listed.
Fix only what is listed. Verify after each fix.

---

## RULES
- Fix the root cause. Never suppress an error with a comment or config change.
- `eslint-disable` comments are forbidden.
- Modifying tsconfig to hide errors is forbidden.
- Verify after every single fix before moving to the next.
- If a fix reveals a new error not in this list, report it — do not silently patch it.

---

## PROCESS

### Step 1 — Triage
Before fixing anything, run and record the current state:

```bash
npm run build 2>&1 | grep "error TS" | head -30
npm run lint 2>&1 | tail -5
npm test 2>&1 | grep -E "FAIL|●" | head -30
```

Group errors by root cause. Most errors share 1-3 root causes.
Fixing the root causes eliminates the downstream errors automatically.

### Step 2 — Fix in dependency order
Fix errors in this order:
1. Syntax errors first — they cascade and break everything else.
2. Type errors in schemas/models — they cascade into services.
3. Type errors in services — they cascade into controllers and tests.
4. Type errors in controllers and DTOs.
5. Test failures last — after the above are fixed, many resolve automatically.

### Step 3 — Verify after every file
After editing each file:
```bash
npm run build 2>&1 | grep "error TS" | wc -l
# Count must go down, never up
```

### Step 4 — Final verification
```bash
npm run build && npm run lint && npm test
# Required: 0 build errors | 0 lint errors | all tests pass
```

---

## FIXES TO APPLY

[Agent fills this in after triage — one entry per root cause]

### FIX 1 — [Description]
**File:** `src/path/to/file.ts`
**Error:** [exact error message]
**Root cause:** [why it's broken]
**Fix:** [exact change to make]

### FIX 2 — [Description]
...

---

## START
Say: "Starting bug fix. Running triage commands first."
Run the triage commands.
List the root causes.
Then fix in order.
