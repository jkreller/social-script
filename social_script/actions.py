"""Action verbs for executing social scripts – what the body, mind, and voice do."""

from enum import Enum


def anchor() -> None:
    """Ground the body before moving or speaking."""
    input("[ anchor ]  Feel your feet. Take a breath.  — press Enter when ready ")


def say(p) -> None:
    """Deliver a phrase out loud."""
    input(f"[ say ]     {p}  — press Enter when said ")


def wait() -> None:
    """Hold still and let silence do the work."""
    input("[ wait ]    Let it settle.  — press Enter when ready ")


def hold_posture():
    """Maintain current physical stance and wait for their response."""
    input("[ hold ]    Don't move. Wait for their response.  — press Enter when they've reacted ")
    return True


def exit_gracefully() -> None:
    """Close the interaction with composure."""
    print("[ exit ]    Leave with composure. You're done.")


def assess_internal(signal) -> int:
    """Read an inner signal and return an intensity level from 1 (barely present) to 10 (overwhelming)."""
    while True:
        raw = input(f"[ assess ]  {signal.question()}  (1–10): ")
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def assess_external(entity, signal) -> int:
    """Read a signal about an external person or group, from 1 (barely present) to 10 (very strong)."""
    while True:
        raw = input(f"[ assess ]  {signal.question(entity)}  (1–10): ")
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def sit_down() -> None:
    """Find a spot and settle into the space."""
    input("[ sit ]     Find a spot and settle in.  — press Enter when seated ")


def observe_environment() -> None:
    """Openly take in the surroundings – who is here, what is happening."""
    input("[ observe ] Look around. Take it all in.  — press Enter when done ")


def find_group_of_people():
    """Scan the room and identify a potential group to approach."""
    from social_script.environment import Group
    input("[ find ]    Scan the room for any group.  — press Enter when you've spotted any ")
    return Group()


def interested_in(thing) -> bool:
    """Check whether you feel genuinely interested in this person or group."""
    entity_name = type(thing).__name__.lower()
    raw = input(f"[ interest ] Are you interested in this {entity_name}? (y/n) ").strip().lower()
    return raw == "y"


def reduce_distance_to(entity) -> None:
    """Move physically closer to a person or group."""
    entity_name = type(entity).__name__.lower()
    input(f"[ move ]    Move closer to the {entity_name}, naturally.  — press Enter when you're near ")


def show_interest_and_wait():
    """Signal interest nonverbally – eye contact, a smile – and wait for a response."""
    input("[ signal ]  Make eye contact. Smile if it fits. Wait.  — press Enter when done ")
    raw = input("[ signal ]  Did they react? (y/n) ").strip().lower()
    return raw == "y" or None


def willing_to_continue() -> bool:
    """Ask whether the human wants to keep trying."""
    raw = input("[ try ]     Do you want to keep trying? (y/n) ").strip().lower()
    return raw == "y"


def flow() -> None:
    """Follow the natural current of the conversation without forcing it."""
    input("[ flow ]    Go with the flow. React, don't perform.  — press Enter when ready ")


def observe(entity, kind):
    """Observe something specific about a person or group and return what you notice."""
    entity_name = type(entity).__name__.lower()
    options = [m.name for m in kind] if isinstance(kind, type) and issubclass(kind, Enum) else []
    prompt = f"[ observe ] What is the {entity_name} doing? ({', '.join(options)}) "
    while True:
        raw = input(prompt).strip().lower()
        if isinstance(kind, type) and issubclass(kind, Enum):
            for member in kind:
                if member.name == raw:
                    return member


def choose(options: list) -> str:
    """Pick one from a list of options by reading the situation."""
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    while True:
        raw = input("[ choose ]  Pick one (number): ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1]
