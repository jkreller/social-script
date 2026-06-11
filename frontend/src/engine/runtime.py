# Pyodide entry-point adapter — the browser-side counterpart of api/main.py.
# Loaded once at worker startup (worker.ts reads this file via ?raw and calls
# py.runPython). The three functions it defines are called by name from JS.
import re, runpy, json, os, glob
from social_script._internal.driver import set_driver, clear_driver, ReplayDriver, NeedInput
from social_script.exceptions import AnyException, INTERRUPT_MENU

# Build a lookup so serialised exception strings like "FearTooHigh(note)"
# can be converted back into live exception instances during replay.
_EXC = {c.__name__: c for c in INTERRUPT_MENU}
_PAT = re.compile(r'^(\w+)\((.*)\)$')

def _replay(a):
    # Plain answers pass through as strings; exception strings become instances.
    m = _PAT.match(a)
    return _EXC[m.group(1)](m.group(2)) if m and m.group(1) in _EXC else a

def list_scripts():
    return json.dumps(sorted(os.path.splitext(os.path.basename(p))[0] for p in glob.glob('scripts/*.py')))

def list_exceptions():
    return json.dumps([{"name": c.__name__, "label": c.label} for c in INTERRUPT_MENU])

def step(script, answers_json):
    # Replay the script with all answers so far; stop at the next unanswered prompt.
    driver = ReplayDriver([_replay(a) for a in json.loads(answers_json)])
    set_driver(driver)
    try:
        runpy.run_path('scripts/%s.py' % script, run_name='__main__')
        return json.dumps({"done": True})
    except NeedInput:
        return json.dumps({"prompt": driver.next_prompt, "done": False})
    except AnyException as e:
        return json.dumps({"done": False, "exception": {"name": type(e).__name__, "label": type(e).label, "note": e.note or ""}})
    except Exception as e:
        return json.dumps({"done": True, "error": str(e)})
    finally:
        clear_driver()
