#!/bin/bash
# GitHub Auto-Sync Script
# Runs on a loop to pull new changes from GitHub into Replit
# and push new Replit commits back to GitHub.
# Token is injected at fetch/pull/push time via GIT_ASKPASS — never stored in remote URL

BRANCH="main"
INTERVAL=300  # 5 minutes

# Support GITHUB_TOKEN (primary) or GITHUB_PERSONAL_ACCESS_TOKEN (fallback)
GITHUB_TOKEN="${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}"

# File where sync events are persisted so the admin dashboard can display them
SYNC_STATUS_FILE="${SYNC_STATUS_FILE:-/home/runner/workspace/.sync-status.json}"
MAX_EVENTS=50

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Append a sync event to the status file.
# Usage: record_event <status> <message>
# status: success | failure | skipped
record_event() {
  local status="$1"
  local message="$2"
  local ts
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

  local new_event
  new_event="$(jq -n --arg status "$status" --arg message "$message" --arg ts "$ts" \
    '{status: $status, message: $message, createdAt: $ts}')"

  if [ -f "$SYNC_STATUS_FILE" ]; then
    local updated
    updated="$(jq --argjson ev "$new_event" --argjson max "$MAX_EVENTS" \
      '. as $arr | [$ev] + $arr | .[:$max]' "$SYNC_STATUS_FILE" 2>/dev/null)" || updated="[$new_event]"
    echo "$updated" > "$SYNC_STATUS_FILE"
  else
    echo "[$new_event]" > "$SYNC_STATUS_FILE"
  fi
}

# Ensure origin points to clean URL (no token embedded)
setup_remote() {
  git remote set-url origin "https://github.com/iqbalhimel004/bddigitalservices.git" 2>/dev/null || \
  git remote add origin "https://github.com/iqbalhimel004/bddigitalservices.git" 2>/dev/null
}

# Create a temporary ASKPASS helper to supply credentials securely
make_askpass() {
  local tmp
  tmp="$(mktemp /tmp/git-askpass-XXXXX.sh)"
  printf '#!/bin/bash\necho "%s"\n' "${GITHUB_TOKEN}" > "$tmp"
  chmod +x "$tmp"
  echo "$tmp"
}

log "GitHub Auto-Sync started (interval: ${INTERVAL}s)"
setup_remote

while true; do
  if [ -z "$GITHUB_TOKEN" ]; then
    log "GITHUB_TOKEN not set — skipping sync"
    record_event "failure" "GITHUB_TOKEN not set — sync skipped"
    sleep "$INTERVAL"
    continue
  fi

  ASKPASS_SCRIPT="$(make_askpass)"

  # Fetch latest from GitHub (non-destructive)
  if GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_SCRIPT" \
     git fetch origin "$BRANCH" --quiet 2>/dev/null; then

    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null)

    if [ "$LOCAL" = "$REMOTE" ]; then
      log "Already in sync with GitHub ($(git rev-parse --short HEAD))"
      record_event "success" "Already in sync with GitHub ($(git rev-parse --short HEAD))"

    elif git merge-base --is-ancestor "$REMOTE" "$LOCAL" 2>/dev/null; then
      # Local is ahead of remote — push Replit commits to GitHub
      log "Local has new commits not on GitHub. Pushing..."
      if GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_SCRIPT" \
         git push origin "$BRANCH" --quiet 2>/dev/null; then
        log "Successfully pushed to GitHub ($(git rev-parse --short HEAD))"
        record_event "success" "Successfully pushed to GitHub ($(git rev-parse --short HEAD))"
      else
        log "Push failed — check GITHUB_TOKEN permissions."
        record_event "failure" "Push to GitHub failed — check GITHUB_TOKEN permissions"
      fi

    elif git merge-base --is-ancestor "$LOCAL" "$REMOTE" 2>/dev/null; then
      # Remote is ahead of local — pull GitHub commits into Replit
      if git diff --quiet && git diff --cached --quiet; then
        log "New commits detected on GitHub. Pulling..."
        if GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_SCRIPT" \
           git pull origin "$BRANCH" --ff-only --quiet 2>/dev/null; then
          log "Successfully synced from GitHub ($(git rev-parse --short HEAD))"
          record_event "success" "Successfully synced from GitHub ($(git rev-parse --short HEAD))"
        else
          log "Pull failed (non-fast-forward). Manual merge may be needed."
          record_event "failure" "Pull failed (non-fast-forward) — manual merge may be needed"
        fi
      else
        log "Skipping pull — working tree has uncommitted changes."
        record_event "skipped" "Pull skipped — working tree has uncommitted changes"
      fi

    else
      # Histories have diverged — attempt rebase to resolve automatically
      log "Histories have diverged. Attempting rebase of local commits onto GitHub..."
      if git diff --quiet && git diff --cached --quiet; then
        REBASE_ERR_FILE="$(mktemp /tmp/git-rebase-err-XXXXX.txt)"
        if GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_SCRIPT" \
           git rebase "origin/$BRANCH" --quiet 2>"$REBASE_ERR_FILE"; then
          log "Rebase succeeded. Pushing rebased commits to GitHub..."
          if GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_SCRIPT" \
             git push origin "$BRANCH" --quiet 2>/dev/null; then
            log "Successfully pushed rebased commits to GitHub ($(git rev-parse --short HEAD))"
            record_event "success" "Rebase succeeded and rebased commits pushed to GitHub ($(git rev-parse --short HEAD))"
          else
            log "Rebase succeeded but push failed — check GITHUB_TOKEN permissions or whether the remote has been updated since the last fetch."
            record_event "failure" "Rebase succeeded but push failed — check GITHUB_TOKEN permissions"
          fi
        else
          # Rebase could not resolve conflicts automatically — abort cleanly
          git rebase --abort 2>/dev/null
          REBASE_ERR=$(head -5 "$REBASE_ERR_FILE" 2>/dev/null)
          log "Rebase could not resolve conflicts automatically. Aborted without data loss."
          log "To fix manually: git fetch origin && git rebase origin/$BRANCH && git rebase --continue"
          [ -n "$REBASE_ERR" ] && log "Rebase error: $REBASE_ERR"
          record_event "failure" "Histories diverged and rebase failed — manual resolution needed"
        fi
        rm -f "$REBASE_ERR_FILE"
      else
        log "Diverged histories but working tree has uncommitted changes — skipping rebase. Commit or stash changes first."
        record_event "failure" "Histories diverged and working tree has uncommitted changes — commit or stash first"
      fi
    fi
  else
    log "Fetch failed — check GITHUB_TOKEN and network."
    record_event "failure" "Fetch from GitHub failed — check GITHUB_TOKEN and network"
  fi

  rm -f "$ASKPASS_SCRIPT"
  sleep "$INTERVAL"
done
