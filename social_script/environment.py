"""People, groups, and spatial relations in the social environment."""


class Person:
    # a single person in the environment — carries their name and everything
    # they've told you, so later questions can be built from their own words
    def __init__(self, name=""):
        self.name = name
        self.mentioned = []  # the real things they've told you, in order

    @property
    def first_thing(self):  # where the thread started
        return self.mentioned[0] if self.mentioned else "that"

    @property
    def last_thing(self):  # where it is now
        return self.mentioned[-1] if self.mentioned else "that"

    def __str__(self):
        return self.name or "them"

    def __repr__(self):  # so the exhibit's variable view shows the name
        return self.name or "them"


class Group:
    pass  # a group of people


class _Everyone:
    label = "everyone"


everyone = _Everyone()


class Distance:
    in_understanding_range = False  # close enough to be seen and noticed


def distance_of(a, b) -> Distance:
    # perceive the spatial relation between two people or groups
    return Distance()


me = Person()  # the person executing the script
