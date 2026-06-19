# CLAUDE.md — scripts/

These are scripts a person reads and runs with their own body. **A non-coder must be
able to read one top to bottom and understand it.** That is the only hard requirement.

## Voice

Low-threshold, loose, playful, collective — never strict or over-thought. Scripts
invite, they don't command. Leave room to not force anything ("no forcing", "as you
feel"). A look, a nod, a half-sentence still counts.

## Rules

1. **One import, always:** `from social_script import *`. Nothing else, no sub-imports,
   no config.
2. **Functions are verbs** that read like instructions: `say()`, `anchor()`, `flow()`,
   `exit_gracefully()`. Never expose mechanism.
3. **Phrases are constants:** `say(greeting.neutral)`, never `say("hello")`. Free-form
   lines use `question(...)` / `instruction=...`, not bare strings to `say`.
4. **State is intuitive, global, gut-level:** `assess_internal(fear)` returns 1–10;
   yes/no states like `willingness_to_continue` return a bool; `sense("...")` is an
   honest yes/no. No precise tracking, no measurement.
5. **Comments are inner monologue** — intent, not code. `# ground first, then move`.
6. **Silence is an action:** `wait()`, `hold_posture()` are real steps, not filler.
7. End a `# --- main flow ---` section that reads as a calm sequence of moves.

## Exceptions

The person can interrupt at any point (e.g. `FearTooHigh`). You usually need **no**
try/except — the runner steps back and lets them continue. Only catch an exception when
you want specific recovery (e.g. `breath_in_out(3)` then retry). See `connect_group.py`
and `see-sth_say_sth.py` for the pattern.

## Smell test before finishing

Read it as the person about to do it. If a line feels technical, pushy, or unclear —
rewrite it softer and simpler.
