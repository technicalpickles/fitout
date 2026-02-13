import { describe, it, expect, vi } from 'vitest';
import { parsePluginList, InstalledPlugin, claudeEnv } from './claude.js';

describe('claudeEnv', () => {
  it('strips CLAUDECODE from the environment', () => {
    const original = process.env.CLAUDECODE;
    process.env.CLAUDECODE = '1';
    try {
      const env = claudeEnv();
      expect(env.CLAUDECODE).toBeUndefined();
      // Other env vars are preserved
      expect(env.PATH).toBe(process.env.PATH);
    } finally {
      if (original !== undefined) {
        process.env.CLAUDECODE = original;
      } else {
        delete process.env.CLAUDECODE;
      }
    }
  });

  it('returns a copy, not the original process.env', () => {
    const env = claudeEnv();
    env.SOME_TEST_VAR = 'test';
    expect(process.env.SOME_TEST_VAR).toBeUndefined();
  });
});

describe('parsePluginList', () => {
  it('parses JSON plugin list output', () => {
    const json = JSON.stringify([
      {
        id: 'superpowers@superpowers-marketplace',
        version: '4.0.3',
        scope: 'local',
        enabled: true,
        projectPath: '/Users/josh/project',
      },
    ]);

    const result = parsePluginList(json);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('superpowers@superpowers-marketplace');
    expect(result[0].scope).toBe('local');
  });

  it('returns empty array for empty JSON array', () => {
    const result = parsePluginList('[]');
    expect(result).toEqual([]);
  });
});
