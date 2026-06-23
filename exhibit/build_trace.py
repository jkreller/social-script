#!/usr/bin/env python3
"""
Build exhibit trace JSONs from all recorded PWA runs in exhibit/executions/.

Usage:
  python exhibit/build_trace.py

Reads log.json from each subdirectory of exhibit/executions/ and writes a
matching trace.json into the same subdirectory.
"""

import sys
import json
import random
import re
import runpy
import builtins
import types
from pathlib import Path

root = Path(__file__).parent.parent
sys.path.insert(0, str(root))

import social_script
from social_script._internal.driver import (
    set_driver, clear_driver, ReplayDriver, NeedInput,
)
from social_script.exceptions import AnyException, INTERRUPT_MENU

_EXC = {c.__name__: c for c in INTERRUPT_MENU}
_PAT = re.compile(r'^(\w+)\((.*)\)$')

# Names the script gets for free (imported verbs/states/phrases + builtins).
# These are environment, not the script's own runtime variables, so we hide them.
_ENV_NAMES = set(dir(social_script)) | set(dir(builtins))


def _short(v):
    """Compact repr of a value for inline display; long values are truncated."""
    r = repr(v)
    return r if len(r) <= 80 else r[:77] + '...'


def _snapshot(f_locals):
    """The script's own variables in a frame, as display strings."""
    return {
        k: _short(v) for k, v in f_locals.items()
        if not k.startswith('__')
        and k not in _ENV_NAMES
        and not callable(v)
        and not isinstance(v, types.ModuleType)
    }


def _to_replay(answer):
    """Convert a serialized answer string to a replay value (exception or string)."""
    m = _PAT.match(answer)
    if m and m.group(1) in _EXC:
        return _EXC[m.group(1)](m.group(2))
    return answer


def build_raw_events(script_name, answers, seed=None):
    """
    Run the script with sys.settrace; return a flat list of
      {kind: 'line', line: N} and {kind: 'step', stepIndex: N}
    events in execution order.

    Mirrors run.py's pop-and-restart loop so injected exceptions that bubble
    out of the script are handled correctly.
    """
    target_path = root / 'scripts' / f'{script_name}.py'
    if not target_path.exists():
        raise FileNotFoundError(f'Script not found: {target_path}')
    target_abs = str(target_path)

    replay_answers = [_to_replay(a) for a in answers]

    while True:
        if seed is not None:
            random.seed(seed)
        events = []
        step_idx = [0]

        def tracer(frame, event, arg):
            if event == 'line' and frame.f_code.co_filename == target_abs:
                # entry-state snapshot: values as they are when this line begins
                events.append({'kind': 'line', 'line': frame.f_lineno,
                                'vars': _snapshot(frame.f_locals)})
            return tracer

        class TracingDriver(ReplayDriver):
            def input(self, *args, **kwargs):
                events.append({'kind': 'step', 'stepIndex': step_idx[0]})
                step_idx[0] += 1
                return super().input(*args, **kwargs)

        driver = TracingDriver(list(replay_answers))
        set_driver(driver)
        prev_tracer = sys.gettrace()
        sys.settrace(tracer)
        try:
            runpy.run_path(target_abs, run_name='__main__')
            break
        except NeedInput:
            break  # all answers consumed — trace is complete
        except AnyException as e:
            idx = driver.injected_exception_index
            if idx is not None and idx < len(replay_answers) and replay_answers[idx] is e:
                replay_answers.pop(idx)
                continue  # restart without this exception
            break
        except Exception:
            break
        finally:
            sys.settrace(prev_tracer)
            clear_driver()

    return events


def build_timed_trace(events, log):
    """
    Combine raw events with log timestamps to produce a timed trace.

    Each segment (lines between two step boundaries) is distributed
    linearly within the real-time window from step_answer[N] to
    step_show[N+1].  Lines before the first step use [session_start,
    step_show[0]].  Lines after the last step use [step_answer[last],
    session_end].
    """
    step_show_ts = {}
    step_answer_ts = {}
    session_start = None
    session_end = None

    for entry in log:
        t = entry['type']
        ts = entry['timestamp']
        if t == 'start':
            session_start = ts
        elif t == 'finish':
            session_end = ts
        elif t == 'step_show':
            step_show_ts[entry['stepIndex']] = ts
        elif t == 'step_answer':
            step_answer_ts[entry['stepIndex']] = ts

    if session_start is None:
        session_start = min(e['timestamp'] for e in log)
    if session_end is None:
        session_end = max(e['timestamp'] for e in log)

    # Split events into segments: each segment is (prev_step_idx, [lines])
    # prev_step_idx == -1 for the initialization block before the first step.
    segments = []
    current_lines = []
    prev_step = -1

    for evt in events:
        if evt['kind'] == 'step':
            segments.append((prev_step, current_lines))
            current_lines = []
            prev_step = evt['stepIndex']
        else:
            current_lines.append(evt)

    if current_lines:
        segments.append((prev_step, current_lines))

    timed_trace = []

    for prev_step, lines in segments:
        if not lines:
            continue

        # Determine the real-time window for this segment.
        if prev_step == -1:
            # Initialization: session start → first prompt appears
            t_start = session_start
            t_end = step_show_ts.get(0, session_start + 1000)
        else:
            # Segment runs after step prev_step's answer is given and before
            # the next prompt appears.
            t_start = step_answer_ts.get(
                prev_step,
                step_show_ts.get(prev_step, session_start),
            )
            next_step = prev_step + 1
            if next_step in step_show_ts:
                t_end = step_show_ts[next_step]
            else:
                t_end = session_end

        if t_end <= t_start:
            t_end = t_start + 500

        m = len(lines)
        for i, evt in enumerate(lines):
            t = t_start + i * (t_end - t_start) / m
            timed_trace.append({
                'time': round((t - session_start) / 1000, 3),
                'line': evt['line'],
                'vars': evt['vars'],
            })

    return timed_trace


def main():
    executions_dir = root / 'exhibit' / 'executions'

    subdirs = sorted(d for d in executions_dir.iterdir() if d.is_dir())
    if not subdirs:
        print(f'No execution directories found in {executions_dir}')
        return

    for subdir in subdirs:
        run_json_path = subdir / 'log.json'
        if not run_json_path.exists():
            print(f'SKIP {subdir.name}: no log.json found')
            continue

        with open(run_json_path) as f:
            run_data = json.load(f)

        script_name = run_data['script']
        script_path = root / 'scripts' / f'{script_name}.py'
        if not script_path.exists():
            print(f'SKIP {subdir.name}: script not found ({script_path})')
            continue

        answers = run_data['answers']
        log = run_data['log']
        seed = run_data.get('seed')

        print(f'Building trace: {subdir.name}  ({len(answers)} answers, {len(log)} log entries)')

        events = build_raw_events(script_name, answers, seed=seed)
        n_lines = sum(1 for e in events if e['kind'] == 'line')
        n_steps = sum(1 for e in events if e['kind'] == 'step')
        print(f'  Traced {n_lines} line events across {n_steps} step boundaries')

        timed_trace = build_timed_trace(events, log)
        print(f'  Built {len(timed_trace)} timed frames')

        session_start_ts = next((e['timestamp'] for e in log if e['type'] == 'start'), None)
        clip_start_entry = next((e for e in log if e['type'] == 'clip_start'), None)
        if session_start_ts and clip_start_entry:
            video_offset = round((clip_start_entry['timestamp'] - session_start_ts) / 1000, 3)
        else:
            video_offset = 0.0
        print(f'  Video offset: {video_offset}s')

        source = script_path.read_text()

        session = {
            'script': script_name,
            'source': source,
            'video_offset': video_offset,
            'timed_trace': timed_trace,
        }

        out = subdir / 'trace.json'
        with open(out, 'w') as f:
            json.dump(session, f, indent=2)

        print(f'  Written → {out}')


if __name__ == '__main__':
    main()
