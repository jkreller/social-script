# Social Script

A Python framework for writing human-executable social scripts.  
Scripts are written in Python, run by a person – not a machine.

---

## What this is

Social Script is a behavioral language disguised as Python.  
You write scripts that describe how to navigate difficult social situations –  
step by step, with real control flow, but executed by a human body and mind.

---

## Project Structure

```
social_script/          # core package — import with `from social_script import *`
├── __init__.py         # single import entry point
├── actions.py          # action verbs: anchor(), say(), observe(), choose(), …
├── phrases.py          # phrase library: greeting.neutral, exit.soft, …
├── states.py           # inner states: fear, calm, tension, …
├── environment.py      # environment types: Person, Group, Distance, …
├── external_actions.py # activity() and Activity enum
├── exceptions.py       # FearTooHigh, TensionTooHigh, HesitationTooHigh
└── _internal/
    └── driver.py       # I/O abstraction (CLIDriver / ReplayDriver)

scripts/                # the actual scripts — run these, not the package
└── connect_group.py

api/                    # stateless FastAPI server for running scripts over HTTP
├── main.py
├── requirements.txt
└── README.md           # API docs

sketches/               # rough drafts and planning notes
run.py                  # convenience entry point for running scripts from the CLI
```

---

## Running a script

```bash
python run.py connect_group.py
```

---

## Running the API server

```bash
pip install -r api/requirements.txt
python -m uvicorn api.main:app --reload
```

See [`api/README.md`](api/README.md) for endpoint docs.

---

## Code Aesthetics

These rules define what Social Script code looks and feels like.  
Follow them strictly – consistency is the whole point.

### 1. Scripts are readable first, executable second

A script must be understandable by a human reading it cold – before, during, or after a situation.  
If someone can't follow the flow by reading it top to bottom, it's too complex.

Running the script interactively is valid and supported.  
But the code itself is the source of truth – not the terminal output.

### 2. One import

Every script starts with exactly one line:

```python
from social_script import *
```

Nothing else. No sub-imports. No configuration.

### 3. Functions read as actions

Built-in functions are verbs. They describe what the body or mind does.  
They never expose implementation details.

```python
# correct
anchor()
say(greeting.neutral)
exit_gracefully()

# wrong
reset_body_state()
phrase_library.get("greeting.neutral")
stdlib.anchor()
```

### 4. Phrases are constants, not strings

Phrases are accessed as attributes, never as string keys.

```python
# correct
say(greeting.neutral)
say(exit.soft)

# wrong
say("greeting.neutral")
say(phrases["greeting"]["neutral"])
```

### 5. State is global and intuitive

There is only one person executing a script.  
Inner state is assessed intuitively, not measured precisely.

```python
# correct
fear_level = assess_internal(fear)
if fear_level > threshold:
    anchor()

# wrong – over-engineered
def run(state: State, ctx: Context, cfg: Config):
    if state.fear_level > cfg.threshold:
```

### 6. Comments are internal monologue

Comments explain intent, not code. Write them as you would think them.

```python
# correct
anchor()  # ground first, then move

# wrong
anchor()  # calls the anchor() function
```

### 7. Silence is valid

`wait()` and `hold_posture()` are real instructions.  
Pauses and stillness are not placeholders – they are actions.

---

## Phrase Library

Phrases are organized as `category.name`:

```python
greeting.neutral
greeting.warm
exit.soft
exit.abort
hold.silence
response.acknowledgment
boundary.soft
```

Access in scripts: `say(greeting.neutral)`

---

## What belongs here / what doesn't

| Belongs in Social Script | Doesn't belong |
|---|---|
| Human actions and pauses | Machine logic or data processing |
| Inner state assessment | Precise measurement or tracking |
| Phrase-based communication | Dynamic text generation |
| Social navigation flow | UI, networking, storage |

---

## Versioning

Scripts are files. Versioning happens through git.  
No internal versioning system. Keep it simple.
