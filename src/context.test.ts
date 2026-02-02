import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { findConfigPath, resolveProjectRoot, getProfilesDir } from './context.js';

// Use this project's directory as a test fixture (it's a real git repo)
const PROJECT_ROOT = '/Users/josh.nichols/workspace/fettle';
const TEST_CONFIG_PATH = join(PROJECT_ROOT, '.claude', 'fettle.toml');

describe('resolveProjectRoot', () => {
  it('returns cwd when no git root exists', () => {
    const result = resolveProjectRoot('/tmp/not-a-repo');
    expect(result).toBe('/tmp/not-a-repo');
  });

  it('returns git root when inside a git repository', () => {
    // Test from project root
    const result = resolveProjectRoot(PROJECT_ROOT);
    expect(result).toBe(PROJECT_ROOT);
  });

  it('returns git root when called from a subdirectory', () => {
    // Test from a subdirectory (src/)
    const result = resolveProjectRoot(join(PROJECT_ROOT, 'src'));
    expect(result).toBe(PROJECT_ROOT);
  });
});

describe('findConfigPath', () => {
  // Create test config before tests that need it
  beforeAll(() => {
    const claudeDir = join(PROJECT_ROOT, '.claude');
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }
    writeFileSync(TEST_CONFIG_PATH, '# Test config\n');
  });

  // Clean up test config file after all tests
  afterAll(() => {
    if (existsSync(TEST_CONFIG_PATH)) {
      unlinkSync(TEST_CONFIG_PATH);
    }
  });

  it('returns null when no config exists', () => {
    const result = findConfigPath('/tmp/not-a-repo');
    expect(result).toBeNull();
  });

  it('returns config path when config file exists', () => {
    const result = findConfigPath(PROJECT_ROOT);
    expect(result).toBe(TEST_CONFIG_PATH);
  });

  it('finds config when searching from a subdirectory', () => {
    const result = findConfigPath(join(PROJECT_ROOT, 'src'));
    expect(result).toBe(TEST_CONFIG_PATH);
  });
});

describe('getProfilesDir', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns profiles directory under user config', () => {
    const result = getProfilesDir();
    expect(result).toBe(join(homedir(), '.config', 'fettle', 'profiles'));
  });

  it('respects FETTLE_CONFIG_HOME env var', () => {
    vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
    const result = getProfilesDir();
    expect(result).toBe('/custom/fettle/profiles');
  });
});
