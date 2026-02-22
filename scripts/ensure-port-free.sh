#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-}"
MODE="${2:---kill}"

if [[ -z "$PORT" ]]; then
  echo "Usage: bash scripts/ensure-port-free.sh <port> [--kill|--fail]" >&2
  exit 1
fi

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof is required to check port usage" >&2
  exit 1
fi

pids=()
while IFS= read -r line; do
  [[ -n "$line" ]] && pids+=("$line")
done < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)

if [[ "${#pids[@]}" -eq 0 ]]; then
  exit 0
fi

if [[ "$MODE" == "--fail" ]]; then
  echo "Port $PORT is in use by PID(s): ${pids[*]}" >&2
  exit 1
fi

echo "Port $PORT is in use by PID(s): ${pids[*]}. Stopping..."

kill_tree() {
  local target_pid="$1"
  if [[ -z "$target_pid" ]]; then
    return 0
  fi

  # Try process group first (best effort), then child pids, then pid itself.
  kill -TERM "-$target_pid" 2>/dev/null || true
  pkill -TERM -P "$target_pid" 2>/dev/null || true
  kill -TERM "$target_pid" 2>/dev/null || true
}

for pid in "${pids[@]}"; do
  kill_tree "$pid"
done

sleep 2

pid_after="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$pid_after" ]]; then
  pids_after=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && pids_after+=("$line")
  done < <(printf '%s\n' "$pid_after")
  for pid in "${pids_after[@]}"; do
    kill -KILL "-$pid" 2>/dev/null || true
    pkill -KILL -P "$pid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
  done
  sleep 2
fi

pid_final="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$pid_final" ]]; then
  echo "Port $PORT is still in use by PID(s): $pid_final" >&2
  exit 1
fi
