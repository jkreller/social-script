"""
Connect group
version: v3
tags: playful, approach, group
"""

from social_script import *


def approach(group):
    # one person of the group should approach a random person, let them decide by their own, just say "one of you"
    pass

def decide_story_element(person, story, element, number=None):
    # let the person decide if they are willing to approach a random person throughout the game: assert_internal(initiativeness)
    # save decision in their object

    # if yes, make them approach a random person to decide the story element
    # if no, offer them a list of options or make them write their own answer
    pass

def summarize(story):
    # read all the story elements decided so far
    pass

def pass_device(group):
    # pass the device to the next person in the group
    pass

def center_device(group):
    # instruct the person to put the device in the center of everyone
    pass

def brainstorm(story, group):
    # make group select a user that has an idea
    # when selected make them type the story part and make them select if they used a story element
    # when all story elements were used, check if the story is complete
    pass

def gather_feedback(group):
    # ask three questions:
    # 1. How happy are you with the story? (scale)
    # 2. How much fun did you have? (scale)
    # 3. Would you like to play again? (yes/no)
    pass


# --- main flow ---

# Preparation: make a group

participant_count = count_people()

while participant_count < 3:
    participant_count += find_more_people(3 - participant_count) # approach at least "3 - participant_count" people who join the group

group = Group(participant_count)


# Phase 0: get to know each other

for number in range(group.size):
    person = get_to_know(number) # get username and role and assign number and return person object
    group.add(person)
    group.next_person()


# Phase 1: find story elements

story = Story()

character_count = decide_story_element(group, story, Story.CHARACTER_COUNT) # inside: story.set(Story.CHARACTER_COUNT, character_count)

for character_number in range(character_count):
    pass_device(group)
    decide_story_element(group.current_person, story, Story.CHARACTER, character_number)

for element in [Story.WHO, Story.WHERE, Story.WHEN, Story.GENRE, Story.OBJECT]:
    pass_device(group)
    decide_story_element(group, story, element)


# Phase 2: tell the story

summarize(story)

while not story.is_complete():
    center_device(group)
    brainstorm(story, group)


# Phase 3: listen to the story

initiativeness = assess_vibe(initiativeness) # assert the vibe of the group

if initiativeness:
    while not person:
        person = approach(group) # somebody of the group should approach a random person
else:
    person = group.random_person()

read(person, story)


# Phase 4: feedback

gather_feedback(group)