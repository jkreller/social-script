from social_script import *


def find_something_genuine():
    return sense(
        "Anything on someone you honestly find cool? \n An item, a detail, a vibe?",
        headline="observe",
    )


def give_compliment(smaller=False):
    try:
        if smaller:
            # no words this time — a look, a nod, a small gesture still counts
            say("No words then – just a look, nod, small gesture.")
        else:
            say("Casually say to them the thing you found cool.")
    except FearTooHigh:
        breath_in_out(3)
        options = ["continue", "stop here"] if smaller else ["make it smaller", "continue", "stop here"]
        match choose(options):
            case "continue":
                pass  # let this one go — the walk will bring the next thing
            case "stop here":
                exit_gracefully()
            case _:  # make it smaller: drop the words, just a gesture
                give_compliment(smaller=True)
        return

    hold_posture()


# --- main flow ---

continueing = True

while continueing:
    something = None
    
    # walk until something honestly catches you — no forcing
    while not something and continueing:
        walk()
        observe_environment()
        something = find_something_genuine()

        if something:
            break  # found something, move on to giving the compliment
        
        continueing = assess_internal(willingness_to_continue)

    if not something:
        break  # willingness ran out — no forcing it

    if assess_internal(fear) > 5:
        breath_in_out(3)

    give_compliment()

    continueing = assess_internal(willingness_to_continue)