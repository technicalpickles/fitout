import { InstalledPlugin } from './claude.js';

export interface PluginDiff {
  missing: string[];
  extra: InstalledPlugin[];
  present: InstalledPlugin[];
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
