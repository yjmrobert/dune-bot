#!/bin/bash
echo "Searching for dune-bot processes..."

# Find PIDs for processes matching "src/index.ts" (main entry point)
# This catches both ts-node direct execution and nodemon wrappers
PIDS=$(pgrep -f "src/index.ts")

if [ -z "$PIDS" ]; then
  echo "No running instances found."
else
  echo "Found processes with PIDS: $PIDS"
  echo "Killing processes..."
  # Use kill -9 to force kill
  kill -9 $PIDS
  echo "Successfully killed all instances."
fi
