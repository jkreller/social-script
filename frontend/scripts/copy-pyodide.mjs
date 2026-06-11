// Copy the Pyodide runtime (no wheels) into public/ so it ships as a static,
// service-worker-precacheable asset. Runs before `dev` and `build`.
import { cpSync, mkdirSync, rmSync } from 'node:fs'

const SRC = 'node_modules/pyodide'
const DST = 'public/pyodide'
const FILES = ['pyodide.asm.wasm', 'pyodide.asm.mjs', 'python_stdlib.zip', 'pyodide-lock.json']

rmSync(DST, { recursive: true, force: true })
mkdirSync(DST, { recursive: true })
for (const f of FILES) cpSync(`${SRC}/${f}`, `${DST}/${f}`)
console.log(`copied ${FILES.length} pyodide files → ${DST}`)
