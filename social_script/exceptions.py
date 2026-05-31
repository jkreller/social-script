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


class ExternalReason(AnyException):
    label = "Had to leave — external reason"


INTERRUPT_MENU = [
    FearTooHigh, UnexpectedReaction, RandomSituation,
    SensoryOverload, LostInterest, ExternalReason, AnyException,
]
