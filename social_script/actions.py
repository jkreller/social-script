"""Action verbs for executing social scripts – what the body, mind, and voice do."""

import random
from enum import Enum
from social_script._internal.driver import io_read, io_write, InputType, get_driver
from social_script._internal.i18n import _
from social_script.phrases import Phrase


def anchor() -> None:
    """Ground the body before moving or speaking."""
    io_read(_("Feel your feet. Take a breath."), headline=_("anchor"), input_type=InputType.enter)


def breath_in_out(cycles: int = 1) -> None:
    """Guide through a number of slow breath cycles."""
    middle_cues = [_("Another time:"), _("One more time:"), _("Again:")]
    for i in range(cycles):
        if i == 0:
            cue = ""
        elif i == cycles - 1:
            cue = _("One last time: ")
        else:
            cue = random.choice(middle_cues) + " "
        io_read(f"{cue}{_('Breathe in... and out.')}", headline=_("breathe"), input_type=InputType.enter)


def say(p, *, headline="say", intro=None, **kwargs) -> None:
    """Deliver a phrase out loud. Pass a phrase, a plain string for a free-form line,
    or a list of {icon, label, value} items to read out as a structured summary — an
    optional `intro` sets the scene above it, same idea as assess_internal's intro.
    Any string kwargs are translated before formatting."""
    if isinstance(p, list):
        text = "\n".join(f"{item['label']}: {item['value']}" for item in p)
        translated_intro = _(intro) if intro else None
        io_read(f"{translated_intro}\n{text}" if translated_intro else text,  # glue of two independent pieces
                headline=_(headline), input_type=InputType.enter_structured, items=p, intro=translated_intro)
        return
    translated_kwargs = {k: _(v) if isinstance(v, str) else v for k, v in kwargs.items()}
    if isinstance(p, str):
        p = Phrase(instruction=_(p, **translated_kwargs))
    label = str(p) if isinstance(p, Phrase) and p.instruction else _("Say: '{p}'", p=p)
    io_read(label, headline=_(headline), input_type=InputType.enter)


def do(action, **kwargs) -> None:
    """Carry out a physical action."""
    # `action` is normally script-authored text and stays English (no catalog
    # match); wrapping it is a safe no-op then, but lets it translate on the rare
    # occasion a script's wording happens to match a framework phrase.
    # Any string kwargs are translated before formatting.
    translated_kwargs = {k: _(v) if isinstance(v, str) else v for k, v in kwargs.items()}
    io_read(_(action, **translated_kwargs), headline=_("action"), input_type=InputType.enter)


def acknowledge(note, **kwargs) -> None:
    # Any string kwargs are translated before formatting.
    translated_kwargs = {k: _(v) if isinstance(v, str) else v for k, v in kwargs.items()}
    io_read(_(note, **translated_kwargs), headline=_("acknowledge"), input_type=InputType.enter)  # same reasoning as do()


def next_phase(title=None, description=None) -> None:
    """Move the game into its next part."""
    get_driver().advance_phase(_(title), _(description))


def wait() -> None:
    """Hold still and let silence do the work."""
    io_read(_("Let it settle."), headline=_("wait"), input_type=InputType.enter)


def hold_posture():
    """Maintain current physical stance and wait for their response."""
    io_read(_("Don't move. Wait for their response."), headline=_("hold"), input_type=InputType.enter)
    return True


def exit_gracefully() -> None:
    """Close the interaction with composure."""
    io_write("[ exit ]    Leave with composure. You're done.")


def assess_internal(signal, intro=None):
    """Read an inner signal: a gut yes/no for binary states, else an intensity 1–10.
    An optional intro sets the scene before the question."""
    translated_intro = _(intro) if intro else None
    question = f"{translated_intro}\n{signal.question()}" if translated_intro else signal.question()
    return _assess(question, signal.input_type)


def assess_external(entity, signal):
    """Read a signal about an external person or group: yes/no for binary states, else 1–10."""
    return _assess(signal.question(entity), signal.input_type)


def _assess(question, input_type):
    if input_type == InputType.yn:
        return io_read(question, headline=_("assess"), input_type=InputType.yn).strip().lower() == "y"
    while True:
        raw = io_read(question, headline=_("assess"), input_type=InputType.scale)
        if raw.isdigit() and 1 <= int(raw) <= 10:
            return int(raw)


def walk() -> None:
    """Keep moving through the space, unhurried, letting it pass by."""
    io_read(_("Keep walking. No destination, go as you feel."), headline=_("walk"), input_type=InputType.enter)


def sit_down() -> None:
    """Find a spot and settle into the space."""
    io_read(_("Find a spot and settle in."), headline=_("sit"), input_type=InputType.enter)


def sit_down_together() -> None:
    """Find a spot and settle in, together with the group."""
    io_read(_("Find a place to sit down together."), headline=_("sit"), input_type=InputType.enter)


def observe_environment() -> None:
    """Openly take in the surroundings – who is here, what is happening."""
    io_read(_("Look around. Take it all in."), headline=_("observe"), input_type=InputType.enter)


def find_people(alone_ok=False):
    prompt = _("Scan the room for one person or a group.") if alone_ok else _("Scan the room for any group.")
    io_read(prompt, headline=_("find"), input_type=InputType.enter)


def explain() -> bool:
    """Explain the art-project context and capture consent."""
    io_read(_("Explain: you're doing an art project, you're being programmed and it's being filmed."),
            headline=_("explain"), input_type=InputType.enter)
    return sense("Are they still okay with it?", headline="ask")  # sense() wraps this itself


def interested_in(thing) -> bool:
    """Check whether you feel genuinely interested in this person or group."""
    entity_name = type(thing).__name__.lower()
    return sense(_("Are you interested in this {entity}?", entity=entity_name), headline="interest")


def reduce_distance(to=None) -> None:
    """Move physically closer — to a named person or group, or just to whoever's there."""
    if to is not None:
        text = _("Move closer to the {kind}, naturally.", kind=type(to).__name__.lower())
    else:
        text = _("Move closer, naturally.")
    io_read(text, headline=_("move"), input_type=InputType.enter)


def show_interest_and_wait():
    """Signal interest nonverbally – eye contact, a smile – and wait for a response."""
    io_read(_("Make eye contact. Smile if it fits. Wait."), headline=_("signal"), input_type=InputType.enter)
    return sense("Did they react?", headline="signal") or None  # sense() wraps this itself


def flow() -> None:
    """Follow the natural current of the conversation without forcing it."""
    io_read(_("Go with the flow. React, don't perform."), headline=_("flow"), input_type=InputType.enter)


def observe(entity, kind):
    """Observe something specific about a person or group and return what you notice."""
    entity_name = type(entity).__name__.lower()
    choices = [{"label": m.name, "description": None} for m in kind] if isinstance(kind, type) and issubclass(kind, Enum) else []
    while True:
        raw = io_read(_("What is the {entity} doing?", entity=entity_name),
                       headline=_("observe"), input_type=InputType.choice, choices=choices).strip()
        if raw.isdigit() and 1 <= int(raw) <= len(choices):
            return list(kind)[int(raw) - 1]


def choose(options, prompt: str = "Pick one", *, allow_custom: bool = False):
    members = list(options) if isinstance(options, type) and issubclass(options, Enum) else options
    pairs = [(o[0], o[1]) if isinstance(o, tuple) else (o, None) for o in members]
    choices = [{"label": _(str(label)), "description": _(desc)} for label, desc in pairs]
    while True:
        raw = io_read(_(prompt), headline=_("choose"), input_type=InputType.choice, choices=choices, allow_custom=allow_custom).strip()
        if raw.isdigit() and 1 <= int(raw) <= len(pairs):
            return pairs[int(raw) - 1][0]
        if allow_custom and raw:
            return raw


def sense(prompt: str, *, headline: str = "sense") -> bool:
    """Ask yourself an honest yes/no question and answer from the gut."""
    raw = io_read(_(prompt), headline=_(headline), input_type=InputType.yn).strip().lower()
    return raw == "y"


def decide(prompt: str) -> str:
    """Decide for yourself and type it in — the device is already in your hands."""
    return io_read(f"{_(prompt)}:", headline=_("decide"), input_type=InputType.long_text)  # glue: trailing colon, not a sentence


def get_to_know(person) -> None:
    person.name = io_read(_("How do you want to be called?"), headline=_("get to know"), input_type=InputType.text) or _("them")


def ask(person, about, *, returns: InputType = InputType.enter):
    """Pose a question to someone — fill in what they've already told you."""
    # `about` is normally a script-authored template and stays English (no catalog
    # match); wrapping the raw template before `.format()` is a safe no-op then,
    # same reasoning as do()'s `action`.
    raw = io_read(
        _(about).format(name=person, first=person.first_thing, last=person.last_thing),
        headline=_("ask {person}", person=person),
        input_type=returns,
    )
    if returns == InputType.yn:
        return raw.strip().lower() == "y"
    return raw


def listen_to(person) -> str:
    """Catch one thing they just said and keep it on the person."""
    thing = io_read(_("What did {person} say?\nIn 2-3 words.", person=person),
                     headline=_("listen"), input_type=InputType.text) or _("that")
    person.mentioned.append(thing)
    return thing


def tell(person, what) -> None:
    """Say something to them, in your own words."""
    say(_("Tell {person}: {what}", person=person, what=what), headline="tell")  # say() wraps headline itself


def assess_vibe(signal):
    """Assess a signal for the whole situation — everyone included."""
    from social_script.environment import everyone
    return assess_external(everyone, signal)
