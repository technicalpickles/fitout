import { describe, it, expect } from 'vitest';
import { compareVersions, findOutdatedPlugins } from './update.js';
import { InstalledPlugin } from './claude.js';
import { AvailablePlugin } from './marketplace.js';

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.1.3', '2.1.3')).toBe(0);
  });

  it('returns -1 when first is less than second', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
  });

  it('returns 1 when first is greater than second', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it('handles versions with different lengths', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0')).toBe(1);
  });
});

describe('findOutdatedPlugins', () => {
  const projectPath = '/test/project';

  it('returns empty array when no plugins are outdated', () => {
    const installed: InstalledPlugin[] = [
      { id: 'foo@bar', version: '1.0.0', scope: 'local', enabled: true, projectPath },
    ];
    const available: AvailablePlugin[] = [
      { id: 'foo@bar', version: '1.0.0', marketplace: 'bar' },
    ];

    const result = findOutdatedPlugins(installed, available, projectPath);

    expect(result).toEqual([]);
  });

  it('finds outdated plugins', () => {
    const installed: InstalledPlugin[] = [
      { id: 'foo@bar', version: '1.0.0', scope: 'local', enabled: true, projectPath },
    ];
    const available: AvailablePlugin[] = [
      { id: 'foo@bar', version: '2.0.0', marketplace: 'bar' },
    ];

    const result = findOutdatedPlugins(installed, available, projectPath);

    expect(result).toEqual([
      {
        id: 'foo@bar',
        installedVersion: '1.0.0',
        availableVersion: '2.0.0',
        scope: 'local',
        projectPath,
      },
    ]);
  });

  it('only checks plugins for the specified project', () => {
    const installed: InstalledPlugin[] = [
      { id: 'foo@bar', version: '1.0.0', scope: 'local', enabled: true, projectPath },
      {
        id: 'foo@bar',
        version: '1.0.0',
        scope: 'local',
        enabled: true,
        projectPath: '/other/project',
      },
    ];
    const available: AvailablePlugin[] = [
      { id: 'foo@bar', version: '2.0.0', marketplace: 'bar' },
    ];

    const result = findOutdatedPlugins(installed, available, projectPath);

    expect(result).toHaveLength(1);
    expect(result[0].projectPath).toBe(projectPath);
  });

  it('ignores plugins not in marketplace', () => {
    const installed: InstalledPlugin[] = [
      { id: 'unknown@bar', version: '1.0.0', scope: 'local', enabled: true, projectPath },
    ];
    const available: AvailablePlugin[] = [];

    const result = findOutdatedPlugins(installed, available, projectPath);

    expect(result).toEqual([]);
  });

  it('ignores user and global scope plugins', () => {
    const installed: InstalledPlugin[] = [
      { id: 'foo@bar', version: '1.0.0', scope: 'user', enabled: true },
      { id: 'baz@bar', version: '1.0.0', scope: 'global', enabled: true },
    ];
    const available: AvailablePlugin[] = [
      { id: 'foo@bar', version: '2.0.0', marketplace: 'bar' },
      { id: 'baz@bar', version: '2.0.0', marketplace: 'bar' },
    ];

    const result = findOutdatedPlugins(installed, available, projectPath);

    expect(result).toEqual([]);
  });

  it('handles multiple outdated plugins', () => {
    const installed: InstalledPlugin[] = [
      { id: 'foo@bar', version: '1.0.0', scope: 'local', enabled: true, projectPath },
      { id: 'baz@bar', version: '2.0.0', scope: 'local', enabled: true, projectPath },
      { id: 'qux@bar', version: '3.0.0', scope: 'local', enabled: true, projectPath },
    ];
    const available: AvailablePlugin[] = [
      { id: 'foo@bar', version: '1.1.0', marketplace: 'bar' },
      { id: 'baz@bar', version: '2.0.0', marketplace: 'bar' }, // not outdated
      { id: 'qux@bar', version: '4.0.0', marketplace: 'bar' },
    ];

    const result = findOutdatedPlugins(installed, available, projectPath);

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toContain('foo@bar');
    expect(result.map((p) => p.id)).toContain('qux@bar');
    expect(result.map((p) => p.id)).not.toContain('baz@bar');
  });
});
