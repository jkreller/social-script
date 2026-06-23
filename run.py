import sys
import json
import random
import runpy
from pathlib import Path

root = Path(__file__).parent
sys.path.insert(0, str(root))

from social_script.exceptions import AnyException, parse_answer
from social_script._internal.driver import (
    CLIDriver, ReplayDriver, NeedInput, InputType, set_driver, clear_driver, handle_exception
)

script = root / "scripts" / sys.argv[1]
answers = []

if len(sys.argv) > 2:
    answers = [parse_answer(a) for a in json.loads(sys.argv[2])]

if len(sys.argv) > 3:
    seed = int(sys.argv[3])
else:
    seed = random.randint(0, 0xFFFFFFFF)
    print(f"seed: {seed}")

while True:
    driver = ReplayDriver(answers)
    set_driver(driver)
    random.seed(seed)

    try:
        runpy.run_path(str(script), run_name="__main__")
        break
    except NeedInput:
        prompt = driver.next_prompt
    except AnyException as e:
        idx = driver.injected_exception_index
        if idx is not None and idx < len(answers) and answers[idx] is e:
            answers.pop(idx)
        handle_exception(e, final=False)
        continue
    finally:
        clear_driver()

    cli = CLIDriver()
    try:
        answer = cli.input(
            prompt["text"],
            headline=prompt["headline"],
            input_type=InputType(prompt["input_type"]),
            choices=prompt["choices"],
        )
        answers.append(answer)
    except AnyException as e:
        answers.append(e)
