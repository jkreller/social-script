"""Playful, collective moves — the app runs the room, deals the cards, gets passed around."""

import random
from social_script._internal.driver import io_read, InputType


def play_along() -> None:
    """Hand the wheel to the app — you're not deciding, you're playing."""
    io_read("For a few minutes: do what I say. Don't think, just play. (Quit anytime.)",
            headline="play", input_type=InputType.enter)


def hand_over() -> None:
    """Pass the phone to the next pair of hands."""
    io_read("Pass me on.", headline="pass", input_type=InputType.enter)


def count_people() -> int:
    """Ask how many people are playing."""
    while True:
        raw = io_read("How many of you are playing?", headline="count", input_type=InputType.scale).strip()
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def deal(deck: list) -> str:
    """Deal one card off the deck — the app picks, not you."""
    return random.choice(deck)
