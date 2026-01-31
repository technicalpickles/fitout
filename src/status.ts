import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot, getProfilesDir } from './context.js';
import { parseConfig, FettleConfig } from './config.js';
import { listPlugins } from './claude.js';
import { diffPlugins, PluginDiff, PluginDiffResolved, diffPluginsResolved } from './diff.js';
import { resolveProfiles } from './profiles.js';
import { colors, symbols, provenanceColor } from './colors.js';

function formatProvenance(source: string): string {
  if (source === 'project') return '';
  const colorFn = provenanceColor(source);
  return ' ' + colorFn(`(from: ${source})`);
}

export function formatStatusResolved(diff: PluginDiffResolved): string {
  const lines: string[] = [];

  for (const plugin of diff.present) {
    lines.push(`${symbols.present} ${plugin.id}${formatProvenance(plugin.source)}`);
  }

  for (const plugin of diff.missing) {
    lines.push(`${symbols.missing} ${plugin.id}${formatProvenance(plugin.source)} ${colors.error('(missing)')}`);
  }

  for (const plugin of diff.extra) {
    lines.push(`${symbols.extra} ${plugin.id} ${colors.warning('(not in config)')}`);
  }

  const summary = [
    diff.present.length > 0 ? colors.success(`${diff.present.length} present`) : null,
    diff.missing.length > 0 ? colors.error(`${diff.missing.length} missing`) : null,
    diff.extra.length > 0 ? colors.warning(`${diff.extra.length} extra`) : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary || 'No plugins configured');

  return lines.join('\n');
}

export function formatStatus(diff: PluginDiff): string {
  const lines: string[] = [];

  for (const plugin of diff.present) {
    lines.push(`${symbols.present} ${plugin.id}`);
  }

  for (const id of diff.missing) {
    lines.push(`${symbols.missing} ${id} ${colors.error('(missing)')}`);
  }

  for (const plugin of diff.extra) {
    lines.push(`${symbols.extra} ${plugin.id} ${colors.warning('(not in config)')}`);
  }

  const summary = [
    diff.present.length > 0 ? colors.success(`${diff.present.length} present`) : null,
    diff.missing.length > 0 ? colors.error(`${diff.missing.length} missing`) : null,
    diff.extra.length > 0 ? colors.warning(`${diff.extra.length} extra`) : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary || 'No plugins configured');

  return lines.join('\n');
}

export function runStatus(cwd: string): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
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
      output: `${colors.header('Profile errors:')}\n${resolution.errors.map((e) => `  ${symbols.missing} ${e}`).join('\n')}`,
      exitCode: 1,
    };
  }

  const installed = listPlugins();
  const diff = diffPluginsResolved(resolution.plugins, installed, projectRoot);

  return {
    output: `${colors.header('Context:')} ${projectRoot}\n\n${formatStatusResolved(diff)}`,
    exitCode: diff.missing.length > 0 ? 1 : 0,
  };
}
