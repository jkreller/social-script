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
    def _handle_interrupt(self):
        from social_script.exceptions import AnyException, INTERRUPT_MENU
        _real_print("\n\nScript interrupted. What happened?")
        for i, cls in enumerate(INTERRUPT_MENU, 1):
            _real_print(f"  {i}: {cls.label}")
        try:
            raw = _real_input("").strip()
        except (KeyboardInterrupt, EOFError):
            raise SystemExit(0)
        exc_class = INTERRUPT_MENU[int(raw) - 1] if raw.isdigit() and 1 <= int(raw) <= len(INTERRUPT_MENU) else AnyException
        try:
            note = _real_input("Brief note (Enter to skip): ").strip()
        except (KeyboardInterrupt, EOFError):
            note = ""
        try:
            wants_to_continue = _real_input("Continue the script? (y/n) ").strip().lower() == "y"
        except (KeyboardInterrupt, EOFError):
            wants_to_continue = False
        if wants_to_continue:
            raise exc_class(note)
        else:
            handle_exception(exc_class(note))
            raise SystemExit(0)

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
            try:
                return _real_input("")
            except KeyboardInterrupt:
                self._handle_interrupt()
        elif input_type == InputType.choice:
            hint = " (number): "
        else:  # enter
            hint = " — press Enter "
        try:
            return _real_input(f"{tag}{text}{hint}")
        except KeyboardInterrupt:
            self._handle_interrupt()

    def print(self, *args, sep=" ", end="\n", file=None, flush=False):
        _real_print(*args, sep=sep, end=end, file=file, flush=flush)


class ReplayDriver:
    """Stateless step driver: replays recorded answers, injects embedded exceptions, signals the next unanswered prompt via NeedInput."""

    def __init__(self, answers):
        self.answers = answers
        self.i = 0
        self.next_prompt = None
        self.injected_exception_index = None

    def input(self, text="", *, headline=None, input_type=InputType.enter, choices=None):
        if self.i < len(self.answers):
            val = self.answers[self.i]
            idx = self.i
            self.i += 1
            if isinstance(val, BaseException):
                self.injected_exception_index = idx
                raise val
            return val
        self.next_prompt = {
            "headline": headline,
            "text": text,
            "input_type": input_type.value,
            "choices": choices,
        }
        raise NeedInput(text)

    def print(self, *_):
        pass


def handle_exception(e, final=True) -> None:
    from social_script.exceptions import AnyException
    if isinstance(e, AnyException):
        _real_print(f"\n{type(e).label}" + (f' — "{e.note}"' if e.note else ""))
        if final:
            _real_print("Take care of yourself. You can always try again.")


def get_driver():
    if _current is None:
        raise RuntimeError("No driver set — call set_driver() before running a script")
    return _current


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
