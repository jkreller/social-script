# Pyodide entry-point adapter — the browser-side counterpart of api/main.py.
# Loaded once at worker startup (worker.ts reads this file via ?raw and calls
# py.runPython). The three functions it defines are called by name from JS.
import runpy, json, os, glob, ast, random
from social_script._internal.driver import set_driver, clear_driver, ReplayDriver, NeedInput
from social_script._internal.i18n import set_locale, _
from social_script.exceptions import AnyException, INTERRUPT_MENU, parse_answer

def _read_meta(src):
    # version + tags live in the script's module docstring, as labeled lines. Read via
    # ast so the script is parsed, never executed (executing would trigger the prompts).
    doc = ast.get_docstring(ast.parse(src)) or ""
    version, tags = "", []
    for line in doc.splitlines():
        key, _, val = line.strip().partition(":")
        if key.lower() == "version":
            version = val.strip()
        elif key.lower() == "tags":
            tags = [t.strip() for t in val.split(",") if t.strip()]
    return version, tags

def list_scripts(locale='en'):
    set_locale(locale)
    items = []
    for p in sorted(glob.glob('scripts/*.py')):
        with open(p) as f:
            version, tags = _read_meta(f.read())
        items.append({"name": os.path.splitext(os.path.basename(p))[0], "version": version, "tags": tags})
    return json.dumps(items)

def list_exceptions(locale='en'):
    set_locale(locale)
    return json.dumps([{"name": c.__name__, "label": _(c.label)} for c in INTERRUPT_MENU])

def step(script, answers_json, seed_str='', locale='en'):
    # Replay the script with all answers so far; stop at the next unanswered prompt.
    set_locale(locale)
    if seed_str:
        random.seed(int(seed_str))
    driver = ReplayDriver([parse_answer(a) for a in json.loads(answers_json)])
    set_driver(driver)
    try:
        runpy.run_path('scripts/%s.py' % script, run_name='__main__')
        return json.dumps({"done": True})
    except NeedInput:
        return json.dumps({"prompt": driver.next_prompt, "done": False})
    except AnyException as e:
        return json.dumps({"done": False, "exception": {"name": type(e).__name__, "label": _(type(e).label), "note": e.note or ""}})
    except Exception as e:
        return json.dumps({"done": True, "error": str(e)})
    finally:
        clear_driver()
