"""People, groups, and spatial relations in the social environment."""

import random


class Person:
    # a single person in the environment — carries their name and everything
    # they've told you, so later questions can be built from their own words
    def __init__(self, number=None, name="", role=None, up_for_approaching=None):
        self.number = number
        self.name = name
        self.role = role
        self.up_for_approaching = up_for_approaching
        self.mentioned = []  # the real things they've told you, in order

    @property
    def first_thing(self):  # where the thread started
        return self.mentioned[0] if self.mentioned else "that"

    @property
    def last_thing(self):  # where it is now
        return self.mentioned[-1] if self.mentioned else "that"

    @property
    def count(self) -> int:  # one person is one head
        return 1

    def __str__(self):
        return self.name or "them"

    def __repr__(self):  # so the exhibit's variable view shows the name
        return self.name or "them"


class Group:
    # the people playing together, and whose turn it currently is
    def __init__(self, size=0):
        self.size = size
        self.people = [Person(number) for number in range(size)]
        self.current = 0  # whoever's forming the group is already holding it

    @property
    def count(self) -> int:  # how many heads in the group
        return self.size

    @property
    def current_person(self):
        return self.people[self.current]

    def next_person(self) -> None:
        self.current = (self.current + 1) % self.size

    def random_person(self):
        return random.choice(self.people)

    @property
    def people_with_roles(self):  # each person paired with their role, for choose()
        return [(person, person.role) for person in self.people]


class _Everyone:
    label = "anyone"


everyone = _Everyone()


class Distance:
    in_understanding_range = False  # close enough to be seen and noticed


def distance_of(a, b) -> Distance:
    # perceive the spatial relation between two people or groups
    return Distance()


me = Person()  # the person executing the script
