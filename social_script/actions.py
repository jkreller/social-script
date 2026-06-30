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


def say(p, *, headline="say") -> None:
    """Deliver a phrase out loud. Pass a phrase, or a plain string for a free-form line."""
    if isinstance(p, str):
        p = Phrase(instruction=p)
    label = str(p) if isinstance(p, Phrase) and p.instruction else f"Say: '{p}'"
    io_read(label, headline=headline, input_type=InputType.enter)


def do(action) -> None:
    """Carry out a physical action."""
    io_read(action, headline="action", input_type=InputType.enter)


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


def assess_internal(signal):
    """Read an inner signal: a gut yes/no for binary states, else an intensity 1–10."""
    return _assess(signal.question(), signal.input_type)


def assess_external(entity, signal):
    """Read a signal about an external person or group: yes/no for binary states, else 1–10."""
    return _assess(signal.question(entity), signal.input_type)


def _assess(question, input_type):
    if input_type == InputType.yn:
        return io_read(question, headline="assess", input_type=InputType.yn).strip().lower() == "y"
    while True:
        raw = io_read(question, headline="assess", input_type=InputType.scale)
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def walk() -> None:
    """Keep moving through the space, unhurried, letting it pass by."""
    io_read("Keep walking. No destination, go as you feel.", headline="walk", input_type=InputType.enter)


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


def find_person():
    """Scan the room and identify a single person to approach."""
    from social_script.environment import Person
    io_read("Scan the room for someone interesting.", headline="find", input_type=InputType.enter)
    return Person()


def explain() -> bool:
    """Explain the art-project context and capture consent."""
    io_read(
        "Explain: you're doing an art project, you're being programmed and it's being filmed.",
        headline="explain",
        input_type=InputType.enter,
    )
    return sense("Are they still okay with it?", headline="ask")


def interested_in(thing) -> bool:
    """Check whether you feel genuinely interested in this person or group."""
    entity_name = type(thing).__name__.lower()
    return sense(f"Are you interested in this {entity_name}?", headline="interest")


def reduce_distance_to(entity) -> None:
    """Move physically closer to a person or group."""
    entity_name = type(entity).__name__.lower()
    io_read(f"Move closer to the {entity_name}, naturally.", headline="move", input_type=InputType.enter)


def show_interest_and_wait():
    """Signal interest nonverbally – eye contact, a smile – and wait for a response."""
    io_read("Make eye contact. Smile if it fits. Wait.", headline="signal", input_type=InputType.enter)
    return sense("Did they react?", headline="signal") or None


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


def choose(options, prompt: str = "Pick one"):
    """Pick one option by reading the situation. Pass a list of strings, or an Enum."""
    members = list(options) if isinstance(options, type) and issubclass(options, Enum) else options
    while True:
        raw = io_read(f"{prompt}:", headline="choose", input_type=InputType.choice, choices=[str(m) for m in members]).strip()
        if raw.isdigit() and 1 <= int(raw) <= len(members):
            return members[int(raw) - 1]


def sense(prompt: str, *, headline: str = "sense") -> bool:
    """Ask yourself an honest yes/no question and answer from the gut."""
    raw = io_read(prompt, headline=headline, input_type=InputType.yn).strip().lower()
    return raw == "y"


def get_to_know(person) -> None:
    person.name = io_read("Ask how they want to be called?", headline="get to know", input_type=InputType.text) or "them"


def ask(person, about, *, returns: InputType = InputType.enter):
    """Pose a question to someone — fill in what they've already told you."""
    raw = io_read(
        f"{about.format(name=person, first=person.first_thing, last=person.last_thing)}",
        headline=f"ask {person}",
        input_type=returns,
    )
    if returns == InputType.yn:
        return raw.strip().lower() == "y"
    return raw


def listen_to(person) -> str:
    """Catch one thing they just said and keep it on the person."""
    thing = io_read(f"What did {person} say?\nIn 2-3 words.", headline="listen", input_type=InputType.text) or "that"
    person.mentioned.append(thing)
    return thing


def tell(person, what) -> None:
    """Say something to them, in your own words."""
    say(f"Tell {person}: {what}", headline="tell")


def assess_vibe(signal):
    """Assess a signal for the whole situation — everyone included."""
    from social_script.environment import everyone
    return assess_external(everyone, signal)
