#!/usr/bin/env python3
"""Parse old Social Script .txt session logs into the current JSON log format.

Usage:
    python parse_log.py <log.txt> [output.json]

If output path is omitted the JSON is written to stdout.

What is approximated / lost:
  - prompt.headline → always null
  - prompt.choices  → always null
  - enter answers   → always "" (displayed as "(continue)", actual value lost)
  - cameraOn        → always true
  - answers []      → always []
  - prompt.text     → kept as-is; may be truncated at 47 chars + … if original > 50
  - exceptionLabel in exception (raised) → recovered from the preceding exception_select
  - back entries    → silently dropped (treated as the step just staying longer)
"""

import json
import re
import sys
from datetime import datetime

_ENTRY_START = re.compile(r'^\[(\+\d+:\d{2}:\d{2})\]  ')


def _parse_elapsed(s: str) -> int:
    h, m, sec = (int(x) for x in s.lstrip('+').split(':'))
    return (h * 3600 + m * 60 + sec) * 1000


def _parse_iso_ts(s: str) -> int:
    s = s.strip()
    if s.endswith('Z'):
        s = s[:-1] + '+00:00'
    return int(datetime.fromisoformat(s).timestamp() * 1000)


def _parse_header(text: str) -> dict:
    result: dict = {}
    for line in text.split('\n'):
        if line.startswith('User:'):
            result['userName'] = line[5:].strip()
        elif line.startswith('Script:'):
            result['script'] = line[7:].strip()
        elif line.startswith('Version:'):
            result['version'] = line[8:].strip()
        elif line.startswith('Tags:'):
            raw = line[5:].strip()
            result['tags'] = [t.strip() for t in raw.split(',')] if raw else []
        elif line.startswith('Started:'):
            result['startTime'] = _parse_iso_ts(line[8:])
        elif line.startswith('Finished:'):
            result['finishTime'] = _parse_iso_ts(line[9:])
    return result


def _split_entries(log_body: str) -> list:
    """Split log body into entry strings, joining continuation lines (newlines in text)."""
    entries = []
    current = None
    for line in log_body.split('\n'):
        if _ENTRY_START.match(line):
            if current is not None:
                entries.append(current)
            current = line
        elif current is not None and line.strip():
            current += '\n' + line
    if current is not None:
        entries.append(current)
    return entries


def _decode_answer(input_type: str, displayed: str) -> str:
    displayed = displayed.strip()
    if input_type == 'enter':
        return ''
    if input_type == 'yn':
        return 'y' if displayed == 'Yes' else 'n'
    if input_type == 'choice':
        return displayed.split(' ')[0]
    return displayed  # scale: numeric string as-is


def _parse_entries(entries: list, start_ts: int) -> list:
    log = []
    last_exception_label: dict = {}  # name → label, to fill exception_raise entries

    for raw in entries:
        m = _ENTRY_START.match(raw)
        ts = start_ts + _parse_elapsed(m.group(1))
        body = raw[m.end():]

        if body == 'START':
            log.append({'type': 'start', 'timestamp': ts})

        elif body == 'DONE':
            log.append({'type': 'finish', 'timestamp': ts})

        elif body.startswith('↩'):
            pass  # back entry — silently dropped

        elif body.startswith('Exception selected:'):
            pm = re.match(
                r'Exception selected: (\S+)  \|  exception  \|  "(.*)"',
                body, re.DOTALL,
            )
            if pm:
                name, label = pm.group(1), pm.group(2)
                last_exception_label[name] = label
                log.append({
                    'type': 'exception_select',
                    'timestamp': ts,
                    'exceptionName': name,
                    'exceptionLabel': label,
                })

        elif body.startswith('Exception raised:'):
            pm = re.match(
                r'Exception raised: (\S+)  \|  exception  \|  "(.*)"  →  \((.*?)\)',
                body, re.DOTALL,
            )
            if pm:
                name, note, decision = pm.group(1), pm.group(2), pm.group(3)
                log.append({
                    'type': 'exception',
                    'timestamp': ts,
                    'exceptionName': name,
                    'exceptionLabel': last_exception_label.get(name, ''),
                    'note': note,
                    'decision': decision,
                })

        elif 'appeared' in body:
            pm = re.match(
                r'Step ( *\d+) appeared  \|  (\w+) +\|  "(.*)"',
                body, re.DOTALL,
            )
            if pm:
                step_index = int(pm.group(1).strip()) - 1
                input_type = pm.group(2)
                log.append({
                    'type': 'step_show',
                    'timestamp': ts,
                    'stepIndex': step_index,
                    'prompt': {
                        'headline': None,
                        'text': pm.group(3),
                        'input_type': input_type,
                        'choices': None,
                    },
                })

        elif 'answered' in body:
            pm = re.match(
                r'Step ( *\d+) answered  \|  (\w+) +\|  "(.*)"  →  (.*)',
                body, re.DOTALL,
            )
            if pm:
                step_index = int(pm.group(1).strip()) - 1
                input_type = pm.group(2)
                answer = _decode_answer(input_type, pm.group(4))
                log.append({
                    'type': 'step_answer',
                    'timestamp': ts,
                    'stepIndex': step_index,
                    'prompt': {
                        'headline': None,
                        'text': pm.group(3),
                        'input_type': input_type,
                        'choices': None,
                    },
                    'answer': answer,
                })

    return log


def parse_log_file(path: str) -> dict:
    with open(path, encoding='utf-8') as f:
        content = f.read()

    header_text, _, log_body = content.partition('--- Log ---')
    header = _parse_header(header_text)
    entries = _split_entries(log_body)
    log = _parse_entries(entries, header['startTime'])

    return {
        'screen': 'done',
        'script': header.get('script', ''),
        'version': header.get('version', ''),
        'tags': header.get('tags', []),
        'userName': header.get('userName', ''),
        'cameraOn': True,
        'answers': [],
        'log': log,
    }


def main():
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <log.txt> [output.json]', file=sys.stderr)
        sys.exit(1)

    result = parse_log_file(sys.argv[1])
    output = json.dumps(result, indent=2, ensure_ascii=False)

    if len(sys.argv) >= 3:
        with open(sys.argv[2], 'w', encoding='utf-8') as f:
            f.write(output)
        print(f'Written to {sys.argv[2]}')
    else:
        print(output)


if __name__ == '__main__':
    main()
