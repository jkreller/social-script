"""Playful, collective moves — the app runs the room, deals the cards, gets passed around."""

import random
from social_script._internal.driver import io_read, InputType


def hand_over() -> None:
    io_read("Pass me on.", headline="pass", input_type=InputType.enter)


def count_people(prompt: str = "How many of you are playing?") -> int:
    while True:
        raw = io_read(prompt, headline="count", input_type=InputType.scale).strip()
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def pick_from(deck: list) -> str:
    """Pick one item off the deck at random — the app picks, not you."""
    return random.choice(deck)


def poll(question: str, *, returns: InputType = InputType.scale):
    """Put one question to the whole group and record a single shared answer."""
    raw = io_read(question, headline="poll", input_type=returns).strip()
    if returns == InputType.yn:
        return raw.lower() == "y"
    return raw


class Element:
    # one ingredient of the story — its label and the question that decides it
    def __init__(self, label: str, question: str):
        self.label = label
        self.question = question


class Story:
    CHARACTER_COUNT = Element("characters", "How many characters should the story have?")
    WHO             = Element("character", "Who is in the story?")
    WHERE           = Element("place", "Where does the story take place?")
    WHEN            = Element("time", "When does it happen?")
    GENRE           = Element("genre", "What genre is it?")
    OBJECT          = Element("object", "Which object must appear in the story?")

    def __init__(self):
        self.ingredients = []
        self.not_yet_used = []
        self.parts = []
        self.is_complete = False

    def set(self, element, answer, number=None) -> None:
        label = f"{element.label} {number}" if number is not None else element.label
        line = f"{label}: {answer}"
        self.ingredients.append(line)
        if element is not Story.CHARACTER_COUNT:
            self.not_yet_used.append(line)

    def use(self, ingredient: str) -> None:
        if ingredient in self.not_yet_used:
            self.not_yet_used.remove(ingredient)

    def recap(self) -> str:
        return "\n".join(self.ingredients)

    def text(self) -> str:
        return "\n".join(self.parts)
