"""Social Script – a Python framework for writing human-executable social scripts."""

from social_script.actions import (
    anchor,
    say,
    wait,
    hold_posture,
    exit_gracefully,
    assess,
)

from social_script.phrases import (
    greeting,
    exit,
    hold,
    response,
    boundary,
)

from social_script.states import (
    fear,
    calm,
    tension,
    excitement,
    hesitation,
)

from social_script.exceptions import (
    FearTooHigh,
    TensionTooHigh,
    HesitationTooHigh,
)

__all__ = [
    # actions
    "anchor",
    "say",
    "wait",
    "hold_posture",
    "exit_gracefully",
    "assess",
    # phrase categories
    "greeting",
    "exit",
    "hold",
    "response",
    "boundary",
    # inner states
    "fear",
    "calm",
    "tension",
    "excitement",
    "hesitation",
    # exceptions
    "FearTooHigh",
    "TensionTooHigh",
    "HesitationTooHigh",
]
