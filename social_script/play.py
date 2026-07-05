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
    # one ingredient of the story — its label, the question that decides it, and an
    # icon key the frontend maps to a picture (meaningless to the CLI)
    def __init__(self, label: str, question: str, icon: str):
        self.label = label
        self.question = question
        self.icon = icon


class Story:
    CHARACTER_COUNT = Element("character count", "How many main characters should the story have?", "characters")
    WHO             = Element("character", "Who is a main character?", "character")
    WHERE           = Element("place", "Where does the story take place?", "place")
    WHEN            = Element("time", "When does it happen?", "time")
    GENRE           = Element("genre", "What genre is it?", "genre")
    OBJECT          = Element("object", "Which object must appear in the story?", "object")

    def __init__(self):
        self.ingredients = []
        self.not_yet_used = []
        self.parts = []
        self.is_complete = False

    @staticmethod
    def options_for(element, options: list, group=None) -> list:
        # offer a random group member as a WHO option, on top of the preset ones
        if element is Story.WHO and group is not None:
            member = group.random_person()
            options = options + [f"{member.name}, the {member.role}"]
        return options

    def set(self, element, answer, number=None) -> None:
        label = f"{element.label} {number}" if number is not None else element.label
        self.ingredients.append({"icon": element.icon, "label": label, "value": str(answer)})
        if element is not Story.CHARACTER_COUNT:
            self.not_yet_used.append(f"{label}: {answer}")

    def use(self, ingredient: str) -> None:
        if ingredient in self.not_yet_used:
            self.not_yet_used.remove(ingredient)

    def recap(self) -> list:
        return self.ingredients

    def text(self) -> str:
        return "\n".join(self.parts)
