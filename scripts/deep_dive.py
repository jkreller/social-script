"""
The Script
version: v1.1
tags: feedback-loop, one-on-one, deepening
"""

from social_script import *

OPENERS = [
    "what brought them here",
    "what's been on their mind lately",
    "what they'd be doing if they weren't here",
    "the last thing that made them laugh",
]

QUESTIONS = [
    "to tell one specific thing about {last}",
    "what the best part of {last} is",
    "how they got into {last}",
    "what {last} reminds them of",
    "the story behind {last}",
    "why {last} matters to them",
    "what they would change about {last}",
]


def find_someone():
    observe_environment()
    person = find_person()
    reduce_distance_to(person)
    person.up_for_interaction = ask(person, "Are they up for some interaction?", returns=InputType.yn)

    if not person.up_for_interaction:
        say(goodbye)
        return find_someone()

    person.up_for_filming = explain()

    if not person.up_for_filming:
        say(goodbye)
        return find_someone()

    return person


# --- main flow ---

person = find_someone()
get_to_know(person)

opener = pick_from(OPENERS)
ask(person, opener)
listen_to(person)

rounds_until_check = 3
keep_going = True
while keep_going:
    try:
        question = pick_from(QUESTIONS)
        ask(person, question)
        listen_to(person)
    except (SensoryOverload, UnexpectedReaction, FearTooHigh):
        breath_in_out(3)
        if not sense("Still want to be here?"):
            break
        tell(person, "this is a lot for me — what do we do now?")
        listen_to(person)
    except Shame:
        breath_in_out(2)
        tell(person, "I felt a bit judged just then")
        if not sense("Okay to keep going?"):
            break
    except AnyException:
        break

    rounds_until_check = rounds_until_check - 1
    if rounds_until_check == 0:
        keep_going = assess_vibe(willingness_to_continue)
        rounds_until_check = 3

ask(person, "to come talk to you if your paths cross again")
tell(person, "thanks — it was good talking")
