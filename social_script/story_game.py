"""Moves specific to the story-telling game — too tied to its own rules to live
among the generic play verbs."""

from social_script.actions import say


def explain_rules() -> None:
    """Read the story game's rules out loud to the group."""
    say(
        "You'll run this script prompt by prompt.\n\n"
        "Rule 1: do what it says.\n\n"
        "Rule 2: read everything out loud, so everyone gets it.\n\n"
        "You are building a story together, in three rounds:\n\n"
        "- 1. Get to know each other\n"
        "- 2. Pick story elements\n"
        "- 3. Write the story",
        headline="read the rules",
    )
