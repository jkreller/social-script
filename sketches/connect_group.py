from social_script import *
me = self # note: me should be the variable representing the person executing, so basically what normally is the computer
# notes:
# - group can never do an action, only have properties


sitDown()
observeEnvironment() # openly observe your environment, what is happening, where are you

# finding a group to approach
while not group:
    wait()
    potentialGroup = findGroupOfPeople()
    if interestedIn(potentialGroup) and assessOutside(potentialGroup, State.readinessForInteraction) > 5:
        group = potentialGroup

fearOfApproaching = assessInside(State.fear)
if fearOfApproaching <= 5:
    # approaching right away, 
    opener =initializeApproachWith(group)
    approach(opener)
else:
    # showing interest and waiting for the group to approach
    if not distanceOf(me, group).inUnderstandingRange:
        reduceDistanceTo(group)

    while not reaction and fearOfApproaching > 5 and tiredness <= 5:
        reaction = showInterestAndWait() # make eye contact, smile, react etc.
        fearOfApproaching = assessInside(State.fear)
        tiredness = assessInside(State.tiredness) # assess tiredness of trying to show interest and wait

    if reaction:
        flow(reaction)
    elif fearOfApproaching <= 5:
        opener = initializeApproachWith(group)
        approach(opener)
    else:
        exitGracefully()
    

def initializeApproachWith(group):
    groupActivity = observe(group, Activity) # observe what the group is doing
    match groupActivity:
        case Activity.conversing:
            topic = catchConversationTopic(group)
            if topic:
                opener = thinkOfQuestion(topic)
            else:
                opener = choose([
                    "Who is the tallest of you all?",
                    "Wine or beer?",
                    "Who is the most chaotic in your group?",
                ])
            return opener
        case Activity.gaming:
            game = catchGame(group)
            if assertKnowledge(game):
                opener = "Can I join you?"
            else:
                opener = "What do you play?"

            return opener
        case _:
            return randomQuestion()
        
def approach(opener):
    say(opener)
    reaction = holdPosture() # let them respond, don't fill the silence
    flow(reaction) # flow with the conversation, no need to plan ahead, just react to what is happening in the moment
        

# todo
# - check inner logic of code
# - think of more generic functions which could be reused across different scripts
# - turn into python code