/**
 * GitHub API-based sync script.
 *
 * Strategy (fast path):
 *   1. Get existing tree SHA from GitHub's latest commit
 *   2. Upload ONLY new/changed files as blobs (diff against existing tree)
 *   3. Create updated tree + commit + update ref
 *
 * On first run (or when many files changed), falls back to uploading all files.
 *
 * Args: <localSha> <remoteSha>
 */
import { readFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { createHash } from 'crypto';

const TOKEN   = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
const OWNER   = 'iqbalhimel004';
const REPO    = 'bddigitalservices';
const API     = `https://api.github.com/repos/${OWNER}/${REPO}`;
const WORKDIR = '/home/runner/workspace';

const [,, LOCAL_SHA, REMOTE_SHA] = process.argv;

if (!TOKEN) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

const H = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept':        'application/vnd.github.v3+json',
  'Content-Type':  'application/json',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function apiPost(path, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    if (res.ok) return res.json();
    const remaining = parseInt(res.headers.get('x-ratelimit-remaining') || '100');
    if ((res.status === 403 || res.status === 429) && remaining < 10) {
      const reset = parseInt(res.headers.get('x-ratelimit-reset') || '0');
      const wait  = Math.max(reset * 1000 - Date.now(), 5000);
      console.error(`Rate limited — waiting ${Math.ceil(wait / 1000)}s…`);
      await sleep(wait + 1000);
      continue;
    }
    throw new Error(`POST ${path} ${res.status}: ${(await res.text()).slice(0, 150)}`);
  }
  throw new Error(`Max retries for POST ${path}`);
}

async function createBlob(filepath) {
  const content = readFileSync(join(WORKDIR, filepath)).toString('base64');
  const data    = await apiPost('/git/blobs', { content, encoding: 'base64' });
  return data.sha;
}

// ── main ──────────────────────────────────────────────────────────────────────

// Get all tracked files along with their local git blob SHA (content hash).
// `git ls-files -s` outputs: "<mode> <blob-sha> <stage>\t<path>"
// This lets us detect files whose CONTENT changed even if the path already
// exists on GitHub — comparing paths alone (old behavior) silently reused
// stale blobs forever for any previously-synced file.
const lsFilesOut = execSync('git -C ' + WORKDIR + ' ls-files -s', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const files = [];
const localBlobShas = new Map(); // path → local git blob sha
for (const line of lsFilesOut) {
  const tabIdx = line.indexOf('\t');
  const meta = line.slice(0, tabIdx).split(/\s+/);
  const filePath = line.slice(tabIdx + 1);
  localBlobShas.set(filePath, meta[1]);
  files.push(filePath);
}

// Get existing tree from GitHub's latest commit
let baseTreeSha = null;
const existingBlobs = new Map(); // path → sha

if (REMOTE_SHA) {
  try {
    const cRes = await fetch(`${API}/git/commits/${REMOTE_SHA}`, { headers: H });
    if (cRes.ok) {
      const cData = await cRes.json();
      baseTreeSha = cData.tree?.sha;

      const tRes = await fetch(`${API}/git/trees/${baseTreeSha}?recursive=1`, { headers: H });
      if (tRes.ok) {
        const tData = await tRes.json();
        for (const e of (tData.tree || [])) {
          if (e.type === 'blob') existingBlobs.set(e.path, e.sha);
        }
      }
    }
  } catch (e) {
    console.error('Warning: could not fetch existing tree:', e.message);
  }
}

console.log(`Existing blobs on GitHub: ${existingBlobs.size}`);
console.log(`Local files tracked:      ${files.length}`);

// Determine which files need uploading: reuse the existing GitHub blob only
// when its SHA matches the local git blob SHA (i.e. content is identical).
// Any content change — even to an already-tracked path — forces a re-upload.
const treeItems = [];
let reused = 0, uploaded = 0, failed = 0;
const toUpload = [];

for (const fp of files) {
  const localSha = localBlobShas.get(fp);
  const remoteSha = existingBlobs.get(fp);
  if (remoteSha && remoteSha === localSha) {
    treeItems.push({ path: fp, mode: '100644', type: 'blob', sha: remoteSha });
    reused++;
  } else {
    toUpload.push(fp);
  }
}

console.log(`Reusing ${reused} existing blobs, uploading ${toUpload.length} new files…`);

// Upload new/missing files in batches
const BATCH = 6;
for (let i = 0; i < toUpload.length; i += BATCH) {
  const batch   = toUpload.slice(i, i + BATCH);
  const results = await Promise.allSettled(batch.map(async fp => {
    const sha = await createBlob(fp);
    return { path: fp, mode: '100644', type: 'blob', sha };
  }));
  for (const r of results) {
    if (r.status === 'fulfilled') { treeItems.push(r.value); uploaded++; }
    else { console.error('FAIL:', r.reason?.message); failed++; }
  }
  if (toUpload.length > 20 && (i + BATCH) % 60 === 0) {
    console.log(`  Upload progress: ${Math.min(i + BATCH, toUpload.length)}/${toUpload.length}`);
  }
  if (i + BATCH < toUpload.length) await sleep(400);
}

console.log(`Upload done — reused: ${reused}, new: ${uploaded}, failed: ${failed}`);

// Create tree
const treeData = await apiPost('/git/trees', { tree: treeItems });
const treeSha  = treeData.sha;

// Create commit
const commitData = await apiPost('/git/commits', {
  message: `sync: push Replit workspace to GitHub\n\nLocal SHA: ${LOCAL_SHA}`,
  tree:    treeSha,
  parents: REMOTE_SHA ? [REMOTE_SHA] : [],
});
const newCommitSha = commitData.sha;

// Update ref
const refRes = await fetch(`${API}/git/refs/heads/main`, {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ sha: newCommitSha, force: true }),
});
if (!refRes.ok) {
  const cr = await fetch(`${API}/git/refs`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ ref: 'refs/heads/main', sha: newCommitSha }),
  });
  if (!cr.ok) { console.error('Ref update failed:', (await cr.text()).slice(0, 200)); process.exit(1); }
}

console.log(`OK:${newCommitSha.slice(0, 7)}:reused=${reused}:uploaded=${uploaded}:failed=${failed}`);
