"""Playful, collective moves — the app runs the room, deals the cards, gets passed around."""

import random
from social_script._internal.driver import io_read, InputType
from social_script._internal.i18n import _
from social_script.actions import do, say
from social_script.phrases import goodbye


def hand_over() -> None:
    io_read(_("Pass me on."), headline=_("pass"), input_type=InputType.enter)


def center_device() -> None:
    """Put the device down where everyone in the group can see it."""
    do("Put me in the middle, so everyone can see.")


def pass_device(group, anyone=False) -> None:
    """Hand the device to the group's next person, or to whoever feels like it."""
    if anyone:
        do("Pass me to whoever feels like it.")
        return

    group.next_person()
    person = group.current_person
    if person.name:
        if person.role:
            do("Pass me to {person},\nthe {role}", person=person, role=person.role)
        else:
            do("Pass me to {person}.", person=person)
    else:
        do("Pass me to the next person.")


def count_people(prompt: str = "How many of you are playing?") -> int:
    while True:
        raw = io_read(_(prompt), headline=_("count"), input_type=InputType.scale).strip()
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def pick_from(deck: list) -> str:
    """Pick one item off the deck at random — the app picks, not you."""
    return random.choice(deck)


def poll(question: str, *, returns: InputType = InputType.scale):
    """Put one question to the whole group and record a single shared answer."""
    raw = io_read(_(question), headline=_("poll"), input_type=returns).strip()
    if returns == InputType.yn:
        return raw.lower() == "y"
    return raw


def gather_feedback() -> None:
    """Poll the group on how the game went."""
    poll("How happy are you with the outcome?")
    poll("How much fun did you have?")
    again = poll("Would you like to play again some other time?", returns=InputType.yn)

    if again:
        say("Great — thank you!")
    else:
        say(goodbye)


class Element:
    # one ingredient of the story — its label, the question that decides it, and an
    # icon key the frontend maps to a picture (meaningless to the CLI)
    def __init__(self, label: str, question: str, icon: str):
        self.label = label
        self.question = question
        self.icon = icon


class Story:
    CHARACTER_COUNT = Element("character count", "How many main characters should the story have?", "characters")
    WHO             = Element("character", "Who is main character number {number}?", "character")
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
            options = options + [_("{name}, the {role}", name=member.name, role=_(member.role))]
        return options

    def set(self, element, answer, number=None) -> None:
        label = f"{_(element.label)} {number}" if number is not None else _(element.label)
        self.ingredients.append({"icon": element.icon, "label": label, "value": _(str(answer))})
        if element is not Story.CHARACTER_COUNT:
            self.not_yet_used.append(f"{label}: {_(str(answer))}")

    def use(self, ingredient: str) -> None:
        if ingredient in self.not_yet_used:
            self.not_yet_used.remove(ingredient)

    def recap(self) -> list:
        return self.ingredients

    def text(self) -> str:
        return "\n".join(self.parts)

    @property
    def might_be_done(self) -> bool:  # worth checking if the story feels finished
        return not self.not_yet_used or len(self.parts) >= 5
