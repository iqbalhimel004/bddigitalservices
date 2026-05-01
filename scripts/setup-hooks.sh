#!/bin/bash
# Setup git hooks for this project
# Run this after cloning: bash scripts/setup-hooks.sh

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel 2>/dev/null)"
HOOKS_DIR="${REPO_ROOT}/.git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "Error: Not a git repository. Run from within the project."
  exit 1
fi

echo "Installing git hooks..."

# Post-commit: auto-push to GitHub
cat > "${HOOKS_DIR}/post-commit" << 'HOOK'
#!/bin/bash
# Auto-push to GitHub after every commit (runs in background)
(bash "$(git rev-parse --show-toplevel)/scripts/github-push.sh") &
HOOK
chmod +x "${HOOKS_DIR}/post-commit"
echo "  ✓ post-commit hook installed (auto-push to GitHub)"

echo "Git hooks setup complete."
