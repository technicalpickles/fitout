# Release Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up semantic-release to automatically version and publish fitout on every merge to main.

**Architecture:** Add semantic-release with plugins for changelog generation, npm publishing, and GitHub releases. Separate CI (PRs) from Release (main pushes) workflows.

**Tech Stack:** semantic-release, GitHub Actions, npm

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install semantic-release and plugins**

Run:
```bash
npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git
```

**Step 2: Verify installation**

Run:
```bash
npm ls semantic-release @semantic-release/changelog @semantic-release/git
```

Expected: All three packages listed without errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add semantic-release dependencies"
```

---

### Task 2: Create Release Configuration

**Files:**
- Create: `release.config.js`

**Step 1: Create the configuration file**

Create `release.config.js` with this exact content:

```javascript
export default {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    ['@semantic-release/git', {
      assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
      message: 'chore(release): ${nextRelease.version}'
    }]
  ]
};
```

**Step 2: Verify syntax**

Run:
```bash
node -e "import('./release.config.js').then(c => console.log('Valid config:', c.default.branches))"
```

Expected: `Valid config: [ 'main' ]`

**Step 3: Commit**

```bash
git add release.config.js
git commit -m "chore: add semantic-release configuration"
```

---

### Task 3: Create Release Workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create the release workflow**

Create `.github/workflows/release.yml` with this exact content:

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run build
      - run: npm test

  release:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Step 2: Validate YAML syntax**

Run:
```bash
node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('.github/workflows/release.yml', 'utf8')); console.log('Valid YAML')" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('Valid YAML')"
```

Expected: `Valid YAML`

**Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow for semantic-release"
```

---

### Task 4: Update CI Workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Change CI to only run on pull requests**

Edit `.github/workflows/ci.yml` and replace the `on:` section:

Before:
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

After:
```yaml
on:
  pull_request:
    branches: [main]
```

**Step 2: Validate YAML syntax**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('Valid YAML')"
```

Expected: `Valid YAML`

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run CI only on pull requests

Release workflow now handles main branch pushes."
```

---

### Task 5: Dry Run Verification

**Step 1: Run semantic-release in dry-run mode**

Run:
```bash
npx semantic-release --dry-run --no-ci 2>&1 | head -50
```

Expected: Output showing semantic-release analyzing commits. May show "no release" if no releasable commits, or show what version would be released. Should NOT show config errors.

**Step 2: Final commit with all changes**

If any uncommitted changes remain:
```bash
git status
```

If clean, proceed to create PR.

---

### Task 6: Create Pull Request

**Step 1: Push branch and create PR**

Run:
```bash
git push -u origin HEAD
```

Then create PR:
```bash
gh pr create --title "ci: add semantic-release automation" --body "$(cat <<'EOF'
## Summary

- Add semantic-release for automated versioning and publishing
- Every merge to main triggers: version bump → CHANGELOG → npm publish → GitHub release
- Conventional Commits determine version: `fix:` = patch, `feat:` = minor, `feat!:` = major

## Changes

- `release.config.js` - semantic-release configuration
- `.github/workflows/release.yml` - new workflow for main branch
- `.github/workflows/ci.yml` - now only runs on PRs
- `package.json` - added semantic-release dependencies

## Setup Required

After merging, add `NPM_TOKEN` secret to GitHub repo settings (npmjs.com → Access Tokens → Automation).

## Test Plan

- [x] `npm run build` passes
- [x] `npm test` passes
- [x] `npx semantic-release --dry-run` shows no config errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR created successfully with URL displayed.
