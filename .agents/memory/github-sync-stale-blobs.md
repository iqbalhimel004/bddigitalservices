---
name: GitHub API-sync stale blob bug
description: Why github-sync.sh reported "success" but GitHub silently never received content updates for already-tracked files
---

The custom `scripts/github-api-sync.mjs` push-only sync (used because a grafted
LFS object blocks normal `git push`) built its GitHub tree by matching files
**by path only**: if a path already existed in GitHub's tree, it reused the
old blob SHA and never re-uploaded, even when the local content had changed.
Only brand-new file paths ever got uploaded. Every sync after a file's first
appearance was a no-op for that file's content, while still logging "success".

**Why:** The tree-building loop checked `existingBlobs.has(path)` instead of
comparing content hashes, so edits to already-synced files (main-layout.tsx,
home.tsx, etc.) silently never reached GitHub for weeks even though local
Replit commits kept advancing and the sync workflow kept reporting success.

**How to apply:** The fix (already applied) compares local git blob SHA
(`git ls-files -s`) against the remote blob SHA per path and only reuses when
they match; otherwise it re-uploads. If GitHub content ever looks stale again
despite "success" logs, suspect this class of bug first — verify by diffing
a raw file fetched from the GitHub Contents API against local file content,
don't just trust the sync log or commit SHA presence.

Separately: `GITHUB_TOKEN` secret expired/was invalid; the script now
prefers `GITHUB_PERSONAL_ACCESS_TOKEN` first, falling back to `GITHUB_TOKEN`.
