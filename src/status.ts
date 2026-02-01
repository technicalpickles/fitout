import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot, getProfilesDir } from './context.js';
import { parseConfig, FettleConfig } from './config.js';
import { listPlugins, InstalledPlugin } from './claude.js';
import { diffPlugins, PluginDiff, PluginDiffResolved, diffPluginsResolved } from './diff.js';
import { resolveProfiles } from './profiles.js';
import { colors, symbols, provenanceColor, formatContextLine } from './colors.js';
import { listAvailablePlugins, refreshMarketplaces } from './marketplace.js';
import { findOutdatedPlugins, OutdatedPlugin } from './update.js';

export interface StatusOptions {
  refresh?: boolean;
}

function formatProvenance(source: string): string {
  if (source === 'project') return '';
  const colorFn = provenanceColor(source);
  return ' ' + colorFn(`(from: ${source})`);
}

export interface StatusDiff extends PluginDiffResolved {
  outdated: OutdatedPlugin[];
}

export function formatStatusResolved(diff: StatusDiff, showRefreshTip: boolean): string {
  const lines: string[] = [];
  const outdatedIds = new Set(diff.outdated.map((p) => p.id));

  for (const plugin of diff.present) {
    const outdated = diff.outdated.find((o) => o.id === plugin.id);
    if (outdated) {
      lines.push(
        `${symbols.outdated} ${plugin.id} ${colors.warning(`v${outdated.installedVersion} → v${outdated.availableVersion}`)}${formatProvenance(plugin.source)} ${colors.warning('(outdated)')}`
      );
    } else {
      lines.push(`${symbols.present} ${plugin.id}${formatProvenance(plugin.source)}`);
    }
  }

  for (const plugin of diff.missing) {
    lines.push(`${symbols.missing} ${plugin.id}${formatProvenance(plugin.source)} ${colors.error('(missing)')}`);
  }

  for (const plugin of diff.extra) {
    lines.push(`${symbols.extra} ${plugin.id} ${colors.warning('(not in config)')}`);
  }

  const upToDateCount = diff.present.length - diff.outdated.length;
  const summary = [
    upToDateCount > 0 ? colors.success(`${upToDateCount} present`) : null,
    diff.outdated.length > 0 ? colors.warning(`${diff.outdated.length} outdated`) : null,
    diff.missing.length > 0 ? colors.error(`${diff.missing.length} missing`) : null,
    diff.extra.length > 0 ? colors.warning(`${diff.extra.length} extra`) : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary || 'No plugins configured');

  // Add tips when there are outdated plugins
  if (diff.outdated.length > 0) {
    lines.push('');
    lines.push(colors.dim(`Tip: Run \`fettle update\` to update outdated plugins.`));
    if (showRefreshTip) {
      lines.push(colors.dim(`     Run \`fettle status --refresh\` to check for newer versions.`));
    }
  }

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

export function runStatus(cwd: string, options: StatusOptions = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }

  const projectRoot = resolveProjectRoot(cwd);

  // Refresh marketplaces if requested
  if (options.refresh) {
    console.log('Refreshing marketplaces...');
    refreshMarketplaces();
  }

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
  const available = listAvailablePlugins();
  const diff = diffPluginsResolved(resolution.plugins, installed, projectRoot);
  const outdated = findOutdatedPlugins(installed, available, projectRoot);

  const statusDiff: StatusDiff = {
    ...diff,
    outdated,
  };

  const showRefreshTip = !options.refresh;
  const contextLine = formatContextLine(projectRoot, cwd);

  return {
    output: `${contextLine}${formatStatusResolved(statusDiff, showRefreshTip)}`,
    exitCode: diff.missing.length > 0 ? 1 : 0,
  };
}
