#!/usr/bin/env python3
"""Populate missing answers arrays in exhibit/logs-in/*.json from step_answer events."""

import json
from pathlib import Path

logs_in = Path(__file__).parent / 'logs-in'

for path in sorted(logs_in.glob('*.json')):
    if path.name.startswith('.'):
        continue
    data = json.loads(path.read_text())
    if data.get('answers'):
        print(f'SKIP {path.name}: already has {len(data["answers"])} answers')
        continue

    answers = []
    for entry in data['log']:
        if entry['type'] == 'step_answer':
            n = entry['stepIndex']
            answers = answers[:n]
            answers.append(entry['answer'])

    data['answers'] = answers
    path.write_text(json.dumps(data, indent=2))
    print(f'OK   {path.name}: {len(answers)} answers')
