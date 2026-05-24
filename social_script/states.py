"""Inner state signals – what the body and mind can be assessed for."""

from enum import Enum, auto


class State(Enum):
    fear = auto()
    calm = auto()
    tension = auto()
    excitement = auto()
    hesitation = auto()


# expose states as top-level names so scripts read naturally: assess(fear)
fear = State.fear
calm = State.calm
tension = State.tension
excitement = State.excitement
hesitation = State.hesitation
