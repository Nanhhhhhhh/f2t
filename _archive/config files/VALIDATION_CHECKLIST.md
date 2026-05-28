# VALIDATION CHECKLIST

Use this before marking any session, PR, or deploy as complete.

---

## Level 1 — Every Commit

```
[ ] Build passes with zero errors
[ ] Lint passes with zero errors
[ ] No new warnings introduced (compare before/after)
[ ] All existing tests still pass
[ ] No commented-out code left behind
[ ] No console.log left in production code paths
[ ] No hardcoded secrets, tokens, or credentials
[ ] No TODO left without a tracking item
```

---

## Level 2 — Every Feature

```
[ ] Happy path works end-to-end
[ ] Error paths return correct HTTP status codes and messages
[ ] Input validation rejects invalid data
[ ] Auth guards reject unauthenticated requests (401)
[ ] Role guards reject unauthorized requests (403)
[ ] Ownership checks prevent cross-user data access
[ ] New endpoints added to CONTEXT.md endpoint table
[ ] New environment variables documented in CONTEXT.md
[ ] Tests written for new service methods
[ ] Tests written for new controller endpoints
```

---

## Level 3 — Every Release

```
[ ] All Level 1 and Level 2 checks pass
[ ] No open CRITICAL tech debt items
[ ] Database migrations applied (if any)
[ ] Environment variables set in target environment
[ ] Seed data removed from production database
[ ] Docker build succeeds
[ ] Health check endpoint returns 200
[ ] CONTEXT.md reflects current state of the codebase
```

---

## Severity Definitions

| Level | Label | Meaning |
|---|---|---|
| P0 | CRITICAL | Blocks deploy. Security issue, data loss, or total feature failure. |
| P1 | HIGH | Major functionality broken. Must fix before next session. |
| P2 | MEDIUM | Degraded but working. Fix within 2 sessions. |
| P3 | LOW | Minor issue or improvement. Fix when convenient. |

---

## Common Issues to Check Manually

These are not caught by automated tools:

- Does the response envelope match what the frontend expects?
- Do list endpoints return `{ items, total, page, limit, hasMore }`?
- Do ObjectId fields serialize as strings (not `[object Object]`)?
- Is the `password` field absent from all user responses?
- Does pagination work correctly at boundaries (page 1, last page, empty)?
- Do filters actually filter? (check with seed data, not just happy path)
