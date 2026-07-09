#!/bin/bash
# GitHub Auto-Sync Script (API-based push-only mode)
# Uses GitHub API to push Replit commits — standard git push is blocked
# because Replit's internal gitsafe LFS contains a grafted object (63c19a6)
# that GitHub cannot receive.

BRANCH="main"
INTERVAL=300  # 5 minutes
GITHUB_OWNER="iqbalhimel004"
GITHUB_REPO="bddigitalservices"
GITHUB_API="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}"
WORKDIR="/home/runner/workspace"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

GITHUB_TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN:-$GITHUB_TOKEN}"
SYNC_STATUS_FILE="${SYNC_STATUS_FILE:-$WORKDIR/.sync-status.json}"
MAX_EVENTS=50

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

record_event() {
  local status="$1"
  local message="$2"
  local ts
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  node -e "
    const fs = require('fs');
    const ev = { status: '$status', message: process.argv[1], createdAt: '$ts' };
    let arr = [];
    try { arr = JSON.parse(fs.readFileSync('$SYNC_STATUS_FILE', 'utf8')); } catch {}
    arr = [ev, ...arr].slice(0, $MAX_EVENTS);
    fs.writeFileSync('$SYNC_STATUS_FILE', JSON.stringify(arr));
  " "$message" 2>/dev/null || true
}

get_remote_sha() {
  curl -sf \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "${GITHUB_API}/git/ref/heads/${BRANCH}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const o=JSON.parse(d);process.stdout.write(o.object?.sha||'');}catch{}})" \
    2>/dev/null
}

log "GitHub Auto-Sync started (interval: ${INTERVAL}s, API-based)"

while true; do
  if [ -z "$GITHUB_TOKEN" ]; then
    log "GITHUB_TOKEN not set — skipping"
    record_event "failure" "GITHUB_TOKEN not set"
    sleep "$INTERVAL"
    continue
  fi

  LOCAL=$(git -C "$WORKDIR" rev-parse HEAD 2>/dev/null)
  REMOTE=$(get_remote_sha)
  SHORT=$(git -C "$WORKDIR" rev-parse --short HEAD 2>/dev/null)

  if [ -z "$REMOTE" ]; then
    log "Cannot reach GitHub API — check token/network"
    record_event "failure" "Cannot reach GitHub API"
    sleep "$INTERVAL"
    continue
  fi

  if [ "$LOCAL" = "$REMOTE" ]; then
    log "Already in sync with GitHub ($SHORT)"
    record_event "success" "Already in sync with GitHub ($SHORT)"
  else
    log "New commit detected ($SHORT). Syncing via GitHub API..."
    RESULT=$(node "$SCRIPT_DIR/github-api-sync.mjs" "$LOCAL" "$REMOTE" 2>&1)
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ] && echo "$RESULT" | grep -q "^OK:"; then
      DETAIL=$(echo "$RESULT" | grep "^OK:")
      log "Synced to GitHub — $DETAIL"
      record_event "success" "Successfully synced to GitHub ($SHORT)"
    else
      ERR=$(echo "$RESULT" | tail -3 | tr '\n' ' ')
      log "Sync failed: $ERR"
      record_event "failure" "Sync failed: $ERR"
    fi
  fi

  sleep "$INTERVAL"
done
