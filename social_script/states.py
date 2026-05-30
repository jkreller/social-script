"""Inner state signals – what the body and mind can be assessed for."""

from enum import Enum


class State(Enum):
    fear                     = "How afraid is {entity}?"
    calm                     = "How calm is {entity}?"
    tension                  = "How tense is {entity}?"
    excitement               = "How excited is {entity}?"
    hesitation               = "How hesitant is {entity}?"
    readiness_for_interaction = "How ready is {entity} for interaction?"
    tiredness                = "How tired is {entity}?"

    def question(self, entity=None) -> str:
        if entity is None:
            return self.value.replace("is {entity}", "are you")
        entity_label = f"this {type(entity).__name__.lower()}"
        return self.value.format(entity=entity_label)


# expose states as top-level names so scripts read naturally: assess_internal(fear)
fear = State.fear
calm = State.calm
tension = State.tension
excitement = State.excitement
hesitation = State.hesitation
readiness_for_interaction = State.readiness_for_interaction
tiredness = State.tiredness
