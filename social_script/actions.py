"""Action verbs for executing social scripts – what the body, mind, and voice do."""

from typing import Any


def anchor() -> None:
    """Ground the body before moving or speaking."""
    pass  # TODO: implement


def say(phrase: str) -> None:
    """Deliver a phrase out loud."""
    pass  # TODO: implement


def wait() -> None:
    """Hold still and let silence do the work."""
    pass  # TODO: implement


def hold_posture() -> None:
    """Maintain current physical stance without movement."""
    pass  # TODO: implement


def exit_gracefully() -> None:
    """Close the interaction with composure."""
    pass  # TODO: implement


def assess(signal: Any) -> int:
    """Read an inner signal and return an intensity level from 1 (barely present) to 10 (overwhelming)."""
    pass  # TODO: implement – must return int in range 1..10