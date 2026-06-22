#!/usr/bin/env python3
"""
Build exhibit session JSONs from all recorded PWA runs in exhibit/logs-in/.

Usage:
  python exhibit/build_trace.py

Reads every *.json file in exhibit/logs-in/, derives the script name from the
'script' field inside each file, and writes a matching trace to exhibit/logs-out/.
"""

import sys
import json
import re
import runpy
from pathlib import Path

root = Path(__file__).parent.parent
sys.path.insert(0, str(root))

from social_script._internal.driver import (
    set_driver, clear_driver, ReplayDriver, NeedInput,
)
from social_script.exceptions import AnyException, INTERRUPT_MENU

_EXC = {c.__name__: c for c in INTERRUPT_MENU}
_PAT = re.compile(r'^(\w+)\((.*)\)$')


def _to_replay(answer):
    """Convert a serialized answer string to a replay value (exception or string)."""
    m = _PAT.match(answer)
    if m and m.group(1) in _EXC:
        return _EXC[m.group(1)](m.group(2))
    return answer


def build_raw_events(script_name, answers):
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
        events = []
        step_idx = [0]

        def tracer(frame, event, arg):
            if event == 'line' and frame.f_code.co_filename == target_abs:
                events.append({'kind': 'line', 'line': frame.f_lineno})
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
            current_lines.append(evt['line'])

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
        for i, line in enumerate(lines):
            t = t_start + i * (t_end - t_start) / m
            timed_trace.append({
                'time': round((t - session_start) / 1000, 3),
                'line': line,
            })

    return timed_trace


def main():
    logs_in = root / 'exhibit' / 'logs-in'
    logs_out = root / 'exhibit' / 'logs-out'
    logs_out.mkdir(parents=True, exist_ok=True)

    files = sorted(f for f in logs_in.glob('*.json') if not f.name.startswith('.'))
    if not files:
        print(f'No JSON files found in {logs_in}')
        return

    for run_json_path in files:
        with open(run_json_path) as f:
            run_data = json.load(f)

        script_name = run_data['script']
        script_path = root / 'scripts' / f'{script_name}.py'
        if not script_path.exists():
            print(f'SKIP {run_json_path.name}: script not found ({script_path})')
            continue

        answers = run_data['answers']
        log = run_data['log']

        print(f'Building trace: {run_json_path.name}  ({len(answers)} answers, {len(log)} log entries)')

        events = build_raw_events(script_name, answers)
        n_lines = sum(1 for e in events if e['kind'] == 'line')
        n_steps = sum(1 for e in events if e['kind'] == 'step')
        print(f'  Traced {n_lines} line events across {n_steps} step boundaries')

        timed_trace = build_timed_trace(events, log)
        print(f'  Built {len(timed_trace)} timed frames')

        source = script_path.read_text()

        session = {
            'script': script_name,
            'source': source,
            'timed_trace': timed_trace,
        }

        out = logs_out / run_json_path.name
        with open(out, 'w') as f:
            json.dump(session, f, indent=2)

        print(f'  Written → {out}')


if __name__ == '__main__':
    main()
