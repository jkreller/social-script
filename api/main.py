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

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"

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


class StepResponse(BaseModel):
    prompt: Optional[PromptInfo]
    done: bool
    error: Optional[str] = None


@app.get("/")
def root():
    return {}


@app.get("/scripts")
def list_scripts():
    return [p.stem for p in sorted(SCRIPTS_DIR.glob("*.py"))]


@app.post("/step", response_model=StepResponse)
def step(body: StepRequest):
    available = {p.stem: p for p in SCRIPTS_DIR.glob("*.py")}
    if body.script not in available:
        raise HTTPException(status_code=404, detail=f"Script '{body.script}' not found")

    script_path = available[body.script]

    driver = ReplayDriver(body.answers)
    set_driver(driver)

    prompt = None
    done = False
    error = None

    try:
        runpy.run_path(str(script_path), run_name="__main__")
        done = True
    except NeedInput:
        prompt = PromptInfo(**driver.next_prompt) if driver.next_prompt else None
    except Exception as e:
        error = str(e)
        done = True
    finally:
        clear_driver()

    return StepResponse(
        prompt=prompt,
        done=done,
        error=error,
    )
