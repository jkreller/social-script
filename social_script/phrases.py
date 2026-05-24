"""Phrase library – named constants for spoken language, accessed as category.name."""

from enum import Enum, auto


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


greeting = Greeting
exit = Exit
hold = Hold
response = Response
boundary = Boundary
