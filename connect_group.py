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
            if assert_knowledge(game):
                return question("Can I join you?")
            else:
                return question("What do you play?")
        case _:
            return random_question()


def approach(opener):
    # say the opener, then hold space for their response
    say(opener)
    hold_posture()
    flow()


def catch_conversation_topic(group):
    # can you make out what they're talking about?
    raw = input("[ listen ]  Can you catch their topic? (y/n) ").strip().lower()
    return raw == "y"


def think_of_question(topic):
    raw = input("[ think ]   Think of a question about the topic. Do you have any? (y/n) ").strip().lower()
    if raw == "y":
        return question(instruction="Ask the question you have in mind")
    return None


def catch_game(group):
    # figure out which game they're playing
    return "a game"


def assert_knowledge(subject):
    # check whether you know this subject well enough to engage
    return False


def random_question():
    # fall back to a general icebreaker
    return question("What brings you here?")


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
    while fear_level > 5 and keep_trying:
        reaction = show_interest_and_wait()
        if reaction:
            break
        fear_level = assess_internal(fear)
        keep_trying = willing_to_continue()

    if reaction:
        flow()
    elif fear_level <= 5:
        opener = initialize_approach_with(group)
        approach(opener)
    else:
        exit_gracefully()
