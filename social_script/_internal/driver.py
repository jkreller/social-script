"""I/O driver abstraction – routes io_read()/io_write() to CLI or stateless web replay."""

from enum import Enum

_real_input = input
_real_print = print

_current = None


class InputType(Enum):
    enter  = "enter"
    yn     = "yn"
    scale  = "scale"
    choice = "choice"


class NeedInput(Exception):
    """Raised by ReplayDriver when the script reaches an unanswered prompt."""


class CLIDriver:
    def input(self, text="", *, headline=None, input_type=InputType.enter, choices=None):
        tag = f"[ {headline} ]  " if headline else ""
        if input_type == InputType.yn:
            hint = " (y/n) "
        elif input_type == InputType.scale:
            hint = " (1–10): "
        elif input_type == InputType.choice and choices:
            _real_print(f"{tag}{text} (1-{len(choices)}):")
            for i, c in enumerate(choices, 1):
                _real_print(f"  {i}: {c}")
            return _real_input("")
        elif input_type == InputType.choice:
            hint = " (number): "
        else:  # enter
            hint = " — press Enter "
        return _real_input(f"{tag}{text}{hint}")

    def print(self, *args, sep=" ", end="\n", file=None, flush=False):
        _real_print(*args, sep=sep, end=end, file=file, flush=flush)


class ReplayDriver:
    """Stateless step driver: replays recorded answers, aborts at the first unanswered prompt."""

    def __init__(self, answers):
        self.answers = answers
        self.i = 0
        self.next_prompt = None

    def input(self, text="", *, headline=None, input_type=InputType.enter, choices=None):
        if self.i < len(self.answers):
            value = self.answers[self.i]
            self.i += 1
            return value
        self.next_prompt = {
            "headline": headline,
            "text": text,
            "input_type": input_type.value,
            "choices": choices,
        }
        raise NeedInput(text)

    def print(self, *_):
        pass


_CLI_DRIVER = CLIDriver()


def get_driver():
    return _current or _CLI_DRIVER


def set_driver(d):
    global _current
    _current = d


def clear_driver():
    global _current
    _current = None


def io_read(text="", *, headline=None, input_type=InputType.enter, choices=None):
    return get_driver().input(text, headline=headline, input_type=input_type, choices=choices)


def io_write(*args, **kwargs):
    get_driver().print(*args, **kwargs)
