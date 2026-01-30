import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';
import { FettleConfig } from './config.js';

export interface ResolvedPlugin {
  id: string;
  source: string; // "project" | profile name
}

export interface ProfileResolutionResult {
  plugins: ResolvedPlugin[];
  errors: string[];
}

export function loadProfile(profilesDir: string, name: string): string[] | null {
  const profilePath = join(profilesDir, `${name}.toml`);

  if (!existsSync(profilePath)) {
    return null;
  }

  const content = readFileSync(profilePath, 'utf-8');
  const parsed = parse(content);

  const plugins = Array.isArray(parsed.plugins)
    ? parsed.plugins.filter((p): p is string => typeof p === 'string')
    : [];

  return plugins;
}

export function resolveProfiles(
  profilesDir: string,
  config: FettleConfig
): ProfileResolutionResult {
  const errors: string[] = [];
  const pluginMap = new Map<string, ResolvedPlugin>();

  // Helper to add plugins, first source wins
  const addPlugins = (plugins: string[], source: string) => {
    for (const id of plugins) {
      if (!pluginMap.has(id)) {
        pluginMap.set(id, { id, source });
      }
    }
  };

  // 1. Auto-include default if exists
  const defaultPlugins = loadProfile(profilesDir, 'default');
  if (defaultPlugins !== null) {
    addPlugins(defaultPlugins, 'default');
  }

  // 2. Load explicit profiles
  for (const profileName of config.profiles) {
    const profilePlugins = loadProfile(profilesDir, profileName);
    if (profilePlugins === null) {
      errors.push(`Profile not found: ${profileName}`);
    } else {
      addPlugins(profilePlugins, profileName);
    }
  }

  // 3. Add project plugins
  addPlugins(config.plugins, 'project');

  return {
    plugins: Array.from(pluginMap.values()),
    errors,
  };
}
