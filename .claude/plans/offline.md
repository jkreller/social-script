# Offline Script Execution — Feasibility Evaluation

## Context

Scripts are executed step-by-step: every answer triggers a `POST /step` to the FastAPI backend, which re-runs the whole Python script with a `ReplayDriver` until the next unanswered prompt. Offline, the runner is dead. Question: how hard is offline script execution in the client (React PWA)?

**Design constraint:** Python is used *only* because it reads intuitively for non-coders — the readable script source (e.g. [connect_group.py](scripts/connect_group.py)) is the product.

## Verdict: easy — roughly 1–2 days

1. **The server is fully stateless.** `POST /step` ([api/main.py:80-104](api/main.py#L80-L104)) is a pure function `(script, answers[]) → next prompt`. The client already owns all run state (`answers[]` in `App.tsx`). Nothing to migrate.
2. **No server-only resources.** Per step, only the script `.py` and the ~550-line `social_script` package are needed — static files. No DB, no LLM, no auth. The PWA shell (Workbox precaching, [frontend/vite.config.ts](frontend/vite.config.ts)) already works offline.

So "offline" just means running that same pure function in the browser. The only real decision is **how to execute the script client-side**. Two viable routes:

## Keep stateless replay, or roll back to live runtime execution?

Once execution moves into the client, the original reason for statelessness (an HTTP server can't keep a paused script alive between requests) disappears — the browser is one long-lived process running one script at a time. It's tempting to roll back to the pre-API model (commit `07ca397`, still alive in `CLIDriver`): run the script once, top to bottom, and block inside `io_read()` until the user answers.

**Evaluation: keep stateless replay. Rolling back would make the offline build harder, not simpler.**

1. **Blocking Python in the browser is technically hostile.** A Pyodide Web Worker cannot pause synchronous Python waiting for UI input without either `SharedArrayBuffer` + `Atomics.wait` (requires COOP/COEP cross-origin-isolation headers — constrains hosting, interacts badly with service workers) or WebAssembly JSPI (not available on iOS Safari — the primary target, per the recent iOS camera fixes). Replay needs none of this: each step is a fresh, short synchronous run that terminates immediately (`NeedInput`), driven by plain `postMessage`.
2. **Crash recovery matters *more* on a phone than it did on the server.** iOS kills backgrounded PWAs aggressively — phone locked mid-script, user switches to another app. With replay, persisting `answers[]` to `localStorage` makes any run resumable after the interpreter dies: restart Pyodide, replay, land on the exact same prompt. With live execution, a killed interpreter loses the run — and the only way to restore it would be... replay. Live mode would have to keep the replay machinery anyway as its recovery path.
3. **Replay gives features live execution can't:** a back/undo button (pop an answer, replay), the existing interrupt mechanism (`FearTooHigh(note)` injected as an answer), and `answers[]` as the canonical run record already used for the log download.
4. **One engine, three frontends.** ReplayDriver stays shared between web, FastAPI server, and any future use; `CLIDriver` keeps the live model where it actually fits (a terminal can block).
5. **The costs of replay are negligible or fixable.** O(n²) re-execution is microseconds for 100-line scripts at human answering pace. The one real cost — scripts must be deterministic, which `random.choice` in [connect_group.py:75](scripts/connect_group.py#L75) silently violates — is fixed by seeding `random` once per run (seed generated at run start, stored with the run, set by the engine before each replay). That removes the only observable replay artifact while letting authors keep writing natural `random.choice`.

Live execution would only win if scripts gained side effects that must not re-fire (network calls, hardware actions) or became long enough that replay lagged — neither applies, and all action I/O already funnels through the driver where replay suppresses it.

## Option A — Pyodide: full CPython (WASM) in a Web Worker

Scripts and engine run byte-identical to backend/CLI. Zero authoring constraints, CLI keeps working.

- **Cost:** ~7–12 MB one-time download (precached by service worker — invisible after install), ~1–3 s warm-up (hide behind home screen).
- **Changes:**
  1. Copy `social_script/` + `scripts/` into `frontend/public/py/` at build time (npm `prebuild` script) so Workbox precaches them.
  2. New `frontend/src/engine/worker.ts` — Web Worker loading Pyodide (`npm i pyodide`), writes sources into Pyodide's FS, exposes `step(script, answers)`, `listScripts()`, `listExceptions()`; Python side is ~30 lines mirroring the `/step` handler (`ReplayDriver` + `_to_replay_answer`).
  3. Rewrite [frontend/src/api.ts](frontend/src/api.ts) internals from `fetch` to the worker — same signatures, so `App.tsx`/`RunnerScreen.tsx` are untouched.
  4. Add Pyodide assets + `public/py/**` to Workbox precache config.
  5. **Run persistence:** save `{ script, answers, userName, startTime }` to `localStorage` on every answer; on app start, offer to resume — restart Pyodide, replay, land on the same prompt. This is the iOS-kills-PWA recovery path.

## Option B — TypeScript port (aesthetic proof of concept below)

Engine port is trivial (~550 lines; same throw-`NeedInput` replay trick works in JS). Scripts must be rewritten in TS. Tiny bundle, no WASM, instant start — but the Python authoring story and the CLI runner die.

### Proof of concept: `connect_group.py` → `connect_group.ts`

(Action vocabulary assumed injected as globals by the engine, mirroring `from social_script import *`.)

```ts
// connect_group.ts

function initialize_approach_with(group: Group): Phrase {
  // pick an opener based on what the group is currently doing
  const group_activity = observe(group, Activity)
  switch (group_activity) {
    case Activity.conversing: {
      const topic = catch_conversation_topic(group)
      const opener = topic ? think_of_question(topic) : null
      if (opener) return opener
      return question(choose([
        "Who is the tallest of you all?",
        "Wine or beer?",
        "Who is the most chaotic in your group?",
      ]))
    }
    case Activity.gaming: {
      const game = catch_game(group)
      if (game && assert_knowledge(game)) {
        return question("Can I join you?")
      } else {
        return question("What do you play?")
      }
    }
    default:
      return random_question()
  }
}

function approach(opener: Phrase) {
  // say the opener, then hold space for their response
  try {
    say(opener)
  } catch (e) {
    if (!(e instanceof FearTooHigh)) throw e   // mandatory — JS can't catch a specific exception
    breath_in_out(3)
    approach(opener)
    return
  }

  hold_posture()
  flow()
}

function catch_conversation_topic(group: Group): boolean {
  // can you make out what they're talking about?
  return io_read("Can you catch their topic?", { headline: "listen", input_type: "yn" }) === "y"
}

function think_of_question(topic: boolean): Phrase | null {
  const raw = io_read("Think of a question about the topic. Do you have any?", { headline: "think", input_type: "yn" })
  if (raw === "y") {
    return question({ instruction: "Ask the question you have in mind" })
  }
  return null
}

function catch_game(group: Group): boolean {
  return io_read("Can you tell what game they're playing?", { headline: "observe", input_type: "yn" }) === "y"
}

function assert_knowledge(subject: unknown): boolean {
  return io_read("Do you know this game well enough to join?", { headline: "think", input_type: "yn" }) === "y"
}

function random_question(): Phrase {
  const options = [
    "What's the most random skill among you all?",
    "What's something your group is weirdly proud of?",
    "What would you all be doing right now if you weren't here?",
    "What's the most controversial opinion in your group about something completely unimportant?",
    "If your group had a theme song, what would it be?",
    "What's the last thing that had all of you laughing?",
    "Who in your group would surprise people the most?",
    "If you all had to eat one thing forever, could you even agree on what?",
  ]
  return question(choice(options))
}

// --- main flow ---

sit_down()
observe_environment()

let group = null
while (!group) {
  wait()
  const potential_group = find_group_of_people()
  if (interested_in(potential_group) && assess_external(potential_group, readiness_for_interaction) > 5) {
    group = potential_group
  }
}

let fear_level = assess_internal(fear)

if (fear_level <= 5) {
  const opener = initialize_approach_with(group)
  approach(opener)
} else {
  if (!distance_of(me, group).in_understanding_range) {
    reduce_distance_to(group)
  }

  let keep_trying = true
  let reaction = null
  while (keep_trying) {
    reaction = show_interest_and_wait()
    if (reaction) break
    fear_level = assess_internal(fear)
    if (fear_level <= 5) break
    keep_trying = willing_to_continue()
  }

  if (reaction) {
    flow()
  } else if (fear_level <= 5) {
    const opener = initialize_approach_with(group)
    approach(opener)
  } else {
    exit_gracefully()
  }
}
```

### Aesthetic assessment of the PoC

~80% as readable as the Python. What survives: the main flow at the bottom is nearly as scannable; `match` and walrus translate cleanly. What degrades, by severity:

1. **Interrupt handling (structural wart).** Python's `except FearTooHigh:` — the emotional heart of these scripts — becomes `catch (e) { if (!(e instanceof FearTooHigh)) throw e; ... }`. Noise for non-coders *and* a footgun: a forgotten rethrow silently swallows the engine's `NeedInput` and breaks replay. In Python this failure is opt-in (bare `except:`); in JS it's the default of the only syntax available. Mitigable with an `attempt(...).onInterrupt(FearTooHigh, ...)` helper, at the cost of a small DSL to learn.
2. **Symbol noise.** `&&`/`!`/`===`/braces/`let`/`const` vs `and`/`not`/indentation — shifts the register from "instructions" to "code".
3. **Scope ceremony.** Pre-declaring `let reaction = null`; imports or magic globals.

## Ruled out

- **MicroPython WASM** (~0.5 MB): no `match`, no `enum` — permanent "compatible subset" tax on script authors.
- **JSON/YAML DSL:** control flow (loops, interrupts) in YAML is far less readable than Python.
- **Brython/Skulpt/Transcrypt:** partial modern-syntax support, semantic-drift risk.
- **Precomputed decision tree:** unbounded `while` loops + recursion + injectable interrupts = infinite branch tree.

## Recommendation

**Option A (Pyodide), running locally always** — not just as offline fallback. The server becomes an optional script source; no online/offline divergence bugs. Option B only if the ~10 MB download is unacceptable and losing the Python authoring story is acceptable.

**Keep the stateless replay mechanism** (see evaluation above): live blocking execution would require SharedArrayBuffer/JSPI machinery the iOS-targeted PWA can't rely on, and replay is what makes runs survive iOS killing the app, enables undo, and keeps one engine across web/server/CLI.

Pre-existing quirk (either option): `random.choice` in [connect_group.py:75](scripts/connect_group.py#L75) re-rolls on every replay, so the opener text can change mid-run. Exists on the server today; separate fix (seed `random` per run).

## Hosting: is Vercel's free (Hobby) plan enough?

**Yes — and the offline plan makes it a better fit, not a worse one.** Going offline-first *removes* the backend, which is the only thing that didn't fit Vercel cleanly before.

Today the app is split across two hosts: the Vite frontend on Vercel + the FastAPI server on Railway/Fly ([frontend/README.md:40](frontend/README.md#L40), `VITE_API_URL`). Once Pyodide runs scripts client-side (Option A), the FastAPI server is no longer on the request path — the entire app collapses to **static files** (HTML/JS/CSS + the Pyodide WASM/stdlib + the `.py` sources under `public/py/`). Static asset serving is exactly what Vercel's free tier does best, and it needs **zero serverless functions**.

What actually matters on Hobby:

1. **Bandwidth — 100 GB/month, fine at this scale.** The ~10 MB Pyodide payload is the only heavy asset, and the service worker precaches it, so it's fetched roughly **once per device install**, not per visit. That's ~10,000 fresh installs/month before hitting the cap — far beyond a personal app's reach. Pin a Pyodide version so app-code redeploys don't re-fetch it (the assets are version-hashed and immutable-cached).
2. **No per-file or deploy-size wall.** A ~10 MB `.wasm` is well within Vercel's static limits; no large-file issue.
3. **We deliberately avoid the one Vercel headache.** Keeping replay (not live blocking execution) means we do **not** need `SharedArrayBuffer`, so we do **not** need COOP/COEP cross-origin-isolation headers — which on Vercel require a `vercel.json` `headers` block and can interfere with the service worker. Sidestepped by design.
4. **No server, no cold starts, no function timeouts.** The classic free-tier serverless pain points (10 s timeouts, cold starts, Python runtime quirks) don't apply because there's nothing server-side left.

**The one real caveat is licensing, not capacity:** Vercel's Hobby plan is **non-commercial use only**. If this stays a personal/portfolio/non-commercial project, free is genuinely sufficient indefinitely. If it's ever monetized, you need Pro (~$20/mo) — but that's a terms-of-service line, not a technical limit.

If you'd rather not even think about the commercial clause, the same static build deploys unchanged to Cloudflare Pages or GitHub Pages (both free, no non-commercial restriction). But for now: **Vercel free is fine, and gets simpler the moment the backend goes away.**

## Verification

- `cd frontend && npm run build && npx vite preview`, complete a full run with the API server **stopped**.
- Chrome DevTools → Network → "Offline": reload installed PWA, run end-to-end covering a yes/no branch, a scale answer, injecting `FearTooHigh(note)`, and reaching `done`.
- Parity check: same answer list against the FastAPI server → identical prompt sequence.
