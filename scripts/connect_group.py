import random
from social_script import *


def initialize_approach_with(group):
    # pick an opener based on what the group is currently doing
    group_activity = observe(group, Activity)
    match group_activity:
        case Activity.conversing:
            topic = catch_conversation_topic(group)
            if topic and (opener := think_of_question(topic)):
                return opener
            return question(choose([
                "Who is the tallest of you all?",
                "Wine or beer?",
                "Who is the most chaotic in your group?",
            ]))
        case Activity.gaming:
            game = catch_game(group)
            if game and assert_knowledge(game):
                return question("Can I join you?")
            else:
                return question("What do you play?")
        case _:
            return random_question()


def approach(opener):
    # say the opener, then hold space for their response
    try:
        say(opener)
    except FearTooHigh:
        breath_in_out(3)
        approach(opener)
        return

    hold_posture()
    flow()


def catch_conversation_topic(group):
    # can you make out what they're talking about?
    return sense("Can you catch their topic?", headline="listen")


def think_of_question(topic):
    if sense("Think of a question about the topic. Do you have any?", headline="think"):
        return question(instruction="Ask the question you have in mind")
    return None


def catch_game(group):
    return sense("Can you tell what game they're playing?", headline="observe")


def assert_knowledge(subject):
    return sense("Do you know this game well enough to join?", headline="think")


def random_question():
    options = [
        "What's the most random skill among you all?",
        "What's something your group is weirdly proud of?",
        "What would you all be doing right now if you weren't here?",
        "What's the most controversial opinion in your group about something completely unimportant?",
        "If your group had a theme song, what would it be?",
        "What's the last thing that had all of you laughing?",
        "Who in your group would surprise people the most?",
        "If you all had to eat one thing forever, could you even agree on what?",
    ]
    return question(random.choice(options))


# --- main flow ---

sit_down()
observe_environment()

group = None
while not group:
    wait()
    potential_group = find_group_of_people()
    if interested_in(potential_group) and assess_external(potential_group, readiness_for_interaction) > 5:
        group = potential_group

fear_level = assess_internal(fear)

if fear_level <= 5:
    opener = initialize_approach_with(group)
    approach(opener)
else:
    if not distance_of(me, group).in_understanding_range:
        reduce_distance_to(group)

    keep_trying = True
    while keep_trying:
        reaction = show_interest_and_wait()
        if reaction:
            break
        fear_level = assess_internal(fear)
        if fear_level <= 5:
            break
        keep_trying = assess_internal(willingness_to_continue)

    if reaction:
        flow()
    elif fear_level <= 5:
        opener = initialize_approach_with(group)
        approach(opener)
    else:
        exit_gracefully()
