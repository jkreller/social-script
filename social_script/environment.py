"""People, groups, and spatial relations in the social environment."""


class Person:
    pass  # a single person in the environment


class Group:
    pass  # a group of people


class Distance:
    in_understanding_range = False  # close enough to be seen and noticed


def distance_of(a, b) -> Distance:
    # perceive the spatial relation between two people or groups
    return Distance()


me = Person()  # the person executing the script
