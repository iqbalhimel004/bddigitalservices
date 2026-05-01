#!/bin/bash
# GitHub Auto-Push Script
# Called by post-commit hook to push to GitHub after every Replit checkpoint
# Token is injected at push time via GIT_ASKPASS — never stored in remote URL

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [git-push] $1" >> /tmp/github-push.log 2>&1
}

# Support GITHUB_TOKEN (primary) or GITHUB_PERSONAL_ACCESS_TOKEN (fallback)
GITHUB_TOKEN="${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}"

if [ -z "$GITHUB_TOKEN" ]; then
  log "GITHUB_TOKEN not set — skipping push"
  exit 0
fi

REPO_DIR="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel 2>/dev/null)"
cd "$REPO_DIR" || exit 0

# Ensure remote is clean URL (no token embedded)
git remote set-url origin "https://github.com/iqbalhimel/bd-digital-services.git" 2>/dev/null || \
git remote add origin "https://github.com/iqbalhimel/bd-digital-services.git" 2>/dev/null

# Create a temporary ASKPASS helper to supply credentials securely
ASKPASS_SCRIPT="$(mktemp /tmp/git-askpass-XXXXX.sh)"
cat > "$ASKPASS_SCRIPT" << ASKPASS
#!/bin/bash
echo "${GITHUB_TOKEN}"
ASKPASS
chmod +x "$ASKPASS_SCRIPT"

log "Pushing to GitHub..."
if GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_SCRIPT" \
   git push origin main --quiet 2>/dev/null; then
  log "Push successful ($(git rev-parse --short HEAD))"
else
  log "Push failed — check token permissions (repo scope required)"
fi

# Clean up temp file
rm -f "$ASKPASS_SCRIPT"
