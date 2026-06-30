# Plan: `deep_dive.py` — a conversation built as a feedback loop

## Context

This is an art project: humans execute Python-shaped "social scripts" by hand, asking
*can an algorithm create connection / hold someone through social anxiety?* Three scripts
have now been run by people. The feedback is specific:

- **connect_group**: felt like "we do this, then bye." *Never even asked for names.* No
  follow-up questions. People skipped steps or ended fast when it got awkward. Games felt
  generic.
- **see-it / say-it**: fun and low-threshold, but *unclear what it's saying*; the inner
  state gets lost over a long run; too much idle time (walking, hunting for a person).
- **all scripts**: barely any exception handling.
- **from the artistic group**: a **feedback loop** is the thing to build — input →
  processing → output → *output becomes the next input*. And: capture **real
  subjects/objects as return values and reuse them.**

No existing primitive can do the last two literally: `io_read` returns `""` for free text
([driver.py:140](social_script/_internal/driver.py#L140)), so a script can never keep a
real name or word the person heard and weave it back. Every "loop" today only carries
booleans and counts. **The new script makes the loop literal**: it keeps a real name and
the real words someone says, and each answer becomes the next question. That is the
feedback loop, and it is the direct fix for connect_group's "no names, no follow-ups,
awkward early exit."

**Modality decision:** this round ships **words only**. But the capture mechanism is
designed so a captured *thing* can later be a **photo** instead of a word, with no
redesign — the answer channel is already a string and the prompt schema is already a
generic `input_type`. The *thread* the script follows is meant to hold either kind: a word
now, a photo later. See "Future seam" below.

## The concept — `deep_dive.py`

A one-on-one conversation where **the app holds the thread**. You make one brave move —
walk up to one person. From there the app listens to what they say and hands you the next
question, **built from their own last words**. Their answer is the next input; the talk
deepens on its own. The app keeps their **name** and their **words** (real subjects/objects
as return values) and periodically **loops all the way back** to something said earlier.
If it gets to be too much, that isn't failure — the app catches it and makes the next step
smaller ("Überforderung = Fehler = wird behandelt", made concrete).

Why this answers the feedback:
- *connect_group "no names / no follow-ups / quick bye"* → the engine **is** names +
  follow-ups; willingness-gated soft close instead of an awkward drop.
- *see-it "inner state lost / idle time"* → an inner check-in is woven into the loop;
  approach is one quick move, then straight into capture — almost no idle time.
- *"feedback loop, output → input"* → literal: `ask(person, pick_from(QUESTIONS))` poses a
  question built from `person`'s own last word; `listen_to(person)` catches the next one.
- *"real subjects/objects as return value, reused"* → `person` is the reused return value: `ask`
  builds each question from its `mentioned` memory (`first_thing`/`last_thing`).

## Framework additions

### 1. Conversation primitives: a `Person` with memory + the verbs to talk to them

The feedback loop needs a real subject that **accumulates** what you learn and hands it back.
Three small, *general* additions (reusable by any future script):

**`social_script/environment.py` — give `Person` a name and a memory:**
```python
class Person:
    def __init__(self, name=""):
        self.name = name
        self.mentioned = []                 # the real things they've told you, in order

    @property
    def first_thing(self):                  # where the thread started
        return self.mentioned[0] if self.mentioned else "that"

    @property
    def last_thing(self):                   # where it is now
        return self.mentioned[-1] if self.mentioned else "that"

    def __str__(self):
        return self.name or "them"

    def __repr__(self):                     # so the exhibit's variable view shows the name
        return self.name or "them"
```
(`me = Person()` and `reduce_distance_to(Person())` still work — `name` defaults to "".)

**`social_script/_internal/driver.py` — `InputType.text`:** add `text = "text"` to the enum
and a CLI hint (`" — type it: "`). This is the one capture primitive; scripts never call it
raw — it lives inside the verbs below.

**`social_script/actions.py` — five small verbs** (export all via `import *`):
```python
def get_to_know(person):
    "Ask their name and write it down — the start of knowing them."
    name = io_read("Ask their name — what is it?", input_type=InputType.text)
    person.name = name or "them"

def ask(person, about):
    "Pose a question — the app fills in what they've already told you."
    say(f"Ask {person} {about.format(name=person, first=person.first_thing, last=person.last_thing)}.")

def listen_to(person):
    "Catch one thing they just said and keep it on the person."
    thing = io_read(f"What did {person} say? One word only.", input_type=InputType.text)
    person.mentioned.append(thing or "that")
    return thing or "that"

def tell(person, what):
    "Say something to them, in your own words."
    say(f"Tell {person}: {what}")

def assess_vibe(person):
    "Read the vibe — how willing you are to go on, and how they seem."
    you = assess_internal(willingness_to_continue)
    them = assess_external(person, willingness_to_continue)
    return you and them
```

- **Real subject as a reused return value:** `person` *is* the accumulating return value — and
  it is genuinely consumed, not just stored: `ask(person, …)` builds every question from its
  memory (`first_thing`/`last_thing`). The full `mentioned` record is where the close and future
  growth (interests, traits, a photo — see Future seam) hang off.
- **Replay safety** (confirmed): `ReplayDriver` returns `answers[i]` by **index, not content**
  ([driver.py:83-91](social_script/_internal/driver.py#L83)); `person` is rebuilt identically
  from the recorded answers each re-run, and captured text only appears *inside* prompt strings,
  never as control flow.

### 2. Frontend — render the text input (one small component, build now)

The API and Pyodide bridge are payload-agnostic (they pass `input_type` through untouched),
so only the React layer needs the new control. There's already a free-text field in the
exception-note flow to pattern-match.

- **`frontend/src/types.ts`** — add `'text'` to the `InputType` union.
- **`frontend/src/inputs/TextInput.tsx`** (+ `.module.css`, **new**) — a text field +
  confirm, modeled on `ScaleInput.tsx` and the existing note `<input>` in
  `frontend/src/screens/RunnerScreen.tsx`. `onSubmit(value)`.
- **`frontend/src/screens/RunnerScreen.tsx`** — import it and add the
  `prompt.input_type === 'text'` branch alongside the existing four.

### 3. Future seam — photos dock here (design now, do NOT build now)

Per the modality decision, no camera code this round. But verify nothing blocks it, and
keep the shape ready (no dead code — just a clean seam):

- **Already generic, no change:** the answer is a plain string (a photo will be a
  `data:` URL string) and `next_prompt` carries a free-form `input_type`
  ([driver.py:92-97](social_script/_internal/driver.py#L92)) — so an image prompt/answer
  flows end-to-end without touching the API or the Pyodide bridge.
- **What a later "photos" PR adds:** `InputType.image`; a sibling of `listen_to()` —
  `snap(person)` that captures a photo (a `data:` URL) and appends it to the person just like a
  word; a camera component in `frontend/src/inputs/` using `<input type="file" accept="image/*"
  capture="environment">` → reads the file to a data URL → `onSubmit(dataUrl)`.
- **The one genuinely new piece, flagged:** for a photo to be *shown back* as the next input (a
  visual loop), `next_prompt` needs an optional `image` field and a `show()`-style verb; the
  renderer would display it above the text. That display-back is the only part not already
  supported — name it explicitly so the seam is honest.
- Keep `listen_to()` grouped/named so `snap()` reads as its natural sibling later.

### 4. Exception handling that actually fires in replay (build now)

**Diagnosis (corrected after reading every runner):** the *whole system is already built
for interrupts to propagate* to a top-level handler. `run.py:37-42`,
[api/main.py:115-119](api/main.py#L115), `frontend/src/engine/runtime.py:43-44`, and
`exhibit/build_trace.py:107-111` each `except AnyException` and handle it gracefully (return
a structured `exception`, or pop-and-retry). The **lone blocker** is `io_read`, which
catches `AnyException` for a `ReplayDriver` and returns a default
([driver.py:131-140](social_script/_internal/driver.py#L131)) — short-circuiting every one
of them, so a script's `try/except` never sees the interrupt and the top-level paths are
dead. (It's also why `delulu_in_public.py`'s "refused — deal another" never actually deals
another.)

**The fix (minimal):** drop the swallow so `io_read` is just
`return get_driver().input(...)` and lets `AnyException` propagate. `CLIDriver` already
propagated; this only changes the `ReplayDriver` path. Normal answers are untouched — the
swallow only ever fired on `AnyException`. This one change:
- lets a **script catch an interrupt during replay** and recover — the feature; and
- revives the **already-built** fallback for *uncaught* interrupts: api/runtime return a
  structured `exception` → the frontend shows it briefly, then auto-rolls-back and
  re-prompts; run.py pops it and re-prompts; build_trace pops + re-traces. **No 500s/crashes
  — confirmed by reading those files.**

**Determinism:** a recorded interrupt is just an answer at a fixed index. Caught → a
deterministic recovery branch; the `"SensoryOverload(note)"` string stays in `answers` as a
recorded branch point and replays identically. Uncaught → top-level acknowledge + the
frontend's existing rollback removes it.

**Migration caveat:** this changes how *old* recorded sessions that contain an interrupt
replay (they were recorded under swallow semantics) — new sessions are correct, and
already-rendered exhibit videos need no re-replay. Low risk at this project stage; note it.

### 5. Readability: rename the core verb `deal` → `pick_from`

`deal(deck)` (the app draws one item at random) doesn't explain itself at a glance. Rename
it to `pick_from(deck)` in `social_script/play.py` and update its two existing call sites
(`scripts/connect_group.py`, `scripts/delulu_in_public.py`). Same behavior, clearer name.

### 6. Exhibit: show the exact sentence being said

The exhibit code-view shows the source line + variable values (debugger style) but **never
the composed sentence the human was actually told to say** — `TracingDriver.input()` records
only a step index and drops the `io_read` `text`
([build_trace.py:92-96](exhibit/build_trace.py#L92); timed schema at
[:201-205](exhibit/build_trace.py#L201)). Every prompt
(`say`/`ask`/`tell`/`listen_to`/`sense`/`assess`) reaches `io_read(text=...)` already fully
composed (e.g. *"Ask Maria the story behind diving."*), so:
- **`exhibit/build_trace.py`**: in `TracingDriver.input()`, record `text` (and `headline`) on
  the step event and carry it onto the matching `timed_trace` frame.
- **`exhibit/exhibit.js` + `index.html` + `exhibit.css`**: render that sentence as the line
  runs — a small "what you say" line under the active code line, distinct from the
  debugger-style variables.
- **The captured name shows up too:** it rides inside these sentences (*"Ask Maria …"*), and
  `Person.__repr__` (§1) returns the name so the variable view reads `person = Maria` rather
  than an opaque object — the real subject is legible in the exhibit.

This is the missing half of the code-view (you watch the variables change; now you also see
the words they produce) and applies to *every* script, not just `deep_dive`.

## The script (draft — `scripts/deep_dive.py`)

Voice follows `connect_group.py` (the designated model): plain, low-threshold lines passed
to `say()`, intent-only comments, a calm `# --- main flow ---`.

```python
"""
Social script
version: v1
tags: feedback-loop, one-on-one, deepening
"""

from social_script import *


# An art-project conversation built as a feedback loop. You make one brave move:
# walk up to one person. From there the app holds the thread — it takes what they
# just told you and hands it back as your next question. Their answer becomes the
# next question, again and again, and the talk deepens on its own. Everything they
# say is kept on `person`, and now and then the app circles all the way back to
# where you started. If it gets to be too much, that isn't a failure — you breathe,
# and the two of you decide together where to go next.


# the app hands you one of these to ask about, one at a time. most build on the
# LAST thing they said; a couple circle all the way back to the FIRST.
FOLLOW_UPS = [
    "more about {last}",
    "what the best part of {last} is",
    "how they got into {last}",
    "what {last} reminds them of",
    "the story behind {last}",
    "why {last} matters to them",
    "what they would change about {last}",
]
CIRCLE_BACK = [
    'what "{first}" has to do with {last}',
    'more about "{first}", back where you started',
]
QUESTIONS = FOLLOW_UPS * 3 + CIRCLE_BACK   # mostly build on the last word; now and then circle back

OPENERS = [
    "what brought them here",
    "what's been on their mind lately",
    "what they'd be doing if they weren't here",
    "the last thing that made them laugh",
]

# the ways it can get to be too much — each one is met and held, not a failure.
too_much = (SensoryOverload, UnexpectedReaction, FearTooHigh)
felt_judged = Shame


def find_someone():
    # walk up to one person and say why you're here, and hand back whoever's up for
    # it — if they're not, let them go and try someone else
    observe_environment()
    reduce_distance_to(Person())
    say("Walk up and say: it's an art project — the app gives me the questions. Got a minute?")
    say("Mention it's filmed for the project — is that okay with them?")
    if not sense("Are they up for it?"):
        say("No worries — let them go, and find someone else when you're ready.")
        return find_someone()
    return Person()


# --- main flow ---

person = find_someone()                # the one who's up for it
get_to_know(person)                    # ask their name

opener = pick_from(OPENERS)
ask(person, opener)                    # get them talking
listen_to(person)                      # keep one thing they said

# at least three rounds before the first check-in, then one more every three
rounds_until_check = 3
keep_going = True
while keep_going:
    try:
        question = pick_from(QUESTIONS)
        ask(person, question)              # their own words, handed back as the next question
        listen_to(person)                   # keep one thing they said
    except too_much:
        breath_in_out(3)
        if not sense("Still want to be here?"):
            break
        tell(person, "this is a lot for me — what do we do now?")
        listen_to(person)                   # let them steer; keep what they offer
    except felt_judged:
        breath_in_out(2)
        tell(person, "I felt a bit judged just then")
        if not sense("Okay to keep going?"):
            break
    except AnyException:
        break                               # lost interest, had to leave — let it end here

    rounds_until_check = rounds_until_check - 1
    if rounds_until_check == 0:
        keep_going = assess_vibe(person)    # check in with both of you
        rounds_until_check = 3              # then give it another three

ask(person, "to come talk to you if your paths cross again")
tell(person, "thanks — it was good talking")
```

Notes:
- **Reads as prose** (the hard rule): the main flow is named instructions a non-coder reads
  top to bottom; the only arithmetic is the round counter that paces the vibe check. The only
  script-level function is `find_someone` (recursive, returns the `Person`); the conversation
  verbs (`get_to_know`/`ask`/`listen_to`/`tell`/`assess_vibe`) live in the core. Interrupt
  types are aliased to plain language (`too_much`, `felt_judged`) so `except too_much:` reads
  as a sentence. Headlines are omitted (defaults).
- **Addressing model** (keep consistent): `ask(person, …)` and `tell(person, …)` are
  instructions to *you* — a question to pose, or a thing to say, to the person in front of
  you; never narration to a third party. `listen_to(person)` records what they said back.
  `QUESTIONS`/`OPENERS` are the "about" of a question ("Ask {name} the story behind {last}").
- **Determinism**: all randomness goes through seeded `pick_from()`; loop length depends only
  on recorded `assess_vibe`/`sense` answers and the round count; captured text only ever appears
  *inside* prompt strings (index-matched), never as control flow. Safe under replay.
- **Empty-capture guards** live in the verbs (`get_to_know`/`listen_to` fall back to
  "them"/"that"), so a skipped or empty capture never breaks the thread.
- **Photo seam in the script**: when photos land, a photo turn is `snap(person)` in place of
  `listen_to(person)`; nothing else in the flow changes.
- **Voice/rule note**: `scripts/CLAUDE.md` rule 3 prefers `question(instruction=...)` over
  bare strings, but `connect_group.py` (the designated model) passes bare strings to `say()`
  and `say()` wraps them as `Phrase(instruction=...)` — functionally identical and far more
  readable. Following the model; adjustable if you'd rather be strict.

## Files to touch (this round)

| File | Change |
|---|---|
| `social_script/_internal/driver.py` | add `text` to `InputType` + CLI text hint (§1); **drop the `AnyException` swallow in `io_read`** so interrupts propagate (§4) |
| `social_script/environment.py` | give `Person` a `name` + `mentioned` memory (§1) |
| `social_script/actions.py` | add `get_to_know` / `ask(person, about)` / `listen_to` / `tell` / `assess_vibe` verbs (§1) |
| `social_script/__init__.py` | export `get_to_know`/`ask`/`listen_to`/`tell`/`assess_vibe` via `import *` (match wiring) |
| `social_script/play.py` | rename `deal` → `pick_from` (§5) |
| `scripts/deep_dive.py` | **new** — the script above (incl. its loop `try/except`) |
| `scripts/connect_group.py`, `scripts/delulu_in_public.py` | update `deal(...)` → `pick_from(...)` call sites (§5) |
| `frontend/src/types.ts` | add `'text'` to `InputType` |
| `frontend/src/inputs/TextInput.tsx` + `.module.css` | **new** input control |
| `frontend/src/screens/RunnerScreen.tsx` | import + `=== 'text'` render branch |
| `exhibit/build_trace.py` | record `io_read` `text`/`headline` on step + timed-trace frames (§6) |
| `exhibit/exhibit.js`, `exhibit/index.html`, `exhibit/exhibit.css` | render the composed sentence per step (§6) |
| *(no change)* `api/main.py`, `frontend/src/engine/runtime.py`, `run.py` | already catch `AnyException` at top level — they handle the now-propagating uncaught interrupts (§4) |

## Verification

1. **CLI happy path**: `python run.py deep_dive.py` — step through: approach → name →
   opener → follow-up rounds (occasional circle-back; a vibe check on you *and* them every 3rd
   round, min 3) → soft close. Confirm the typed name/word **reappears** verbatim in later
   prompts (the loop is visible).
2. **Replay determinism**: capture the printed `seed`, re-run
   `python run.py deep_dive.py '<answers-json>' <seed>` and confirm the exact same path /
   prompts, and that the text input is recorded and replayed by index.
3. **Interrupt handling** (§4): after dropping the swallow — in CLI and in the PWA,
   interrupt mid-loop and "continue": an *overwhelm* reason (sensory overload / unexpected /
   fear) should breathe, ask if you still want to be here, then (if yes) tell them it's a lot
   and let them steer; a *shame* reason should breathe, tell them you felt judged, then ask if
   it's okay to keep going; a *leaving* reason should close kindly (all caught → recover or
   break). Then interrupt at a prompt the loop doesn't wrap (e.g. the first name capture) and
   confirm the *uncaught* path still acknowledges + re-prompts with no 500. Finally re-run
   `exhibit/build_trace.py` over a session containing an interrupt and confirm it still renders.
4. **Frontend**: run the PWA, pick `deep_dive`, confirm the new text field renders for the
   name (`get_to_know`) and `listen_to` prompts, the answer round-trips, and the captured name + words show
   up in later prompts. Sanity-check the exhibit/video replay of a session with a text answer.
5. **Exhibit shows the words + the name** (§6): rebuild the trace for a recorded `deep_dive`
   session and confirm the code-view shows the exact composed sentence at each step (e.g.
   *"Ask Maria the story behind diving."*) in sync with the highlighted line (and video if
   present), and that the person's **name** is visible — both in the sentences and as
   `person = Maria` in the variable view.
