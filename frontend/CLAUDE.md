# CLAUDE.md — frontend/

React + Vite PWA that runs Social Script **fully offline** — no backend. The real
`social_script` package and `scripts/` run client-side in Pyodide (CPython on WASM).

## Golden rule

Same as the repo: minimal, simple, readable; as few changes as possible. The codebase
is small and heavily commented — match that style. Read a file before changing it.

## The one thing not to break

The Python is the **single source of truth** and is the same stateless,
deterministic `(script, answers) -> next prompt` replay as the API.

- `engine/worker.ts` pulls the Python straight from `../../social_script` and
  `../../scripts` via `import.meta.glob(..., '?raw')` at build time. **Never** copy,
  fork, or reimplement script logic in TS — fix it in the Python.
- `api.ts` keeps the old `getScripts / getExceptions / postStep` signatures so the UI
  is unaware Pyodide replaced `fetch()`. Keep that boundary; don't leak Pyodide into
  components.
- A step is a fast full replay — stateless. Don't add cross-step state or caching.

## Layout

- `engine/` — `worker.ts` (Pyodide on a Web Worker thread) + `runtime.py` (entry points
  `list_scripts` / `list_exceptions` / `step`, returning JSON strings).
- `screens/` — Home, Runner, Done. `inputs/` — one component per `InputType`
  (Enter / Choice / Scale / YesNo), mirroring the driver's input types.
- `components/`, `hooks/` — camera + recording. CSS Modules per component; tokens in
  `theme.css`.

## Conventions

- TypeScript, function components, hooks. CSS Modules (no global CSS beyond `theme.css`).
- It's a PWA and must work offline: no runtime CDN/network deps; Pyodide is precached
  under `/pyodide/` (copied by `scripts/copy-pyodide.mjs`). Adding a new `InputType` in
  the Python driver means adding a matching input component here.
- Verify with `npm run dev`; ship-check with `npm run build`.
