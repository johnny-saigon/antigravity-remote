#!/usr/bin/env bash
# Antigravity Remote — Hooks Bridge (`PreToolUse`, `PostToolUse`, `Stop`)
# Forwards real-time Antigravity IDE / CLI hook events to the local microserver on 127.0.0.1:8787

set +e

EVENT_NAME="${1:-PostToolUse}"
WEBHOOK_URL="${ANTIGRAVITY_WEBHOOK_URL:-http://127.0.0.1:8787/antigravity/api/webhooks/antigravity}"

STDIN_PAYLOAD=""
if [ ! -t 0 ]; then
  STDIN_PAYLOAD="$(cat 2>/dev/null || true)"
fi

if [ -z "$STDIN_PAYLOAD" ]; then
  PAYLOAD="{\"hook_event_name\":\"${EVENT_NAME}\",\"cwd\":\"$(pwd)\"}"
else
  if command -v jq >/dev/null 2>&1; then
    PAYLOAD="$(echo "$STDIN_PAYLOAD" | jq -c --arg ev "$EVENT_NAME" --arg cwd "$(pwd)" '. + {hook_event_name: (.hook_event_name // $ev), cwd: (.cwd // $cwd)}' 2>/dev/null || echo "$STDIN_PAYLOAD")"
  else
    PAYLOAD="$STDIN_PAYLOAD"
  fi
fi

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  --max-time 2 \
  -d "$PAYLOAD" >/dev/null 2>&1 &

if [ "$EVENT_NAME" = "PostToolUse" ]; then
  echo '{}'
else
  echo '{"decision": "allow"}'
fi
exit 0
