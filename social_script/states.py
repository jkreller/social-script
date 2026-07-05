"""Inner state signals – what the body and mind can be assessed for."""

from enum import Enum
from social_script._internal.driver import InputType


class State(Enum):
    fear                      = ("How afraid is {entity}?", InputType.scale)
    readiness_for_interaction = ("How ready is {entity} for interaction?", InputType.scale)
    tiredness                 = ("How tired is {entity}?", InputType.scale)
    willingness_to_continue   = ("Is {entity} still willing to continue?", InputType.yn)
    initiativeness            = ("Is {entity} in the mood to approach strangers today?", InputType.yn)

    def __init__(self, template, input_type):
        self.template = template
        self.input_type = input_type

    def question(self, entity=None) -> str:
        if entity is None:
            return self.template.replace("is {entity}", "are you").replace("Is {entity}", "Are you")
        entity_label = getattr(entity, "label", f"this {type(entity).__name__.lower()}")
        return self.template.format(entity=entity_label)


# expose states as top-level names so scripts read naturally: assess_internal(fear)
fear = State.fear
readiness_for_interaction = State.readiness_for_interaction
tiredness = State.tiredness
willingness_to_continue = State.willingness_to_continue
initiativeness = State.initiativeness
