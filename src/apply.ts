import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot, getProfilesDir } from './context.js';
import { parseConfig, FettleConfig } from './config.js';
import { listPlugins, installPlugin } from './claude.js';
import { diffPluginsResolved } from './diff.js';
import { resolveProfiles } from './profiles.js';

export interface ApplyResult {
  installed: string[];
  failed: { id: string; error: string }[];
  alreadyPresent: string[];
}

export function formatApplyResultHook(result: ApplyResult): string {
  if (result.installed.length === 0 && result.failed.length === 0) {
    return '';
  }
  // TODO: handle installed case in next task
  return '';
}

export function formatApplyResult(result: ApplyResult): string {
  const lines: string[] = [];

  if (result.installed.length === 0 && result.failed.length === 0) {
    lines.push(`Nothing to do. ${result.alreadyPresent.length} plugins already installed.`);
    return lines.join('\n');
  }

  if (result.installed.length > 0) {
    lines.push('Installed:');
    for (const id of result.installed) {
      lines.push(`  + ${id}`);
    }
  }

  if (result.failed.length > 0) {
    lines.push('Failed:');
    for (const { id, error } of result.failed) {
      lines.push(`  ✗ ${id} - ${error}`);
    }
  }

  const summary = [
    result.installed.length > 0 ? `${result.installed.length} plugin${result.installed.length > 1 ? 's' : ''} installed` : null,
    result.failed.length > 0 ? `${result.failed.length} failed` : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary);

  return lines.join('\n');
}

export function runApply(cwd: string, options: { dryRun?: boolean; hook?: boolean } = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    // In hook mode, no config is not an error - project doesn't use Fettle
    if (options.hook) {
      return { output: '', exitCode: 0 };
    }
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }

  const projectRoot = resolveProjectRoot(cwd);
  let configContent: string;
  let config: FettleConfig;
  try {
    configContent = readFileSync(configPath, 'utf-8');
    config = parseConfig(configContent);
  } catch (err) {
    return {
      output: `Failed to read config: ${err instanceof Error ? err.message : 'Unknown error'}`,
      exitCode: 1,
    };
  }

  // Resolve profiles
  const profilesDir = getProfilesDir();
  const resolution = resolveProfiles(profilesDir, config);

  if (resolution.errors.length > 0) {
    return {
      output: `Profile errors:\n${resolution.errors.map((e) => `  ✗ ${e}`).join('\n')}`,
      exitCode: 1,
    };
  }

  const installed = listPlugins();
  const diff = diffPluginsResolved(resolution.plugins, installed, projectRoot);

  if (options.dryRun) {
    if (diff.missing.length === 0) {
      return {
        output: `Context: ${projectRoot}\n\nNothing to do. ${diff.present.length} plugins already installed.`,
        exitCode: 0,
      };
    }
    const lines = [`Context: ${projectRoot}\n`, 'Would install:'];
    for (const plugin of diff.missing) {
      lines.push(`  + ${plugin.id}`);
    }
    return { output: lines.join('\n'), exitCode: 0 };
  }

  const result: ApplyResult = {
    installed: [],
    failed: [],
    alreadyPresent: diff.present.map((p) => p.id),
  };

  for (const plugin of diff.missing) {
    try {
      installPlugin(plugin.id);
      result.installed.push(plugin.id);
    } catch (err) {
      result.failed.push({ id: plugin.id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return {
    output: `Context: ${projectRoot}\n\n${formatApplyResult(result)}`,
    exitCode: result.failed.length > 0 ? 1 : 0,
  };
}
