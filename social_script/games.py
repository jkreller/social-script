"""The games a group can pick between – named choices, like inner states."""

from enum import Enum


class Game(Enum):
    story_telling = "Tell a story together"
    truth_or_lie  = "Truth or lie"

    def __str__(self) -> str:
        return self.value


story_telling = Game.story_telling
truth_or_lie = Game.truth_or_lie
