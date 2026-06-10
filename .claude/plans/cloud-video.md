# Crash-resilient recording + R2 upload

> **First implementation step:** save this document into the repo as
> `docs/recording-upload.md` so the design lives alongside the code. Everything below
> is the spec to implement.

## Context

Today a social-script run records a single in-memory video and only ever lives on the
device — `useRecorder` accumulates one Blob, and the done screen offers a local "Download
Video"/"Download Log". Nothing is durable: a tab crash, app-switch, or network drop loses
everything.

We want each run to stream to Cloudflare R2 (S3-compatible) as it happens, chunk-by-chunk,
so a mid-session disconnect leaves every prior chunk intact. The API mints short-lived
presigned PUT URLs (R2 creds never touch the browser) and is the **only** cost guardrail:
it refuses to issue URLs once the bucket nears the free-tier limit. R2 is the source of
truth — no database.

**Confirmed product decisions:**
- Storage cap hit → keep the social script running, stop only recording/uploads, show a banner.
- Presign abuse hardening = cap + short URL TTL + strict key/content-type validation only (prototype).
- Drop the local "Download Video" path — R2 is the source of truth (retrieved by `executionId`).
- Recording bitrate explicitly capped at ~1 Mbps and lifecycle deletion at ~5 days (see Free-tier fit).
- Chunks are reassembled offline (byte-concat); no automatic server-side finalize for now.

**Storage layout (one prefix per execution):**
```
executions/{executionId}/log.json
executions/{executionId}/chunks/000001.webm
executions/{executionId}/chunks/000002.webm
...
```

> **WebM fragment note:** with `MediaRecorder.start(timeslice)`, only the *first* chunk
> carries the EBML header; later chunks are header-less continuations. Each chunk is a
> *complete, closed R2 object* the moment it lands (that's the crash-resilience win), but
> individual chunks past the first are **not** standalone-playable. Recovery = byte-concat
> the chunks in zero-padded order (`cat 000001 000002 … > out.webm`). We never advertise
> per-chunk playback. Zero-padding guarantees lexical sort = chronological order. There is
> **no automatic stitching** — reassembly is a manual/offline step (a `/finalize` endpoint
> that concatenates server-side is a possible future add, deliberately out of scope here).

---

## How the R2 interaction works (mechanics)

Per ~5s timeslice the browser makes **two** requests to **two** servers:

1. `POST /presign` → **your API (Render)**. Tiny JSON in/out. The API signs a URL locally
   with the R2 secret (this is pure crypto — it does **not** call R2, so presigning costs
   zero R2 operations). Returns a short-lived signed URL.
2. `PUT <signed url>` → **Cloudflare R2 directly**. The chunk bytes go straight to R2 and
   **never pass through the API** (this is why Render bandwidth stays ~0).

Offline → the queue pauses (no requests at all), chunks accumulate in memory, and the batch
flushes on reconnect. Re-presign per attempt so a long offline backoff can't use an expired URL.

---

## Security model (read + write)

- **Secret stays server-side.** R2 credentials live only in Render env. The browser never
  holds them, so no one can forge/presign a URL themselves — a forged signature fails R2's
  HMAC check (`403`).
- **Presign endpoint is public (CORS `*`)** but guarded: key-regex validation, content-type
  whitelist, and the storage cap. Worst-case abuse = ≤8 GB of valid-shaped junk; cannot cost
  money (cap) and cannot corrupt other executions.
- **Read protection (videos are private):**
  - The API only ever signs **`put_object`** → the URLs it hands out are **write-only**; a
    GET against a PUT-signed URL fails. The public presign endpoint grants **no read ability**.
  - The R2 bucket must **stay private** — do NOT enable the `r2.dev` public URL or a public
    custom domain. Then objects are unreadable without the secret key.
  - Bucket CORS `AllowedMethods` = `[PUT]` only (no GET).
  - Limitation: encrypted in transit (HTTPS) + at rest, but **Cloudflare holds the keys** —
    this is not end-to-end encryption. True E2E would need client-side encryption (out of scope).
  - Playback later = a **server-side presigned GET** (API signs with the secret), keeping read
    access gated behind the API. Not built now.

---

## Frontend changes (`frontend/`)

### New: `src/upload/uploadQueue.ts` (framework-agnostic class)
In-memory queue with retry. No IndexedDB, no persistence — in-memory is the accepted tradeoff.
- Items: `{ key, body: Blob|string, contentType }`. `enqueueObject(key, body, contentType, { replace })`.
  `replace: true` collapses by key (used for `log.json` so rapid transitions don't PUT 10×).
- `processOne()`: call `getPresignUrl(key, contentType)` (API), then
  `fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body })`.
  **Re-presign per attempt** (URLs are short-lived; a long offline backoff would expire a once-fetched URL).
- Retry with backoff. Pause when `!navigator.onLine`; resume on the `online` event.
- **Content-type must match exactly** what was signed — sign & send the bare `video/webm`
  (strip `;codecs=…`), else R2 returns a silent 403. Treat a persistent non-limit 403 (e.g.
  CORS/expired/mismatch) as **fatal for that item**, not infinitely retryable.
- On `storage_limit_reached` (typed error from the API): set `limitReached = true`, halt processing.
- Expose observable `status`, `pendingCount`, `failed`, `limitReached`.

### New: `src/upload/keys.ts`
Pure helpers — `chunkKey(executionId, seq, ext)` (6-digit zero-pad) and `logKey(executionId)`.

### New: `src/upload/useUploadQueue.ts` (hook)
Ref-held `UploadQueue` instance (survives StrictMode re-mount). Wire `online`/`offline`
listeners in a `useEffect` **with cleanup** (not the constructor). Expose state via subscription.

### Modify: `src/api.ts`
Add `getPresignUrl(key, contentType)` → `POST /presign`, returns `{ url, expires_in }`.
Map HTTP 403 with `detail: 'storage_limit_reached'` to a typed `StorageLimitError`.

### Modify: `src/hooks/useRecorder.ts`
- `rec.start(5000)` (≈5s timeslice).
- **Set `videoBitsPerSecond ≈ 1_000_000`** (and a modest `audioBitsPerSecond`) on the
  MediaRecorder — caps storage growth (see Free-tier fit); browser default (~2.5–3 Mbps) is too high.
- Add `onChunk?: (blob, seq, ext) => void`. Store it in an `onChunkRef` updated every render;
  `ondataavailable` calls `onChunkRef.current(...)` — **critical**, since `ondataavailable` is
  assigned once and would otherwise capture a stale closure (the #1 silent-bug risk).
- `seq` counter at recorder scope (continuous across `switchCamera`, which never restarts the recorder).
- Derive `ext` once from `rec.mimeType` (`webm`/`mp4`).
- **Drop local accumulation** (`chunks.current`) and the `Recording` return. `stop()` now just
  finalizes the recorder so the final `ondataavailable` fires (enqueuing the last chunk
  synchronously) before `onstop`, then stops tracks. Returns `void`.
- Consider `canvas.captureStream(30)` so frames are pulled at a fixed fps even when the tab is
  backgrounded on mobile (reduces empty/frozen chunks + A/V drift).
- No-camera/no-mic path must no-op cleanly: if `recorder.current` was never created, never call `onChunk`.

### Modify: `src/App.tsx`
- Generate `executionId = crypto.randomUUID()` in `handlePick`; store in state, clear in `reset`.
- `const upload = useUploadQueue()` — instance lives here so chunk uploads *and* log.json
  re-uploads share **one** queue, and the queue survives RunnerScreen unmounting on `done`.
- Stable `onChunk` (`useCallback`) → `upload.enqueueObject(chunkKey(executionId, seq, ext), blob, normalizedType(ext))`.
- `useEffect([log, executionId])` → enqueue `log.json` with `replace: true` (re-uploaded on every
  state transition; the final `finish` entry is included since `setLog`+`setScreen` batch in one tick).
- Remove the `recording` state and `URL.revokeObjectURL` in `reset` (local video gone).
- Pass `executionId`, `onChunk`, and `upload` status/`limitReached` to RunnerScreen and DoneScreen.
- Add a `beforeunload` warning while `upload.pendingCount > 0` (covers the Quit-then-close case).

### Modify: `src/screens/RunnerScreen.tsx`
- Accept `executionId`, `onChunk`, `limitReached`; pass `onChunk` into `useRecorder`.
- `onDone` no longer carries a `Recording` (signature drops to `() => void`).
- When `limitReached` flips true: stop the recorder + show a muted "storage limit reached"
  banner. **The social script keeps running.**

### Modify: `src/screens/DoneScreen.tsx`
- Remove "Download Video" and the `recording` prop.
- Show upload status from queue props: *uploading (n left)* / *uploaded* / *offline — will retry* /
  *storage limit reached*. Surface the `executionId` (only handle to find the run in R2, no DB).
- Guard `onRestart` / warn while uploads are still pending.

### Modify: `src/screens/HomeScreen.tsx` (cold-start mitigation)
- Fire a cheap warm-up ping (`GET /`) when the screen mounts so Render is awake by the time the
  first `/step` runs — avoids the ~50s cold-start stall at script start.

### Modify: `src/types.ts`
Add upload status / `StorageLimitError` types as needed. `LogEntry` union unchanged (serialized verbatim into `log.json`).

---

## API changes (`api/`)

### Modify: `api/requirements.txt`
Add `boto3` and `python-dotenv` (dotenv loaded conditionally — Render injects env directly).

### New: `api/storage.py`
- boto3 S3 client for R2: `endpoint_url=https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  `region_name='auto'`, `signature_version='s3v4'`. Created lazily from env.
- `presign_put(key, content_type, ttl)` → presigned **PUT-only** URL (signs `ContentType`).
- `current_usage_bytes()` → paginated `ListObjectsV2` sum, cached in a module global for
  `R2_USAGE_CACHE_TTL` (~60s). Overshoot ≈ upload-rate × TTL; safe with ~2 GB headroom under
  the 8 GB cap. **Multi-worker caveat:** cache is per-process → pin uvicorn to **1 worker**.

### Modify: `api/main.py`
- Conditional `load_dotenv()` at startup.
- `PresignRequest(key: str, content_type: str)` model.
- `POST /presign`:
  1. Validate `key` against `^executions/[A-Za-z0-9_-]+/(chunks/\d{6}\.(webm|mp4)|log\.json)$`.
  2. Validate `content_type` whitelist (`video/webm`, `video/mp4`, `application/json`).
  3. If `current_usage_bytes() >= R2_MAX_BYTES` → `HTTPException(403, detail="storage_limit_reached")`.
  4. Else return `{ "url": presign_put(...), "expires_in": R2_PRESIGN_TTL }`.

### Env vars (Render)
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
`R2_MAX_BYTES` (default `8589934592` = 8 GB), `R2_PRESIGN_TTL` (default 90s),
`R2_USAGE_CACHE_TTL` (default 60s). Add `api/.env.example`.

---

## Free-tier fit (verified June 2026)

Workload: ~10 executions/day, 2–30 min each (~16 min avg ≈ 300 runs/month).

- **Render** (100 GB bandwidth, 750 instance-hrs/mo): chunks bypass Render → **<1 GB bandwidth**;
  awake ~5–7 hrs/day → **~150–220 hrs/mo**. Within free tier. Caveat: 15-min spin-down → ~50s
  cold start on the first request of an idle period (queue absorbs uploads; warm-up ping covers `/step`).
- **R2 operations** (1M Class A / 10M Class B per mo): presigning costs 0 ops; ~67k PUTs +
  ~5–35k LISTs ≈ **~100k Class A (~10%)**; reads negligible. Within free tier.
- **R2 storage (binding constraint)** (10 GB-month; our 8 GB instantaneous cap): at browser
  default bitrate you'd hit 8 GB in ~2.5 days. Mitigations baked into this plan:
  1. `videoBitsPerSecond ≈ 1 Mbps` → ~1.1 GB/day added.
  2. **Lifecycle auto-delete after ~5 days** → steady-state ~5.5 GB stored, under both the 8 GB
     cap and 10 GB-month. The 8 GB API cap is the backstop that guarantees no paid spillover.

---

## Out-of-repo setup (Cloudflare / Render / Vercel dashboards)

1. **R2 bucket CORS (mandatory):** `AllowedMethods:[PUT]`, `AllowedOrigins:[<vercel-domain>,
   http://localhost:5173]`, `AllowedHeaders:[content-type]`. Without it, the browser PUT fails
   as an opaque error the retry loop would spin on.
2. **Keep the bucket private** — do NOT enable the `r2.dev` public URL or a public custom domain.
3. **R2 API token / access keys** scoped to the one bucket → Render env.
4. **Lifecycle rule:** auto-delete objects after ~5 days (second safety net + keeps storage in tier).
5. **Cloudflare billing alerts** at ~50% and ~80% of the free tier (no native spend cap).
6. **Render:** run uvicorn with `--workers 1` (or budget headroom for per-worker usage cache).

---

## Verification

1. **Local API:** set R2 env in `api/.env`, run `python -m uvicorn api.main:app --reload`.
   `curl -X POST localhost:8000/presign -d '{"key":"executions/test/chunks/000001.webm","content_type":"video/webm"}' -H 'Content-Type: application/json'`
   → returns a URL. `curl -T file <url>` PUTs successfully; the object appears in R2.
2. **Read is blocked:** `curl <same url>` (GET) → 403. `curl https://<bucket-public>/...key` with
   public access disabled → not accessible.
3. **Cap:** set `R2_MAX_BYTES=1`, retry → `403 storage_limit_reached`.
4. **End-to-end (HTTPS or localhost for camera):** run a script with camera on; confirm
   `chunks/000001.webm`, `000002…` appear in R2 ~every 5s and `log.json` updates each transition.
5. **Crash resilience:** kill the network mid-run → uploads pause, `pendingCount` climbs; restore →
   queue drains, no gaps in chunk numbering. Download all chunks, `cat` them in order → plays back.
6. **Switch camera mid-run** → chunk numbering stays continuous, recording uninterrupted.
7. **Cap mid-run:** lower `R2_MAX_BYTES`; confirm recording stops + banner shows, **script keeps running**.
8. `cd frontend && npm run build` passes clean.
