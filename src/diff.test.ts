import { describe, it, expect } from 'vitest';
import { diffPlugins, diffPluginsResolved, PluginDiff, PluginDiffResolved } from './diff.js';
import { ResolvedPlugin } from './profiles.js';
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

describe('diffPluginsResolved', () => {
  const projectPath = '/test/project';

  it('tracks provenance for missing plugins', () => {
    const desired: ResolvedPlugin[] = [
      { id: 'plugin-a@registry', source: 'default', constraint: null },
      { id: 'plugin-b@registry', source: 'project', constraint: null },
    ];
    const installed: InstalledPlugin[] = [];

    const result = diffPluginsResolved(desired, installed, projectPath);

    expect(result.missing).toEqual([
      { id: 'plugin-a@registry', source: 'default', constraint: null },
      { id: 'plugin-b@registry', source: 'project', constraint: null },
    ]);
  });

  it('tracks provenance for present plugins', () => {
    const desired: ResolvedPlugin[] = [
      { id: 'plugin-a@registry', source: 'backend', constraint: null },
    ];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
    ];

    const result = diffPluginsResolved(desired, installed, projectPath);

    expect(result.present).toEqual([
      expect.objectContaining({ id: 'plugin-a@registry', source: 'backend' }),
    ]);
  });

  it('passes through constraint from resolved plugins', () => {
    const desired: ResolvedPlugin[] = [
      { id: 'plugin-a@registry', source: 'default', constraint: '1.0.0' },
    ];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
    ];

    const result = diffPluginsResolved(desired, installed, projectPath);

    expect(result.present[0].constraint).toBe('1.0.0');
  });
});
