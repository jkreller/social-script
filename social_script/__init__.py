"""Social Script – a Python framework for writing human-executable social scripts."""

from social_script._internal.driver import (
    io_read,
    io_write,
    get_driver,
    set_driver,
    clear_driver,
    CLIDriver,
    ReplayDriver,
    NeedInput,
    InputType,
)

from social_script.actions import (
    anchor,
    say,
    wait,
    hold_posture,
    exit_gracefully,
    assess_internal,
    assess_external,
    sit_down,
    observe_environment,
    find_group_of_people,
    interested_in,
    reduce_distance_to,
    show_interest_and_wait,
    willing_to_continue,
    flow,
    observe,
    choose,
)

from social_script.phrases import (
    greeting,
    exit,
    hold,
    response,
    boundary,
    phrase,
    question,
)

from social_script.external_actions import (
    Activity,
    activity,
)

from social_script.states import (
    fear,
    calm,
    tension,
    excitement,
    hesitation,
    readiness_for_interaction,
    tiredness,
)

from social_script.environment import (
    Person,
    Group,
    Distance,
    distance_of,
    me,
)

from social_script.exceptions import (
    FearTooHigh,
    TensionTooHigh,
    HesitationTooHigh,
)

__all__ = [
    # driver I/O (available in scripts via `from social_script import *`)
    "io_read",
    "io_write",
    "get_driver",
    "set_driver",
    "clear_driver",
    "CLIDriver",
    "ReplayDriver",
    "NeedInput",
    "InputType",
    # actions
    "anchor",
    "say",
    "wait",
    "hold_posture",
    "exit_gracefully",
    "assess_internal",
    "assess_external",
    "sit_down",
    "observe_environment",
    "find_group_of_people",
    "interested_in",
    "reduce_distance_to",
    "show_interest_and_wait",
    "willing_to_continue",
    "flow",
    "observe",
    "choose",
    # phrase categories
    "greeting",
    "exit",
    "hold",
    "response",
    "boundary",
    "phrase",
    "question",
    # external activity
    "Activity",
    "activity",
    # inner states
    "fear",
    "calm",
    "tension",
    "excitement",
    "hesitation",
    "readiness_for_interaction",
    "tiredness",
    # environment
    "Person",
    "Group",
    "Distance",
    "distance_of",
    "me",
    # exceptions
    "FearTooHigh",
    "TensionTooHigh",
    "HesitationTooHigh",
]
