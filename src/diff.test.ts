import { describe, it, expect } from 'vitest';
import { diffPlugins, PluginDiff } from './diff.js';
import { InstalledPlugin } from './claude.js';

describe('diffPlugins', () => {
  const projectPath = '/Users/josh/project';

  it('identifies missing plugins', () => {
    const desired = ['plugin-a@registry', 'plugin-b@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.missing).toEqual(['plugin-b@registry']);
    expect(diff.present).toHaveLength(1);
  });

  it('identifies extra plugins', () => {
    const desired = ['plugin-a@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
      { id: 'plugin-b@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.extra).toHaveLength(1);
    expect(diff.extra[0].id).toBe('plugin-b@registry');
  });

  it('ignores plugins from other projects', () => {
    const desired = ['plugin-a@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath: '/other/project' },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.missing).toEqual(['plugin-a@registry']);
  });

  it('ignores non-local scope plugins', () => {
    const desired = ['plugin-a@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'user', enabled: true },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.missing).toEqual(['plugin-a@registry']);
  });
});
