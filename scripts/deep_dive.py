"""
Social script
version: v1
tags: feedback-loop, one-on-one, deepening
"""

from social_script import *


# An art-project conversation built as a feedback loop. You make one brave move:
# walk up to one person. From there the app holds the thread — it takes what they
# just told you and hands it back as your next question. Their answer becomes the
# next question, again and again, and the talk deepens on its own. Everything they
# say is kept on `person`, and now and then the app circles all the way back to
# where you started. If it gets to be too much, that isn't a failure — you breathe,
# and the two of you decide together where to go next.


# the app hands you one of these to ask about, one at a time. most build on the
# LAST thing they said; a couple circle all the way back to the FIRST.
FOLLOW_UPS = [
    "more about {last}",
    "what the best part of {last} is",
    "how they got into {last}",
    "what {last} reminds them of",
    "the story behind {last}",
    "why {last} matters to them",
    "what they would change about {last}",
]
CIRCLE_BACK = [
    'what "{first}" has to do with {last}',
    'more about "{first}", back where you started',
]
QUESTIONS = FOLLOW_UPS * 3 + CIRCLE_BACK   # mostly build on the last word; now and then circle back

OPENERS = [
    "what brought them here",
    "what's been on their mind lately",
    "what they'd be doing if they weren't here",
    "the last thing that made them laugh",
]

# the ways it can get to be too much — each one is met and held, not a failure.
too_much = (SensoryOverload, UnexpectedReaction, FearTooHigh)
felt_judged = Shame


def find_someone():
    # walk up to one person and say why you're here, and hand back whoever's up for
    # it — if they're not, let them go and try someone else
    observe_environment()
    reduce_distance_to(Person())
    say("Walk up and say: it's an art project — the app gives me the questions. Got a minute?")
    say("Mention it's filmed for the project — is that okay with them?")
    if not sense("Are they up for it?"):
        say("No worries — let them go, and find someone else when you're ready.")
        return find_someone()
    return Person()


# --- main flow ---

play_along()

person = find_someone()                # the one who's up for it
get_to_know(person)                    # ask their name

opener = pick_from(OPENERS)
ask(person, opener)                    # get them talking
listen_to(person)                      # keep one thing they said

# at least three rounds before the first check-in, then one more every three
rounds_until_check = 3
keep_going = True
while keep_going:
    try:
        question = pick_from(QUESTIONS)
        ask(person, question)              # their own words, handed back as the next question
        listen_to(person)                  # keep one thing they said
    except too_much:
        breath_in_out(3)
        if not sense("Still want to be here?"):
            break
        tell(person, "this is a lot for me — what do we do now?")
        listen_to(person)                  # let them steer; keep what they offer
    except felt_judged:
        breath_in_out(2)
        tell(person, "I felt a bit judged just then")
        if not sense("Okay to keep going?"):
            break
    except AnyException:
        break                              # lost interest, had to leave — let it end here

    rounds_until_check = rounds_until_check - 1
    if rounds_until_check == 0:
        keep_going = assess_vibe(willingness_to_continue)   # check in with both of you
        rounds_until_check = 3             # then give it another three

ask(person, "to come talk to you if your paths cross again")
tell(person, "thanks — it was good talking")
