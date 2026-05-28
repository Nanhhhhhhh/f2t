# Recommender Feature — Kickoff Prompt

> Open Claude Code at `/Users/macos/f2t/` and paste this as your first message.

---

I have **12 hours** to ship a personalized product recommender into the f2t app and integrate it end-to-end. This is not a research project — it must work in the running app at the end.

Before writing any code:

1. Read `/Users/macos/f2t/CONTEXT.md` and `/Users/macos/f2t/CLAUDE.md` — these are the project-wide rules. Inherit all of them.
2. Read `/Users/macos/f2t/feature-recommender/CONTEXT.md` — the feature spec.
3. Read `/Users/macos/f2t/feature-recommender/RULES.md` — feature-specific decisions and what to skip.
4. Read `/Users/macos/f2t/feature-recommender/WORKFLOW.md` — the 12-hour phased plan with hour budgets.
5. Acknowledge by summarizing in under 100 words: what we are building, where it integrates, and the hour budget breakdown.

Then wait for my "go". After "go", begin **Phase 0 — Sidecar scaffold** as specified in WORKFLOW.md.

**Hard rules during this build:**
- Match the existing `pricing-sidecar/` pattern for the FastAPI service.
- Match the existing `dynamic-pricing` module pattern for the NestJS module.
- Match the existing api hook + screen patterns on the frontend.
- Do NOT modify any existing module's schema, controller, or service unless WORKFLOW.md explicitly says so.
- Do NOT add new locked decisions. Do NOT discuss alternative approaches. Build.
- If something takes longer than its hour budget, cut scope per WORKFLOW.md's "stop-or-cut" rules. Do not blow the budget.
