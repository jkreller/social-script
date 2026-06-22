"""Exceptions – real-world situations that interrupt the normal flow of a script."""


class AnyException(Exception):
    label = "Other"

    def __init__(self, note: str = ""):
        self.note = note


class FearTooHigh(AnyException):
    label = "Fear was too high"


class UnexpectedReaction(AnyException):
    label = "Unexpected reaction — felt unsafe or overwhelmed"


class RandomSituation(AnyException):
    label = "Random unexpected situation"


class SensoryOverload(AnyException):
    label = "Exhaustion or sensory overload"


class LostInterest(AnyException):
    label = "Lost interest / not feeling it today"


class Shame(AnyException):
    label = "Shame — felt embarrassed or judged"


class ExternalReason(AnyException):
    label = "Had to leave — external reason"


INTERRUPT_MENU = [
    FearTooHigh, UnexpectedReaction, RandomSituation,
    SensoryOverload, LostInterest, Shame, ExternalReason, AnyException,
]

import re as _re
_EXC_PAT = _re.compile(r'^(\w+)\((.*)\)$', _re.DOTALL)
_EXC_MAP = {c.__name__: c for c in INTERRUPT_MENU}

def parse_answer(s: str):
    """Convert a stored answer string to an exception instance, or return it unchanged."""
    m = _EXC_PAT.match(s)
    return _EXC_MAP[m.group(1)](m.group(2)) if m and m.group(1) in _EXC_MAP else s
