# CLAUDE.md

Social Script: a behavioral language disguised as Python. Scripts describe how to
navigate social situations, executed by a human — not a machine.

## Golden rule

Code is minimal, simple, readable. Make as many changes as needed but as few as
possible. Readability beats cleverness, always.

## Layout

- `social_script/` — core package. `actions.py` (verbs), `phrases.py`, `states.py`,
  `environment.py`, `exceptions.py`, `_internal/driver.py` (I/O).
- `scripts/` — the actual human-run scripts. See `scripts/CLAUDE.md` — different rules.
- `frontend/` — React + Vite PWA that runs the scripts client-side via Pyodide
  (offline, no API). See `frontend/CLAUDE.md`.

The Python in `social_script/` + `scripts/` is the **single source of truth**. The
frontend imports it verbatim at build time — never fork or reimplement it in JS/TS.

## How execution works

The runner is **stateless and deterministic**. Each step re-runs the script from the
top with all answers so far, fast-forwarding to the next unanswered prompt. So:

- Never add persistent state, caching, or side effects between steps.
- Same answers must always follow the same path. No `random` without a seeded/recorded
  source of variation that survives replay (existing scripts use `random` at import —
  keep new randomness inside recorded prompts like `choose()`).
- All human I/O goes through `io_read`/`io_write` in `_internal/driver.py`. Don't
  `print()` or `input()` directly.

## Adding to the core package

- New action = a verb function in `actions.py`. It names what the body/mind/voice does
  and hides all mechanism. One `io_read(..., headline=..., input_type=...)` call inside.
- New phrase = a `category.name` constant, never a raw string.
- New inner signal = a state in `states.py` exposing `.question()`.
- Keep the single import contract intact: everything reachable via
  `from social_script import *`.

## What does NOT belong

UI, networking, storage, data processing, precise measurement/tracking, dynamic text
generation. If it isn't a human action, pause, gut-feeling, or phrase — it doesn't go here.

## Testing

You can test social script by running `python run.py <social_script_name>.py`