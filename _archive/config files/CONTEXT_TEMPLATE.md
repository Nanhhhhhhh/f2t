# CONTEXT.md — [Project Name]

> This file is the agent's memory. It is updated at the end of every session.
> Every new session starts by reading this file before doing anything else.
> Do not trust training data or previous conversation history — trust this file.

---

## Project Identity

- **Project:** [Brief description]
- **Frontend:** [Framework, key libraries]
- **Backend:** [Framework, key libraries, database]
- **Repo layout:** [Monorepo structure or separate repos]

---

## Locked Decisions

Decisions that must not be revisited without explicit developer approval.

| Decision | Value | Reason |
|---|---|---|
| | | |

---

## Environment Configuration

### Backend
- Key env vars and what they control.

### Frontend
- Key env vars and what they control.

---

## Current Project Status

**Last updated:** YYYY-MM-DD
**Last session:** [Brief description of what was done]

| Phase / Feature | Status | Notes |
|---|---|---|
| | | |

---

## Module / Component Status

| Module | Built | Tested | Lint clean | Notes |
|---|---|---|---|---|
| | | | | |

---

## All API Endpoints

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| | | | | |

---

## Known Issues & Tech Debt

| ID | Severity | Description | Status |
|---|---|---|---|
| | | | |

---

## How to Start Any New Session

```
Read CONTEXT.md first. That is your memory.
Do not rely on anything else.
Your task for this session: [describe the task]
```

---

## Update Instructions

At the end of every session, update:
1. "Last updated" date
2. "Last session" description
3. Phase status table
4. Module status table
5. Known issues table
6. Endpoint table if changed

Then output the updated CONTEXT.md in full.
