"""
Social script
version: v1
tags: playful, pass-on, multiple executors
"""

from social_script import *


# A pass-the-phone game out in a public space — alone or with whoever's around.
# When it lands on you the app gives you one quick, daft thing to do — you do it,
# tap, pass me to someone new. "The app made me" takes the pressure off: nobody
# chose to look silly, the app did.


# Two kinds, both fine on your own in public: solo bits (awkward just because
# you're in public) and a few aimed at "the person you pass me to" — the one
# handoff that always exists. No assumptions about a group, a room, or an audience.

ACTIONS = [
    "Imagine your favourite song — dance to it.",
    "Make the sound of your current mood.",
    "Do the most dramatic sigh of your entire life.",
    "Strike a superhero pose and hold it for five seconds.",
    "Tell your villain origin story — one sentence, out loud.",
    "Walk a few steps like you're on a fashion runway.",
    "Do your best evil laugh.",
    "Say 'I love you' to the nearest object like you mean it.",
    "Hum your favourite song out loud for five seconds.",
    "Act out your morning routine in fast-forward.",
    "Give a 10-second speech for getting out of bed today.",
    "Pretend you just won the lottery. React, out loud.",
    "Show how you dance when absolutely nobody is watching.",
    "Sing the next line of whatever song is stuck in your head.",
    "Strike a pose for an imaginary photo and hold it.",
    "Name a superpower you'd want — then act out using it once.",
    "Give a weather forecast for how your day is going.",
    "Do a little victory lap on the spot, like you just scored.",
    "Blow a kiss to the sky for absolutely no reason.",
    "Whisper a fake juicy secret to the person you pass me to.",
    "Invent a quick handshake with the person you pass me to.",
    "Give the person you pass me to a weirdly specific compliment.",
    "Do a slow-motion high-five with the person you pass me to.",
    "Hold eye contact with the person you pass me to for three seconds, then nod solemnly.",
    "Tell the person you pass me to one tiny true thing about yourself.",
    "Pull your silliest face at the person you pass me to — at the same time.",
]


# --- the moves ---

def take_a_dare():
    while True:
        try:
            action = pick_from(ACTIONS)
            do(action)
            return
        except AnyException:
            pass  # refused — deal another


def someone_wants_a_go():
    return choose(["Give it to another person", "End it"]) == "Give it to another person"


def land_it():
    say("Lovely. Hand me back to whoever started — done.")


# --- main flow ---

play_along()

while True:
    take_a_dare()
    if not someone_wants_a_go():
        break
    hand_over()

land_it()
