import { describe, it, expect, vi } from 'vitest';
import { parsePluginList, InstalledPlugin } from './claude.js';

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
