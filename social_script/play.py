"""Playful, collective moves — the app runs the room, deals the cards, gets passed around."""

import random
from social_script._internal.driver import io_read, InputType


def hand_over() -> None:
    io_read("Pass me on.", headline="pass", input_type=InputType.enter)


def count_people() -> int:
    while True:
        raw = io_read("How many of you are playing?", headline="count", input_type=InputType.scale).strip()
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def pick_from(deck: list) -> str:
    """Pick one item off the deck at random — the app picks, not you."""
    return random.choice(deck)
