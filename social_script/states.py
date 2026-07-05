"""Inner state signals – what the body and mind can be assessed for."""

from enum import Enum
from social_script._internal.driver import InputType
from social_script._internal.i18n import _


class State(Enum):
    fear                      = ("How afraid is {entity}?", "Are you afraid?", InputType.scale)
    readiness_for_interaction = ("How ready is {entity} for interaction?", "Are you ready for interaction?", InputType.scale)
    tiredness                 = ("How tired is {entity}?", "Are you tired?", InputType.scale)
    willingness_to_continue   = ("Is {entity} still willing to continue?", "Are you still willing to continue?", InputType.yn)
    initiativeness            = ("Is {entity} in the mood to approach strangers today?", "Are you in the mood to approach strangers today?", InputType.yn)

    def __init__(self, template, self_template, input_type):
        self.template = template
        self.self_template = self_template
        self.input_type = input_type

    def question(self, entity=None) -> str:
        if entity is None:
            return _(self.self_template)
        entity_label = getattr(entity, "label", f"this {type(entity).__name__.lower()}")
        return _(self.template, entity=_(entity_label))


# expose states as top-level names so scripts read naturally: assess_internal(fear)
fear = State.fear
readiness_for_interaction = State.readiness_for_interaction
tiredness = State.tiredness
willingness_to_continue = State.willingness_to_continue
initiativeness = State.initiativeness
