import re
import sys
import runpy
from pathlib import Path

# Make social_script importable when running from within api/ or from repo root.
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from social_script._internal.driver import set_driver, clear_driver, ReplayDriver, NeedInput
from social_script.exceptions import AnyException, INTERRUPT_MENU

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"

_EXC_BY_NAME = {cls.__name__: cls for cls in INTERRUPT_MENU}
_EXC_PATTERN = re.compile(r'^(\w+)\((.*)\)$')


def _to_replay_answer(a: str):
    m = _EXC_PATTERN.match(a)
    if m and m.group(1) in _EXC_BY_NAME:
        return _EXC_BY_NAME[m.group(1)](m.group(2))
    return a


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StepRequest(BaseModel):
    script: str
    answers: list[str] = []


class PromptInfo(BaseModel):
    headline: Optional[str]
    text: str
    input_type: str
    choices: Optional[list[str]]


class ExceptionInfo(BaseModel):
    name: str
    label: str
    note: str = ""


class StepResponse(BaseModel):
    prompt: Optional[PromptInfo] = None
    done: bool = False
    error: Optional[str] = None
    exception: Optional[ExceptionInfo] = None


@app.get("/")
def root():
    return {}


@app.get("/scripts")
def list_scripts():
    return [p.stem for p in sorted(SCRIPTS_DIR.glob("*.py"))]


@app.get("/exceptions")
def list_exceptions():
    return [{"name": cls.__name__, "label": cls.label} for cls in INTERRUPT_MENU]


@app.post("/step", response_model=StepResponse)
def step(body: StepRequest):
    available = {p.stem: p for p in SCRIPTS_DIR.glob("*.py")}
    if body.script not in available:
        raise HTTPException(status_code=404, detail=f"Script '{body.script}' not found")

    script_path = available[body.script]
    replay_answers = [_to_replay_answer(a) for a in body.answers]
    driver = ReplayDriver(replay_answers)
    set_driver(driver)

    try:
        runpy.run_path(str(script_path), run_name="__main__")
        return StepResponse(done=True)
    except NeedInput:
        return StepResponse(prompt=PromptInfo(**driver.next_prompt), done=False)
    except AnyException as e:
        return StepResponse(
            done=False,
            exception=ExceptionInfo(name=type(e).__name__, label=type(e).label, note=e.note or ""),
        )
    except Exception as e:
        return StepResponse(done=True, error=str(e))
    finally:
        clear_driver()
