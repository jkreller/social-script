"""
Social script
version: v2
tags: playful, approach, multiple executors
"""

from social_script import *


# An art-project game. The app is in charge: it gives short orders, everyone
# just does what it says. "The app made us" lifts the fear of looking stupid
# off any one person. You do one brave thing — take it to people you don't
# know — then the app runs the room and gets passed around.


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


def move_on():
    say("No worries — thank them, no pressure. On to the next group.")


def explain():
    say("Tell them the app films the game for the project. Everyone okay with that?")
    say("Your words: the app gives each of you a go — you'll pass it round.")


def approach_strangers():
    group = find_group_of_people()
    reduce_distance_to(group)
    say("Your words: it's an art project, the app's running you — got a few minutes?")
    return sense("Are they in?", headline="check")


def play_story_telling(turns):
    say("Start the story:\n\"This story is about…\"")
    hand_over()
    for _ in range(turns):
        say(f"{deal(GLUE)}\n\n…add a line — include\n\"{deal(THINGS)}\".")
        hand_over()

    say("Last line: bring it home, land it on something real.")


def play_truth_or_lie(turns):
    for _ in range(turns):
        say(f"Read out loud: {deal(PICKS)}.")
        say(f"(don't read aloud):\n\ninclude \"{deal(THINGS)}\" into your answer.")
        say("Tell it — true, or a total lie. Sell it either way.")
        say("Group: truth or lie? Lock it in — then reveal, and if you lied, give us the real one.")
        hand_over()


def land_it(game):
    say(f"Whoever's holding me: favourite {"part of the story" if game is story_telling else "story"}? Then put me down — done.")


# --- main flow ---

play_along()

while not approach_strangers():
    move_on()

explain()
hand_over()

players = count_people()
turns = players * 2 if players < 5 else players

game = choose([story_telling, truth_or_lie], "Whole group – decide together")
if game is story_telling:
    play_story_telling(turns)
elif game is truth_or_lie:
    play_truth_or_lie(turns)

land_it(game)
