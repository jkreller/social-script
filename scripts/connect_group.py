"""
Social script
version: v2
tags: playful, group, multiple executors
"""

from social_script import *


# An art-project game. The app is in charge: it gives short orders, everyone
# just does what it says. "The app made us" lifts the fear of looking stupid
# off any one person. You do one brave thing — take it to people you don't
# know — then the app runs the room and gets passed around.


# --- the decks the app deals from: short, concrete, weave-able, a little unhinged ---

THINGS = [
    "a goat", "a fire alarm", "your ex", "free pizza", "a minor crime",
    "a celebrity (you swear it was them)", "the police", "a very large bill",
    "a missing shoe", "a karaoke machine", "someone's grandma",
    "a stranger's wedding", "a trampoline", "a love story", "a parking ticket",
    "a kebab", "a group-chat meltdown", "a llama (or alpaca?)", "chaos",
    "a 3am decision", "a borrowed costume", "a suspicious smell", "a minor lie",
    "an inflatable flamingo", "the number 42",
    "a letter from the future", "a very confident wrong guess", "your favourite movie",
]

GLUE = ["Next…", "Then…", "But then…", "Therefore…", "Meanwhile…", "Suddenly…", "Which is when…", "Unfortunately…"]

PICKS = [
    "your last encounter with an animal that didn't go to plan",
    "the worst trip you've ever taken",
    "a childhood crime you got away with",
    "where you'd run away to, and why",
    "the last thing you got way too competitive about",
    "a time you got caught doing something dumb",
    "the strangest thing you've been paid to do",
    "a lie that spiralled out of control",
    "your closest brush with someone famous",
    "the most trouble a group chat got you into",
    "a hidden skill nobody would guess you have",
    "the worst date in living memory",
    "a time you were absurdly lucky",
    "something you believed way too long as a kid",
    "the dumbest thing you've done on a dare",
    "the pettiest revenge you've ever taken",
    "a travel story that went sideways",
    "the weirdest place you've fallen asleep",
    "a rule you broke and don't regret",
    "your most expensive mistake",
    "a time a stranger genuinely surprised you",
    "a childhood sin you've never confessed",
]


def approach_strangers():
    # the dare: people you don't actually know. find them, get close, explain yourself.
    group = find_group_of_people()
    reduce_distance_to(group)
    # your own words — it's an art project, the app's running you, and: got a minute?
    say("Your words: it's an art project, the app's running you — got a few minutes?")
    return sense("Are they in?", headline="check")


def tell_a_story_together(players):
    # one dumb story, one line each, glued with but/therefore (good stories TURN, they
    # don't just "and then…"), plus a concrete thing to work in (specifics = funny + vivid)
    say("Start out loud: 'This story is about…' — and run with it.")
    hand_over()
    for _ in range(players):
        say(f"{deal(GLUE)}\n\n…add a line — include\n\"{deal(THINGS)}\".")
        hand_over()
    # land the nonsense somewhere REAL — that's what turns a laugh into a memory
    say("Last line: bring it home — land it on something real about tonight or your life.")


def truth_or_lie(players):
    # a forced secret element makes a true story sound fake and gives a lie an anchor —
    # so nobody can read the tells. the reveal at the end is where you actually connect.
    for _ in range(players):
        say(f"Read out loud: {deal(PICKS)}.")
        say(f"(don't read aloud):\n\ninclude \"{deal(THINGS)}\" into your answer.")
        say("Tell it — true, or a total lie. Sell it either way.")
        say("Group: truth or lie? Lock it in — then reveal, and if you lied, give us the real one.")
        hand_over()


def land_it():
    # peak-end: people keep the high point and the last beat — leave a good one
    say("Whoever's holding me: favourite part of the story? Then put me down — done.")


# --- main flow ---

play_along()

# the dare: bring in people you don't actually know. not optional — that's the point.
while not approach_strangers():
    say("No worries — thank them, no pressure. On to the next group.")

# it's an art project and the app films — never film anyone who hasn't said yes
say("Tell them the app films the game for the project. Everyone okay with that?")

# the app gives everyone a turn — explain the passing your own way
say("Your words: the app gives each of you a go — you'll pass it round.")
hand_over()

players = count_heads()

# the whole group picks the game, together
say("Whole group — decide this one together:")
if choose(["Tell a story together", "Truth or lie"]) == "Tell a story together":
    tell_a_story_together(players)
else:
    truth_or_lie(players)

land_it()
