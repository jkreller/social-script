"""
Story game
version: v1
tags: playful, group, approaching
"""

from social_script import *


ROLES = [
    ("love fairy 🧚🏿‍♀️", "spread love and peace wherever the story goes"),
    ("sci-fi nerd 🚀", "drag everything into space, robots and all"),
    ("pragmatist 📐", "keep it grounded — someone has to"),
    ("crime author 🕵️‍♀️", "it's always the gardener!"),
    ("fantasy fan 🔮", "dragons, magic, an unlikely quest"),
    ("weirdo 😵‍💫", "just make it weird, that's fun"),
]

MIN_GROUP_SIZE = 3

JOIN_INVITE = "We're playing a game, wanna join playing? Takes 10-15 minutes."
QUICK_ASK = "We're playing a game and need help, can I ask a quick question?"
DECLINE_ENCOURAGEMENT = "No worries, you did great!\nDo it on your own!"

OPTIONS = {
    Story.CHARACTER_COUNT: ["1", "2", "3"],
    Story.WHO: [
        "Friedrich Merz", "Spongebob", "An ant", "WALL-E", "A police officer",
        "Herzschwestern", "Gregor Gysi", "The guy who invented Bauhaus", "ChatGPT",
    ],
    Story.WHERE: [
        "M18", "Ilm-Park", "Mensa", "Old Cemetery", "Uni-Library", "Wood-Workshop",
        "Weimar City Center", "Theaterplatz", "Bauhaus-Museum", "Parallel Universe",
    ],
    Story.WHEN: [
        "Prehistoric Times", "1980s", "During Summaery", "10 Years From Now", "2626", "Beyond time",
    ],
    Story.GENRE: [
        "Drama", "Sci-Fi", "Horror", "Romance", "Action", "Psycho-Thriller", "Comedy", "Bauhaus",
    ],
    Story.OBJECT: [
        "Smartphone", "The Death Star", "M18-deposit-coin", "Mensa tray", "Bauhaus lamp",
        "Wrecking ball",
    ],
}


def approach(purpose, min_count=None):
    if min_count:
        intro = f"We need {min_count} more person(s)."
    else:
        intro = None
    if assess_internal(fear, intro) > 6:
        breath_in_out(2)

    find_people(alone_ok=True)
    reduce_distance()
    say(purpose)

    if not sense("Are they in?"):
        acknowledge(DECLINE_ENCOURAGEMENT)
        if min_count:
            return Group()
        return None

    if not min_count:
        return Person()

    joined = count_people("How many joined you?")
    if joined > 1:
        return Group(joined)
    return Person()

def decide_story_element(group, story, element, number=None):
    person = group.current_person

    if person.up_for_approaching is None:
        person.up_for_approaching = assess_internal(initiativeness)

    if number is not None:
        prompt = _(element.question, number=number)
    else:
        prompt = element.question

    if person.up_for_approaching:
        stranger = approach(QUICK_ASK)
        if stranger:
            prompt = f"Let them decide:\n{prompt}"

    options = Story.options_for(element, OPTIONS[element], group)
    answer = choose(options, prompt, allow_custom=element is not Story.CHARACTER_COUNT)

    story.set(element, answer, number)
    if element is Story.CHARACTER_COUNT:
        return int(answer)
    return answer

def summarize(story):
    say(story.recap(), intro="Alright! Here's what we've got:", headline="tell everybody")

def read(person, story):
    do("Pass me to {person}.", person=person)
    finished = False
    while not finished:
        say("Read it out loud:\n{story_text}", story_text=story.text())
        finished = sense("Did you finish reading it out loud?")

def brainstorm(story, group):
    choose(group.people_with_roles, "Who's got an idea for the next part?")
    part = decide("Say the next part of the story and type it in")
    story.parts.append(part)

    if story.not_yet_used:
        used = choose(story.not_yet_used + ["none of them"], "Did you weave one of these in?")
        story.use(used)

    if story.might_be_done:
        story.is_complete = sense("Does the story feel complete?")

# --- main flow ---

# Phase 1: make it a group
next_phase("Make it a group!", "Let's see if we're enough people to play")

participant_count = count_people()

while participant_count < MIN_GROUP_SIZE:
    still_needed = MIN_GROUP_SIZE - participant_count
    joined = approach(JOIN_INVITE, still_needed)
    participant_count += joined.count

group = Group(participant_count)

sit_down_together()
explain_rules()


# Phase 2: get to know each other
next_phase("Great! Intro round!", "Let's see who's here")

for number in range(group.size):
    pass_device(group)
    person = group.current_person
    get_to_know(person)
    person.role = choose(ROLES, "What's your role", allow_custom=True)

pass_device(group)

# Phase 3: find story elements
next_phase("Add ingredients to the soup!", "Pick who, where, when, the genre and an object.")

story = Story()

character_count = decide_story_element(group, story, Story.CHARACTER_COUNT)

for character_number in range(character_count):
    pass_device(group)
    decide_story_element(group, story, Story.WHO, character_number + 1)

for element in [Story.WHERE, Story.WHEN, Story.GENRE, Story.OBJECT]:
    pass_device(group)
    decide_story_element(group, story, element)

summarize(story)


# Phase 4: tell the story
next_phase("Storytime!", "Everyone adds a part until it's complete.")

while not story.is_complete:
    center_device()
    brainstorm(story, group)


# Phase 3: listen to the story
next_phase("Let's hear it!", "Curious what the story sounds like?")

group_feels_up_for_it = assess_vibe(initiativeness)

if group_feels_up_for_it:
    person = None
    while not person:
        pass_device(group, anyone=True)
        person = approach(QUICK_ASK)
else:
    person = group.random_person()

read(person, story)


# Phase 4: feedback
next_phase("How was it?", "Quick feedback")

gather_feedback()
