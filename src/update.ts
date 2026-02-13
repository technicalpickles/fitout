import { execFileSync } from 'node:child_process';
import { InstalledPlugin, claudeEnv } from './claude.js';
import { AvailablePlugin } from './marketplace.js';

export interface OutdatedPlugin {
  id: string;
  installedVersion: string;
  availableVersion: string;
  scope: 'local' | 'user' | 'global';
  projectPath?: string;
}

/**
 * Compare semver versions. Returns:
 * -1 if a < b
 *  0 if a == b
 *  1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string): number[] => {
    return v.split('.').map((n) => parseInt(n, 10) || 0);
  };

  const aParts = parseVersion(a);
  const bParts = parseVersion(b);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }

  return 0;
}

export function findOutdatedPlugins(
  installed: InstalledPlugin[],
  available: AvailablePlugin[],
  projectPath: string
): OutdatedPlugin[] {
  const availableMap = new Map(available.map((p) => [p.id, p]));
  const outdated: OutdatedPlugin[] = [];

  // Filter to local plugins for this project
  const localPlugins = installed.filter(
    (p) => p.scope === 'local' && p.projectPath === projectPath
  );

  for (const plugin of localPlugins) {
    const avail = availableMap.get(plugin.id);
    if (!avail) continue;

    // Skip if either version is missing
    if (!plugin.version || !avail.version) continue;

    if (compareVersions(plugin.version, avail.version) < 0) {
      outdated.push({
        id: plugin.id,
        installedVersion: plugin.version,
        availableVersion: avail.version,
        scope: plugin.scope,
        projectPath: plugin.projectPath,
      });
    }
  }

  return outdated;
}

export function updatePlugin(pluginId: string, scope: 'local' | 'user' = 'local'): void {
  execFileSync('claude', ['plugin', 'update', pluginId, '--scope', scope], {
    encoding: 'utf-8',
    env: claudeEnv(),
    stdio: 'inherit',
  });
}

export interface UpdateOptions {
  refresh?: boolean;
  dryRun?: boolean;
}

export interface UpdateResult {
  output: string;
  exitCode: number;
  pluginsToUpdate: OutdatedPlugin[];
}

export function runUpdate(
  projectPath: string,
  installed: InstalledPlugin[],
  available: AvailablePlugin[],
  pluginIds: string[],
  options: UpdateOptions = {}
): UpdateResult {
  const outdated = findOutdatedPlugins(installed, available, projectPath);

  // Filter to specific plugins if provided
  const toUpdate = pluginIds.length > 0
    ? outdated.filter((p) => pluginIds.includes(p.id))
    : outdated;

  // Check if any specified plugins weren't found
  if (pluginIds.length > 0) {
    const outdatedIds = new Set(outdated.map((p) => p.id));
    const installedIds = new Set(
      installed
        .filter((p) => p.scope === 'local' && p.projectPath === projectPath)
        .map((p) => p.id)
    );

    for (const id of pluginIds) {
      if (!installedIds.has(id)) {
        return {
          output: `Error: Plugin "${id}" not installed`,
          exitCode: 1,
          pluginsToUpdate: [],
        };
      }
      if (!outdatedIds.has(id)) {
        const plugin = installed.find(
          (p) => p.id === id && p.scope === 'local' && p.projectPath === projectPath
        );
        return {
          output: `✓ ${id} is already up-to-date (v${plugin?.version})`,
          exitCode: 0,
          pluginsToUpdate: [],
        };
      }
    }
  }

  if (toUpdate.length === 0) {
    return {
      output: 'All plugins are up-to-date.',
      exitCode: 0,
      pluginsToUpdate: [],
    };
  }

  if (options.dryRun) {
    const lines = [`Would update ${toUpdate.length} plugin${toUpdate.length > 1 ? 's' : ''}:`];
    for (const plugin of toUpdate) {
      lines.push(`  ↑ ${plugin.id} v${plugin.installedVersion} → v${plugin.availableVersion}`);
    }
    return {
      output: lines.join('\n'),
      exitCode: 0,
      pluginsToUpdate: [],
    };
  }

  return {
    output: `Updating ${toUpdate.length} outdated plugin${toUpdate.length > 1 ? 's' : ''}...`,
    exitCode: 0,
    pluginsToUpdate: toUpdate,
  };
}
