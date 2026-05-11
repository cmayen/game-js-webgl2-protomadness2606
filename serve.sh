#!/bin/bash
# Don't use this for public hosting! This is just a local test.
cd "$(dirname "$0")/public"
python3 -m http.server 8000
