"""Action verbs for executing social scripts – what the body, mind, and voice do."""

import random
from enum import Enum
from social_script._internal.driver import io_read, io_write, InputType
from social_script.phrases import Phrase


def anchor() -> None:
    """Ground the body before moving or speaking."""
    io_read("Feel your feet. Take a breath.", headline="anchor", input_type=InputType.enter)


def breath_in_out(cycles: int = 1) -> None:
    """Guide through a number of slow breath cycles."""
    middle_cues = ["Another time:", "One more time:", "Again:"]
    for i in range(cycles):
        if i == 0:
            cue = ""
        elif i == cycles - 1:
            cue = "One last time: "
        else:
            cue = random.choice(middle_cues) + " "
        io_read(f"{cue}Breathe in... and out.", headline="breathe", input_type=InputType.enter)


def say(p) -> None:
    """Deliver a phrase out loud."""
    label = str(p) if isinstance(p, Phrase) and p.instruction else f"Say: '{p}'"
    io_read(label, headline="say", input_type=InputType.enter)


def wait() -> None:
    """Hold still and let silence do the work."""
    io_read("Let it settle.", headline="wait", input_type=InputType.enter)


def hold_posture():
    """Maintain current physical stance and wait for their response."""
    io_read("Don't move. Wait for their response.", headline="hold", input_type=InputType.enter)
    return True


def exit_gracefully() -> None:
    """Close the interaction with composure."""
    io_write("[ exit ]    Leave with composure. You're done.")


def assess_internal(signal) -> int:
    """Read an inner signal and return an intensity level from 1 (barely present) to 10 (overwhelming)."""
    while True:
        raw = io_read(signal.question(), headline="assess", input_type=InputType.scale)
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def assess_external(entity, signal) -> int:
    """Read a signal about an external person or group, from 1 (barely present) to 10 (very strong)."""
    while True:
        raw = io_read(signal.question(entity), headline="assess", input_type=InputType.scale)
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def sit_down() -> None:
    """Find a spot and settle into the space."""
    io_read("Find a spot and settle in.", headline="sit", input_type=InputType.enter)


def observe_environment() -> None:
    """Openly take in the surroundings – who is here, what is happening."""
    io_read("Look around. Take it all in.", headline="observe", input_type=InputType.enter)


def find_group_of_people():
    """Scan the room and identify a potential group to approach."""
    from social_script.environment import Group
    io_read("Scan the room for any group.", headline="find", input_type=InputType.enter)
    return Group()


def interested_in(thing) -> bool:
    """Check whether you feel genuinely interested in this person or group."""
    entity_name = type(thing).__name__.lower()
    raw = io_read(f"Are you interested in this {entity_name}?", headline="interest", input_type=InputType.yn).strip().lower()
    return raw == "y"


def reduce_distance_to(entity) -> None:
    """Move physically closer to a person or group."""
    entity_name = type(entity).__name__.lower()
    io_read(f"Move closer to the {entity_name}, naturally.", headline="move", input_type=InputType.enter)


def show_interest_and_wait():
    """Signal interest nonverbally – eye contact, a smile – and wait for a response."""
    io_read("Make eye contact. Smile if it fits. Wait.", headline="signal", input_type=InputType.enter)
    raw = io_read("Did they react?", headline="signal", input_type=InputType.yn).strip().lower()
    return raw == "y" or None


def willing_to_continue() -> bool:
    """Ask whether the human wants to keep trying."""
    raw = io_read("Do you want to keep trying?", headline="try", input_type=InputType.yn).strip().lower()
    return raw == "y"


def flow() -> None:
    """Follow the natural current of the conversation without forcing it."""
    io_read("Go with the flow. React, don't perform.", headline="flow", input_type=InputType.enter)


def observe(entity, kind):
    """Observe something specific about a person or group and return what you notice."""
    entity_name = type(entity).__name__.lower()
    choices = [m.name for m in kind] if isinstance(kind, type) and issubclass(kind, Enum) else []
    while True:
        raw = io_read(f"What is the {entity_name} doing?", headline="observe", input_type=InputType.choice, choices=choices).strip()
        if raw.isdigit() and 1 <= int(raw) <= len(choices):
            return list(kind)[int(raw) - 1]


def choose(options: list) -> str:
    """Pick one from a list of options by reading the situation."""
    while True:
        raw = io_read("Pick one (number):", headline="choose", input_type=InputType.choice, choices=options).strip()
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1]
