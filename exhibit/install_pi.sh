#!/usr/bin/env bash
# One-time setup: create a venv and install the exhibit's dependencies.
set -e
cd "$(dirname "$0")"

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
