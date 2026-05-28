# AGENT WORKFLOW

## Session Start

Every session begins with these steps in order:

1. **Read the context file.** (`CONTEXT.md` or equivalent.) Do not rely on memory.
2. **Read the task.** Understand what is being asked before doing anything.
3. **Investigate.** Read every relevant file before writing a single line.
4. **State your plan.** Briefly describe what you will do and in what order.
5. **Execute.** Work through the plan step by step.
6. **Verify.** Run build, lint, and tests before reporting done.
7. **Update the context file.** Record what changed so the next session has accurate state.

---

## Investigation Phase

Before writing any code, answer these questions:

- What already exists that is relevant to this task?
- What is the existing pattern I should follow?
- What are the inputs and outputs of what I am building?
- What could break if I make this change?

Do not skip this phase. Coding without investigation produces conflicts and regressions.

---

## Implementation Phase

Work in this order:

1. Schema / data model changes first (if any).
2. Service / business logic second.
3. Controller / API surface third.
4. DTOs / validation fourth.
5. Tests fifth.
6. Frontend wiring last.

Verify the build passes after each layer before moving to the next.

---

## Verification Checklist

Run these in order. Do not skip any.

```
[ ] npm run build     — zero TypeScript errors
[ ] npm run lint      — zero lint errors
[ ] npm test          — all tests pass
[ ] Manual check      — the specific behavior works as expected
```

If any check fails, fix it before moving on.

---

## Session End

Before closing a session:

1. Run the full verification checklist.
2. Update `CONTEXT.md`:
   - Current date.
   - What was done this session.
   - What is still open or pending.
   - Any new tech debt discovered.
   - Any decisions made that future sessions should know about.
3. Output the updated `CONTEXT.md` in full.

---

## One Session, One Task

Each session has one clearly scoped task.
Do not start a new feature while one is partially done.
Do not fix unrelated bugs while implementing a feature.
If you discover something broken that is out of scope, add it to the tech debt list and continue.

---

## When Something Is Unclear

State the ambiguity explicitly.
Make a reasonable assumption, state it clearly, and proceed.
Do not silently pick an interpretation and hope it was right.

---

## When Something Is Broken

Fix the root cause. Never:
- Suppress the error with a comment.
- Disable a rule to hide it.
- Work around a broken file instead of fixing it.
- Add a new feature on top of broken code.

If a fix is out of scope for this session, document it as tech debt and stop until clarified.
