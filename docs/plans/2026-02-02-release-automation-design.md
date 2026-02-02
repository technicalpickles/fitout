# Release Automation Design

## Goal

Every merge to main automatically versions and publishes fitout based on commit messages.

## Decisions

| Decision | Choice |
|----------|--------|
| Trigger | Merge to main |
| Commit convention | Conventional Commits |
| CHANGELOG | Auto-generated |
| Publish targets | npm + GitHub Releases |
| Pre-1.0 behavior | Standard semver (breaking → 1.0.0) |

## Flow

```
PR merged to main
    ↓
CI runs tests
    ↓
semantic-release analyzes commits since last release
    ↓
Determines version bump (patch/minor/major)
    ↓
Updates package.json version
    ↓
Generates/updates CHANGELOG.md
    ↓
Creates git tag (v1.2.3)
    ↓
Publishes to npm
    ↓
Creates GitHub Release with notes
```

## Version Bumps

| Commit | Example | Bump |
|--------|---------|------|
| `fix:` | `fix: handle missing config` | patch (0.1.0 → 0.1.1) |
| `feat:` | `feat: add update command` | minor (0.1.0 → 0.2.0) |
| `feat!:` or `BREAKING CHANGE:` | `feat!: change config format` | major (0.1.0 → 1.0.0) |
| `docs:`, `chore:`, `ci:` | `docs: update README` | no release |

## Implementation

### Dependencies

```json
"devDependencies": {
  "semantic-release": "^24.0.0",
  "@semantic-release/changelog": "^6.0.0",
  "@semantic-release/git": "^10.0.0"
}
```

### Configuration: `release.config.js`

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

### Workflow: `.github/workflows/release.yml`

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

### Changes to `ci.yml`

Change trigger from `push: branches: [main]` to only `pull_request`:

```yaml
on:
  pull_request:
    branches: [main]
```

## Setup Steps

1. **Create npm token** — npmjs.com → Access Tokens → Automation
2. **Add secret** — GitHub repo settings → Secrets → `NPM_TOKEN`
3. **Make repo public** — required for unscoped npm package

## Notes

- First release uses current package.json version (0.1.0)
- `chore:`, `docs:`, `ci:` commits don't trigger releases
- Release commits (`chore(release): x.y.z`) don't trigger cascading releases
