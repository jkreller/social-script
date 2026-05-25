"""Action verbs for executing social scripts – what the body, mind, and voice do."""

from enum import Enum


def anchor() -> None:
    """Ground the body before moving or speaking."""
    input("[ anchor ]  Feel your feet. Take a breath.  — press Enter when ready ")


def say(phrase) -> None:
    """Deliver a phrase out loud."""
    category = type(phrase).__name__.lower()
    name = phrase.name
    input(f"[ say ]     {category} / {name}  — press Enter when said ")


def wait() -> None:
    """Hold still and let silence do the work."""
    input("[ wait ]    Let it settle.  — press Enter when ready ")


def hold_posture() -> None:
    """Maintain current physical stance without movement."""
    input("[ hold ]    Don't move. Wait for their response.  — press Enter when they've reacted ")


def exit_gracefully() -> None:
    """Close the interaction with composure."""
    print("[ exit ]    Leave with composure. You're done.")


def assess(signal) -> int:
    """Read an inner signal and return an intensity level from 1 (barely present) to 10 (overwhelming)."""
    name = signal.name if isinstance(signal, Enum) else str(signal)
    while True:
        raw = input(f"[ assess ]  {name} level (1–10): ")
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)
