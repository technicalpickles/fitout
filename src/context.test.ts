import { describe, it, expect, afterAll } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { findConfigPath, resolveProjectRoot } from './context.js';

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
    // Create test config file
    const claudeDir = join(PROJECT_ROOT, '.claude');
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }
    writeFileSync(TEST_CONFIG_PATH, '# Test config\n');

    const result = findConfigPath(PROJECT_ROOT);
    expect(result).toBe(TEST_CONFIG_PATH);
  });

  it('finds config when searching from a subdirectory', () => {
    // Config file should already exist from previous test
    // Search from src/ subdirectory - should still find .claude/fettle.toml at project root
    const result = findConfigPath(join(PROJECT_ROOT, 'src'));
    expect(result).toBe(TEST_CONFIG_PATH);
  });
});
