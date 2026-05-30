"""What external people and groups are doing – observable activities in the environment."""

from enum import Enum, auto


class Activity(Enum):
    conversing = auto()
    gaming = auto()
    other = auto()


activity = Activity
