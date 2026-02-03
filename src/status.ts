import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot, getProfilesDir } from './context.js';
import { parseConfig, FettleConfig } from './config.js';
import { listPlugins, InstalledPlugin } from './claude.js';
import { diffPlugins, PluginDiff, PluginDiffResolved, diffPluginsResolved } from './diff.js';
import { resolveProfiles, ConstraintOverride } from './profiles.js';
import { colors, symbols, provenanceColor, formatContextLine } from './colors.js';
import { listAvailablePlugins, refreshMarketplaces } from './marketplace.js';
import { findOutdatedPlugins, OutdatedPlugin } from './update.js';
import { readClaudeSettings, getFitoutHookStatus, hasFitoutSkill, HookStatus } from './init.js';
import { getClaudeSettingsPath } from './paths.js';

export interface StatusOptions {
  refresh?: boolean;
}

export interface GlobalStatus {
  hookStatus: HookStatus;
  skillInstalled: boolean;
  profiles: string[];
}

export function formatGlobalStatus(status: GlobalStatus): string {
  const lines: string[] = [];

  lines.push(colors.header('Global:'));

  if (status.hookStatus === 'current') {
    lines.push(`  ${symbols.present} Hook installed`);
  } else if (status.hookStatus === 'outdated') {
    lines.push(`  ${symbols.outdated} Hook outdated ${colors.dim('(run `fitout init` to upgrade)')}`);
  } else {
    lines.push(`  ${symbols.missing} Hook ${colors.dim('(run `fitout init`)')}`);
  }

  if (status.skillInstalled) {
    lines.push(`  ${symbols.present} Skill installed`);
  } else {
    lines.push(`  ${symbols.missing} Skill ${colors.dim('(run `fitout init`)')}`);
  }

  if (status.profiles.length > 0) {
    const profileList = status.profiles.map(p => provenanceColor(p)(p)).join(', ');
    lines.push(`  ${symbols.present} Profiles: ${profileList}`);
  }

  return lines.join('\n');
}

function formatProvenance(source: string): string {
  if (source === 'project') return '';
  const colorFn = provenanceColor(source);
  return ' ' + colorFn(`(from: ${source})`);
}

export interface StatusDiff extends PluginDiffResolved {
  outdated: OutdatedPlugin[];
}

export function formatStatusResolved(
  diff: StatusDiff,
  showRefreshTip: boolean,
  constraintOverrides: ConstraintOverride[] = []
): string {
  const lines: string[] = [];
  const outdatedIds = new Set(diff.outdated.map((p) => p.id));

  for (const plugin of diff.present) {
    const outdated = diff.outdated.find((o) => o.id === plugin.id);
    const constraintStr = plugin.constraint ? ` >= ${plugin.constraint}` : '';

    if (outdated) {
      lines.push(
        `${symbols.outdated} ${plugin.id} ${colors.warning(`v${outdated.installedVersion} → v${outdated.availableVersion}`)}${constraintStr}${formatProvenance(plugin.source)} ${colors.warning('(outdated)')}`
      );
    } else {
      const versionStr = plugin.version ? ` ${plugin.version}` : '';
      lines.push(`${symbols.present} ${plugin.id}${versionStr}${constraintStr}${formatProvenance(plugin.source)}`);
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
    lines.push(colors.dim(`Tip: Run \`fitout update\` to update outdated plugins.`));
    if (showRefreshTip) {
      lines.push(colors.dim(`     Run \`fitout status --refresh\` to check for newer versions.`));
    }
  }

  // Add constraint override warnings
  if (constraintOverrides.length > 0) {
    lines.push('');
    lines.push(colors.header('Warnings:'));
    for (const override of constraintOverrides) {
      lines.push(
        `  ${override.pluginId}: constraint >= ${override.projectConstraint} (project) overridden by >= ${override.winningConstraint} (${override.winningSource})`
      );
      lines.push(
        `    To fix: update .claude/fitout.toml to ">= ${override.winningConstraint}" or remove the constraint`
      );
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
  // Check global status
  const settingsPath = getClaudeSettingsPath();
  const settings = readClaudeSettings(settingsPath);
  const hookStatus = getFitoutHookStatus(settings);
  const skillInstalled = hasFitoutSkill();

  const configPath = findConfigPath(cwd);

  if (!configPath) {
    // No project config - show global status and hint
    const globalStatus = formatGlobalStatus({
      hookStatus,
      skillInstalled,
      profiles: [],
    });
    return {
      output: `${globalStatus}\n\nNo project config. Run \`fitout init\` to create one.`,
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

  // Get list of profiles being used
  const profiles = config.profiles || [];

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

  // Format global status
  const globalStatus = formatGlobalStatus({
    hookStatus,
    skillInstalled,
    profiles,
  });

  const formatted = formatStatusResolved(statusDiff, showRefreshTip, resolution.constraintOverrides);

  return {
    output: `${globalStatus}\n\n${contextLine}${colors.header('Plugins:')}\n${formatted}`,
    exitCode: diff.missing.length > 0 ? 1 : 0,
  };
}
