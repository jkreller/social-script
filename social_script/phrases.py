"""Phrase library – named constants for spoken language, accessed as category.name."""

from enum import Enum, auto
from social_script._internal.i18n import _


# Opening moves
class Greeting(Enum):
    neutral = auto()
    warm = auto()


# Closing moves
class Exit(Enum):
    soft = auto()
    abort = auto()


# Stillness and suspension
class Hold(Enum):
    silence = auto()


# Receiving what the other person said
class Response(Enum):
    acknowledgment = auto()


# Limit-setting
class Boundary(Enum):
    soft = auto()

class Phrase:
    """A spoken phrase. content is the exact text; instruction tells the human what to say when content is empty."""

    def __init__(self, content: str = "", instruction: str = ""):
        self.content = content
        self.instruction = instruction

    def __str__(self) -> str:
        if self.instruction and self.content:
            return f"{_(self.instruction)}: {self.content}"
        return self.content or _(self.instruction) or _("Say any phrase that you have in mind.")


greeting = Greeting
phrase = Phrase
question = Phrase
exit = Exit
hold = Hold
response = Response
boundary = Boundary
goodbye = Phrase(instruction="Say your goodbyes")