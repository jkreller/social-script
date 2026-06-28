"""
Social script
version: v2.1
tags: playful, approach, group
"""

from social_script import *


# An art-project game. The app is in charge: it gives short orders, everyone
# just does what it says. "The app made us" lifts the fear of looking stupid
# off any one person. You do one brave thing — take it to people you don't
# know — then the app runs the room and gets passed around.


STORY_MOVES = [
    # — include a thing —
    'include "a goat"',
    'include "a fire alarm"',
    'include "your ex"',
    'include "free pizza"',
    'include "a minor crime"',
    'include "a celebrity (you swear it was them)"',
    'include "the police"',
    'include "a very large bill"',
    'include "a missing shoe"',
    'include "a karaoke machine"',
    'include "someone\'s grandma"',
    'include a person of this group',
    'include "a stranger\'s wedding"',
    'include "a trampoline"',
    'include "a love story"',
    'include "a parking ticket"',
    'include "a kebab"',
    'include "a llama (or alpaca?)"',
    'include "chaos"',
    'include "a borrowed costume"',
    'include "a suspicious smell"',
    'include "a minor lie"',
    'include "an inflatable flamingo"',
    'include "the number 42"',
    'include "a letter from the future"',
    'include "the Titanic"',
    # — story twist —
    "give it an unexpected twist",
    "make the main character fall in love",
    "fast-forward 10 years",
    "bring in a villain",
    "reveal it was all a dream",
    "reveal a shocking secret",
    "make everything go wrong",
    "give someone a superpower",
    # — make it personal —
    "set it in your actual hometown",
    "include your favourite band",
    "make a friend of yours appear",
    "reference something you did this week",
    "set a scene in a place you love",
    "add something only this group would know",
    "bring in your most embarrassing habit",
    "make your pet appear (real or imagined)",
]

FREE_MOVE = "your move — take it anywhere"

# roughly one in three turns is a free move
STORY_POOL = STORY_MOVES + [FREE_MOVE] * 18

PICKS = [
    "your last encounter with an animal that didn't go to plan",
    "worst idea you ever had",
    "most ridiculous thing you've bought",
    "most ridiculous thing you've spent money on",
    "most expensive thing you have",
    "worst picture that exists of you",
    "the worst trip you've ever taken",
    "a childhood crime you got away with",
    "where you'd run away to, and why",
    "the last thing you got way too competitive about",
    "a time you got caught doing something dumb",
    "the strangest thing you've been paid to do",
    "a lie that got out of control",
    "a situation with someone famous",
    "a hidden skill nobody would guess you have",
    "the worst date in living memory",
    "a time you were absurdly lucky",
    "something you believed way too long as a kid",
    "the dumbest thing you've done",
    "the best revenge you've ever taken",
    "a travel story that went sideways",
    "the weirdest place you've fallen asleep",
    "the coolest place you've been to",
    "a rule you broke and don't regret",
    "your most expensive mistake",
    "a time a stranger surprised you",
    "a childhood sin you've never confessed",
]


def move_on():
    say("No worries — thank them, no pressure. On to the next group.")


def explain():
    say("Tell them the app films the game for the project. Everyone okay with that?")
    say("The app gives each of you a go — you'll pass it round.")


def approach_strangers():
    group = find_group_of_people()
    reduce_distance_to(group)
    say("Say: it's an art project, the app's running you — got a few minutes?")
    return sense("Are they in?", headline="check")


def play_story_telling(turns):
    say("Start the story:\n\"This story is about…\" (name a person of this group)")
    hand_over()
    for _ in range(turns):
        story_move = pick_from(STORY_POOL)
        say(story_move, headline="continue the story")
        hand_over()

    say("Last line: bring it home, land it on something real.")


def play_truth_or_lie(turns):
    for _ in range(turns):
        say(f"Read out loud:\n\"{pick_from(PICKS)}\"\n\nTrue or lie — sell it. Press continue when done.")
        say("Group: truth or lie?\nThen reveal, and if lie, tell the real one.")
        hand_over()


def land_it(game):
    say(f"Whoever's holding me: favourite {"part of the story" if game is story_telling else "story"}? Then put me down — done.")


# --- main flow ---

play_along()

while not approach_strangers():
    move_on()

explain()

players = count_people()
turns = players * 2 if players < 5 else players

game = choose([story_telling, truth_or_lie], "Decide together")

hand_over()

if game is story_telling:
    play_story_telling(turns)
elif game is truth_or_lie:
    play_truth_or_lie(turns)

land_it(game)
