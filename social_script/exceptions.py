"""Exceptions – inner states that interrupt the normal flow of a script."""


class FearTooHigh(Exception):
    """Fear level exceeded the threshold for this action."""


class TensionTooHigh(Exception):
    """Tension level exceeded the threshold for this action."""


class HesitationTooHigh(Exception):
    """Hesitation is blocking forward movement."""
