# social-script API

A stateless FastAPI server that runs social scripts step by step over HTTP.
Scripts live in [`../scripts/`](../scripts/) and are the same files you'd run directly from the CLI — no changes needed.

## Install & run

```bash
pip install -r requirements.txt
# from the repo root — use `python -m uvicorn` to ensure pyenv's Python is used, not the system one:
python -m uvicorn api.main:app --reload
```

## Endpoints

### `GET /scripts`
Returns a list of available script names (stems of `.py` files in `scripts/`).

```json
["connect_group"]
```

### `GET /exceptions`
Returns all exception types a user can raise to interrupt a script.

```json
[
  { "name": "FearTooHigh",        "label": "Fear was too high" },
  { "name": "UnexpectedReaction", "label": "Unexpected reaction — felt unsafe or overwhelmed" },
  { "name": "RandomSituation",    "label": "Random unexpected situation" },
  { "name": "SensoryOverload",    "label": "Exhaustion or sensory overload" },
  { "name": "LostInterest",       "label": "Lost interest / not feeling it today" },
  { "name": "ExternalReason",     "label": "Had to leave — external reason" },
  { "name": "AnyException",       "label": "Other" }
]
```

### `POST /step`
Advances a script by one step. The client holds all session state — no server-side storage.

**Request**
```json
{
  "script": "connect_group",
  "answers": ["", "y", "5"]
}
```

| Field | Type | Description |
|---|---|---|
| `script` | string | Script name (from `GET /scripts`) |
| `answers` | string[] | All answers and exceptions so far, oldest first. Send `[]` to start. |

Answers are plain strings. To inject a script exception at a position, use the format `"ExceptionName(optional note)"`, e.g. `"FearTooHigh(was too much)"` or `"FearTooHigh()"`. See [Raising exceptions](#raising-exceptions) below.

**Response**
```json
{
  "prompt": {
    "headline": "assess",
    "text": "How afraid are you?",
    "input_type": "scale",
    "choices": null
  },
  "done": false,
  "error": null,
  "exception": null
}
```

| Field | Type | Description |
|---|---|---|
| `prompt` | object \| null | The next prompt waiting for the user's input. `null` when done or when an exception occurred. |
| `prompt.headline` | string \| null | The action tag (e.g. `"assess"`, `"listen"`, `"signal"`) |
| `prompt.text` | string | The question or instruction to show the user |
| `prompt.input_type` | string | One of `"enter"`, `"yn"`, `"scale"`, `"choice"` |
| `prompt.choices` | string[] \| null | Option labels for `"choice"` type; `null` otherwise |
| `done` | bool | `true` when the script has finished |
| `error` | string \| null | Set if the script raised an unexpected internal error |
| `exception` | object \| null | Set when a user exception propagated out of the script unhandled (see below) |
| `exception.name` | string | Exception class name, e.g. `"FearTooHigh"` |
| `exception.label` | string | Human-readable label, e.g. `"Fear was too high"` |
| `exception.note` | string | The note the user attached, or `""` |

**`input_type` values**

| Value | Expected answer | Suggested UI |
|---|---|---|
| `"enter"` | `""` (empty string) | Continue button |
| `"yn"` | `"y"` or `"n"` | Yes / No toggle |
| `"scale"` | `"1"` – `"10"` | Slider or number input |
| `"choice"` | Index as string (`"1"`, `"2"`, …) — matches the position in `prompt.choices` | Radio list or select |

## How to use from a frontend

1. `GET /scripts` → pick a script name
2. `POST /step` with `answers: []` → receive the first `prompt`
3. Show the prompt to the user; collect their input
4. `POST /step` with `answers: [...previous, newAnswer]` → receive the next prompt
5. Repeat until `done: true`

The `answers` array is the only state — store it client-side. The server is fully stateless, so it works on any free hosting tier (serverless, containers that spin down, multi-instance deployments).

## Raising exceptions

Scripts can handle real-world interruptions (fear, overload, external reasons, …) via typed exceptions. The flow mirrors how the CLI handles `Ctrl+C`:

1. Show the user an "interrupt" option alongside any prompt
2. When triggered, fetch `GET /exceptions` to populate a menu (or cache it on load)
3. User picks an exception type and optionally adds a note
4. Append `"ExceptionName(note)"` to the local `answers` list — e.g. `"FearTooHigh(was too much)"` or `"FearTooHigh()"` for no note
5. `POST /step` with the updated answers

**Two possible outcomes:**

- **Script catches the exception** (e.g. `except FearTooHigh: ...`): the script handles it internally and continues. The response comes back as a normal `{prompt: ...}`. No special handling needed.

- **Script does not catch the exception**: the response has `exception: {...}` and `done: false`. The client should:
  1. Display `exception.label` (and `exception.note` if non-empty) to the user
  2. Remove the exception entry from the local `answers` list
  3. Re-submit `POST /step` with the cleaned answers to continue

## Adding scripts

Drop any `.py` script file into [`../scripts/`](../scripts/). It will appear in `GET /scripts` immediately (no restart needed). Scripts must start with `from social_script import *` and use `io_read()` with `headline=` and `input_type=` kwargs for any direct user input in their own helper functions.
