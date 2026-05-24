from social_script import *


def approach():
    """Open the contact – speak and hold space for a response."""
    say(greeting.neutral)
    hold_posture()  # let them respond, don't fill the silence


# requires: group is visibly relaxed, not in deep conversation

anchor()  # arrive first

fear_level = assess(fear)

try:
    if fear_level > 6:
        raise FearTooHigh

    approach()

except FearTooHigh:
    anchor()  # step back
    wait()    # let it settle

    fear_level = assess(fear)  # reassess
    if fear_level <= 6:
        approach()  # one more try
    else:
        exit_gracefully()
