import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot, getProfilesDir } from './context.js';
import { parseConfig, FettleConfig } from './config.js';
import { listPlugins, installPlugin } from './claude.js';
import { diffPluginsResolved, PresentPluginResolved } from './diff.js';
import { resolveProfiles } from './profiles.js';
import { colors, symbols, formatContextLine } from './colors.js';
import { ensureMarketplaces, refreshMarketplaces, listAvailablePlugins, AvailablePlugin } from './marketplace.js';
import { hasGlobalConfig, getConfiguredMarketplaces } from './globalConfig.js';
import { writeHookError } from './hookError.js';
import { satisfiesConstraint } from './constraint.js';
import { updatePlugin } from './update.js';

export interface UnsatisfiableConstraint {
  pluginId: string;
  installedVersion: string;
  requiredConstraint: string;
  marketplaceVersion: string | null;
}

export interface InstallResult {
  installed: string[];
  updated: string[];
  failed: { id: string; error: string }[];
  alreadyPresent: string[];
  unsatisfiable: UnsatisfiableConstraint[];
}

export function formatInstallResultHook(result: InstallResult): string {
  if (result.installed.length === 0) {
    // Nothing installed - either nothing to do or all failed
    // Failures go to stderr, so stdout is empty
    return '';
  }

  const s = result.installed.length === 1 ? '' : 's';
  const pluginList = result.installed.map((id) => `  - ${id}`).join('\n');

  return [
    '<system-reminder>',
    `Fitout installed ${result.installed.length} plugin${s} for this project:`,
    pluginList,
    '',
    'User should restart Claude Code to activate them.',
    'User can run `fitout status` to see configured plugins.',
    '</system-reminder>',
  ].join('\n');
}

export function formatInstallResult(result: InstallResult): string {
  const lines: string[] = [];

  if (result.installed.length === 0 && result.updated.length === 0 && result.failed.length === 0 && result.unsatisfiable.length === 0) {
    lines.push(`${symbols.present} ${colors.success(`All ${result.alreadyPresent.length} plugins present`)}`);
    return lines.join('\n');
  }

  if (result.installed.length > 0) {
    lines.push(colors.header('Installed:'));
    for (const id of result.installed) {
      lines.push(`  ${symbols.install} ${id}`);
    }
  }

  if (result.updated.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(colors.header('Updated:'));
    for (const id of result.updated) {
      lines.push(`  ${symbols.outdated} ${id}`);
    }
  }

  if (result.failed.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(colors.header('Failed:'));
    for (const { id, error } of result.failed) {
      lines.push(`  ${symbols.missing} ${id} ${colors.dim(`- ${error}`)}`);
    }
  }

  if (result.unsatisfiable.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(colors.header('Cannot satisfy constraints:'));
    for (const u of result.unsatisfiable) {
      lines.push(`  ${symbols.missing} ${u.pluginId}`);
      lines.push(`    Installed: ${u.installedVersion}`);
      lines.push(`    Required:  >= ${u.requiredConstraint}`);
      lines.push(`    Marketplace: ${u.marketplaceVersion || 'not found'}`);
    }
  }

  const summary = [
    result.installed.length > 0 ? colors.action(`${result.installed.length} installed`) : null,
    result.updated.length > 0 ? colors.action(`${result.updated.length} updated`) : null,
    result.failed.length > 0 ? colors.error(`${result.failed.length} failed`) : null,
    result.unsatisfiable.length > 0 ? colors.error(`${result.unsatisfiable.length} unsatisfiable`) : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary);

  return lines.join('\n');
}

function checkConstraintSatisfaction(
  present: PresentPluginResolved[]
): { satisfied: PresentPluginResolved[]; unsatisfied: PresentPluginResolved[] } {
  const satisfied: PresentPluginResolved[] = [];
  const unsatisfied: PresentPluginResolved[] = [];

  for (const plugin of present) {
    if (plugin.constraint === null) {
      satisfied.push(plugin);
    } else if (satisfiesConstraint(plugin.version, plugin.constraint)) {
      satisfied.push(plugin);
    } else {
      unsatisfied.push(plugin);
    }
  }

  return { satisfied, unsatisfied };
}

export function runInstall(cwd: string, options: { dryRun?: boolean; hook?: boolean } = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    // In hook mode, provide urgent context for Claude about missing config
    if (options.hook) {
      const message = [
        '⚠️ FITOUT NOT CONFIGURED FOR THIS PROJECT ⚠️',
        '',
        'IMPORTANT: Before doing anything else, inform the user:',
        '"I notice fitout (your plugin manager) isn\'t set up for this project.',
        'Run `fitout init` to configure plugins, or create an empty .claude/fitout.toml to skip."',
        '',
        'This message will stop appearing once fitout is configured.',
      ].join('\n');
      return { output: message, exitCode: 0 };
    }
    return {
      output: 'No fitout.toml found. Run `fitout init` to create one.',
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
    const message = `Failed to read config: ${err instanceof Error ? err.message : 'Unknown error'}`;
    if (options.hook) {
      writeHookError(message);
    }
    return {
      output: options.hook ? '' : message,
      exitCode: 1,
    };
  }

  // Ensure configured marketplaces are installed (skip in hook mode for cleaner output)
  if (!options.hook && hasGlobalConfig()) {
    const marketplaces = getConfiguredMarketplaces();
    if (Object.keys(marketplaces).length > 0) {
      const marketplaceResult = ensureMarketplaces();
      if (marketplaceResult.added.length > 0) {
        console.log(colors.header('Marketplaces:'));
        for (const name of marketplaceResult.added) {
          console.log(`  ${symbols.install} ${name}`);
        }
        console.log('');
      }
    }
  }

  // Resolve profiles
  const profilesDir = getProfilesDir();
  const resolution = resolveProfiles(profilesDir, config);

  if (resolution.errors.length > 0) {
    const message = `Profile errors:\n${resolution.errors.map((e) => `  - ${e}`).join('\n')}`;
    if (options.hook) {
      writeHookError(message);
    }
    return {
      output: options.hook ? '' : `${colors.header('Profile errors:')}\n${resolution.errors.map((e) => `  ${symbols.missing} ${e}`).join('\n')}`,
      exitCode: 1,
    };
  }

  const installed = listPlugins();
  const diff = diffPluginsResolved(resolution.plugins, installed, projectRoot);

  const contextLine = formatContextLine(projectRoot, cwd);

  // Check constraint satisfaction for present plugins
  const { satisfied, unsatisfied } = checkConstraintSatisfaction(diff.present);

  // Handle unsatisfied constraints
  let updated: string[] = [];
  let unsatisfiable: UnsatisfiableConstraint[] = [];

  if (unsatisfied.length > 0 && !options.hook) {
    // Refresh marketplace to get latest versions
    console.log('Checking for updates to satisfy constraints...');
    refreshMarketplaces();
    const available = listAvailablePlugins();
    const availableMap = new Map(available.map((p) => [p.id, p]));

    for (const plugin of unsatisfied) {
      const avail = availableMap.get(plugin.id);
      if (avail && satisfiesConstraint(avail.version, plugin.constraint!)) {
        // Marketplace has satisfying version - update
        try {
          updatePlugin(plugin.id);
          updated.push(plugin.id);
        } catch (err) {
          // Fall through to unsatisfiable
          unsatisfiable.push({
            pluginId: plugin.id,
            installedVersion: plugin.version,
            requiredConstraint: plugin.constraint!,
            marketplaceVersion: avail?.version || null,
          });
        }
      } else {
        // Marketplace cannot satisfy
        unsatisfiable.push({
          pluginId: plugin.id,
          installedVersion: plugin.version,
          requiredConstraint: plugin.constraint!,
          marketplaceVersion: avail?.version || null,
        });
      }
    }
  }

  if (options.dryRun) {
    if (diff.missing.length === 0) {
      return {
        output: `${contextLine}${symbols.present} ${colors.success(`All ${diff.present.length} plugins present`)}`,
        exitCode: 0,
      };
    }
    const lines = [contextLine + colors.header('Would install:')];
    for (const plugin of diff.missing) {
      lines.push(`  ${symbols.install} ${plugin.id}`);
    }
    return { output: lines.join('\n'), exitCode: 0 };
  }

  const result: InstallResult = {
    installed: [],
    updated,
    failed: [],
    alreadyPresent: satisfied.map((p) => p.id),
    unsatisfiable,
  };

  for (const plugin of diff.missing) {
    try {
      installPlugin(plugin.id);
      result.installed.push(plugin.id);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      result.failed.push({ id: plugin.id, error });
      if (options.hook) {
        writeHookError(`Failed to install ${plugin.id}: ${error}`);
      }
    }
  }

  // Hook mode output philosophy (see docs/design/hook-output-philosophy.md):
  // - Silent when nothing to do (all plugins present) - don't waste Claude's context
  // - Loud when we took action (installed plugins) - Claude may need to inform user
  // - Errors already written to stderr above with [fettle] prefix
  if (options.hook) {
    if (result.failed.length > 0) {
      return {
        output: '',
        exitCode: 1,
      };
    }
    return {
      output: formatInstallResultHook(result),
      exitCode: 0,
    };
  }

  return {
    output: `${contextLine}${formatInstallResult(result)}`,
    exitCode: result.failed.length > 0 || result.unsatisfiable.length > 0 ? 1 : 0,
  };
}
