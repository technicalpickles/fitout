import { InstalledPlugin } from './claude.js';
import { ResolvedPlugin } from './profiles.js';

export interface PluginDiff {
  missing: string[];
  extra: InstalledPlugin[];
  present: InstalledPlugin[];
}

export interface PresentPluginResolved {
  id: string;
  version: string;
  scope: 'local' | 'user' | 'global';
  enabled: boolean;
  projectPath?: string;
  source: string;
}

export interface PluginDiffResolved {
  missing: ResolvedPlugin[];
  extra: InstalledPlugin[];
  present: PresentPluginResolved[];
}

export function diffPlugins(
  desired: string[],
  installed: InstalledPlugin[],
  projectPath: string
): PluginDiff {
  // Filter to only local plugins for this project
  const localPlugins = installed.filter(
    (p) => p.scope === 'local' && p.projectPath === projectPath
  );

  const installedIds = new Set(localPlugins.map((p) => p.id));
  const desiredIds = new Set(desired);

  const missing = desired.filter((id) => !installedIds.has(id));
  const extra = localPlugins.filter((p) => !desiredIds.has(p.id));
  const present = localPlugins.filter((p) => desiredIds.has(p.id));

  return { missing, extra, present };
}

export function diffPluginsResolved(
  desired: ResolvedPlugin[],
  installed: InstalledPlugin[],
  projectPath: string
): PluginDiffResolved {
  const localPlugins = installed.filter(
    (p) => p.scope === 'local' && p.projectPath === projectPath
  );

  const installedIds = new Set(localPlugins.map((p) => p.id));
  const desiredMap = new Map(desired.map((p) => [p.id, p]));

  const missing = desired.filter((p) => !installedIds.has(p.id));
  const extra = localPlugins.filter((p) => !desiredMap.has(p.id));
  const present = localPlugins
    .filter((p) => desiredMap.has(p.id))
    .map((p) => ({
      ...p,
      source: desiredMap.get(p.id)!.source,
    }));

  return { missing, extra, present };
}
