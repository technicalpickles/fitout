import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';
import { FettleConfig } from './config.js';
import { parsePluginList, mergeConstraints } from './constraint.js';

export interface ResolvedPlugin {
  id: string;
  source: string;
  constraint: string | null;
}

export interface ConstraintOverride {
  pluginId: string;
  projectConstraint: string;
  winningConstraint: string;
  winningSource: string;
}

export interface ProfileResolutionResult {
  plugins: ResolvedPlugin[];
  errors: string[];
  constraintOverrides: ConstraintOverride[];
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
  const constraintOverrides: ConstraintOverride[] = [];
  const pluginMap = new Map<string, ResolvedPlugin>();

  // Track project constraints for override detection
  const projectConstraints = new Map<string, string>();

  // Helper to add plugins with constraint merging
  const addPlugins = (pluginStrings: string[], source: string) => {
    const parseResult = parsePluginList(pluginStrings);

    // Collect parse errors
    for (const error of parseResult.errors) {
      errors.push(`${error.input}: ${error.message}`);
    }

    for (const parsed of parseResult.plugins) {
      const existing = pluginMap.get(parsed.id);
      if (existing) {
        // Plugin exists - merge constraints (higher wins)
        const merged = mergeConstraints(existing.constraint, parsed.constraint);

        // Track if project constraint was overridden
        if (source === 'project' && parsed.constraint !== null) {
          projectConstraints.set(parsed.id, parsed.constraint);
        }

        // Check if project's constraint is being overridden by profile
        const projectConstraint = projectConstraints.get(parsed.id);
        if (
          projectConstraint &&
          existing.constraint !== null &&
          merged === existing.constraint &&
          merged !== projectConstraint
        ) {
          constraintOverrides.push({
            pluginId: parsed.id,
            projectConstraint,
            winningConstraint: merged,
            winningSource: existing.source,
          });
        }

        existing.constraint = merged;
      } else {
        pluginMap.set(parsed.id, {
          id: parsed.id,
          source,
          constraint: parsed.constraint,
        });

        // Track project constraints
        if (source === 'project' && parsed.constraint !== null) {
          projectConstraints.set(parsed.id, parsed.constraint);
        }
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
    constraintOverrides,
  };
}
