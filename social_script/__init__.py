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
    do,
    wait,
    hold_posture,
    exit_gracefully,
    assess_internal,
    assess_external,
    walk,
    sit_down,
    observe_environment,
    find_group_of_people,
    find_person,
    explain,
    interested_in,
    reduce_distance_to,
    show_interest_and_wait,
    flow,
    observe,
    choose,
    sense,
    get_to_know,
    ask,
    listen_to,
    tell,
    assess_vibe,
)

from social_script.play import (
    hand_over,
    count_people,
    pick_from,
)

from social_script.phrases import (
    greeting,
    exit,
    hold,
    response,
    boundary,
    phrase,
    question,
    goodbye,
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

from social_script.games import (
    story_telling,
    truth_or_lie,
)

from social_script.environment import (
    Person,
    Group,
    Distance,
    distance_of,
    me,
    everyone,
)

from social_script.exceptions import (
    AnyException,
    FearTooHigh,
    UnexpectedReaction,
    RandomSituation,
    SensoryOverload,
    LostInterest,
    Shame,
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
    "do",
    "wait",
    "hold_posture",
    "exit_gracefully",
    "assess_internal",
    "assess_external",
    "walk",
    "sit_down",
    "observe_environment",
    "find_group_of_people",
    "find_person",
    "explain",
    "interested_in",
    "reduce_distance_to",
    "show_interest_and_wait",
    "flow",
    "observe",
    "choose",
    "sense",
    "get_to_know",
    "ask",
    "listen_to",
    "tell",
    "assess_vibe",
    # play
    "hand_over",
    "count_people",
    "pick_from",
    # phrase categories
    "greeting",
    "exit",
    "hold",
    "response",
    "boundary",
    "phrase",
    "question",
    "goodbye",
    # external activity
    "Activity",
    "activity",
    # inner states
    "fear",
    "readiness_for_interaction",
    "tiredness",
    "willingness_to_continue",
    # games
    "story_telling",
    "truth_or_lie",
    # environment
    "Person",
    "Group",
    "Distance",
    "distance_of",
    "me",
    "everyone",
    # exceptions
    "AnyException",
    "FearTooHigh",
    "UnexpectedReaction",
    "RandomSituation",
    "SensoryOverload",
    "LostInterest",
    "Shame",
    "ExternalReason",
]
