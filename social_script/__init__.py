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
    breath_in_out,
    say,
    wait,
    hold_posture,
    exit_gracefully,
    assess_internal,
    assess_external,
    walk,
    sit_down,
    observe_environment,
    find_group_of_people,
    interested_in,
    reduce_distance_to,
    show_interest_and_wait,
    flow,
    observe,
    choose,
    sense,
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
    readiness_for_interaction,
    tiredness,
    willingness_to_continue,
)

from social_script.environment import (
    Person,
    Group,
    Distance,
    distance_of,
    me,
)

from social_script.exceptions import (
    AnyException,
    FearTooHigh,
    UnexpectedReaction,
    RandomSituation,
    SensoryOverload,
    LostInterest,
    ExternalReason,
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
    "breath_in_out",
    "say",
    "wait",
    "hold_posture",
    "exit_gracefully",
    "assess_internal",
    "assess_external",
    "walk",
    "sit_down",
    "observe_environment",
    "find_group_of_people",
    "interested_in",
    "reduce_distance_to",
    "show_interest_and_wait",
    "flow",
    "observe",
    "choose",
    "sense",
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
    "readiness_for_interaction",
    "tiredness",
    "willingness_to_continue",
    # environment
    "Person",
    "Group",
    "Distance",
    "distance_of",
    "me",
    # exceptions
    "AnyException",
    "FearTooHigh",
    "UnexpectedReaction",
    "RandomSituation",
    "SensoryOverload",
    "LostInterest",
    "ExternalReason",
]
