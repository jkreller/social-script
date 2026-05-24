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
social_script/
├── __init__.py         # single import entry point
├── stdlib.py           # built-in functions: anchor(), say(), wait(), ...
├── phrases.py          # phrase library: greeting.neutral, exit.soft, ...
└── scripts/            # your scripts go here
    └── example.py
```

---

## Code Aesthetics

These rules define what Social Script code looks and feels like.  
Follow them strictly – consistency is the whole point.

### 1. One import

Every script starts with exactly one line:

```python
from social_script import *
```

Nothing else. No sub-imports. No configuration.

### 2. Functions read as actions

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

### 3. Phrases are constants, not strings

Phrases are accessed as attributes, never as string keys.

```python
# correct
say(greeting.neutral)
say(exit.soft)

# wrong
say("greeting.neutral")
say(phrases["greeting"]["neutral"])
```

### 4. State is global and intuitive

There is only one person executing a script.  
Inner state is assessed intuitively, not measured precisely.

```python
# correct
fear_level = assess(fear)
if fear_level > threshold:
    anchor()

# wrong – over-engineered
def run(state: State, ctx: Context, cfg: Config):
    if state.fear_level > cfg.threshold:
```

### 5. Comments are internal monologue

Comments explain intent, not code. Write them as you would think them.

```python
# correct
anchor()  # ground first, then move

# wrong
anchor()  # calls the anchor() function
```

### 6. Silence is valid

`wait()` and `hold_posture()` (or similar actions) are real instructions.  
Pauses and stillness are not placeholders – they are actions.

---

## Phrase Library

Phrases are organized as `category.name`:

```python
phrases:
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