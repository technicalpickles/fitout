import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot, getProfilesDir } from './context.js';
import { parseConfig, FettleConfig } from './config.js';
import { listPlugins, installPlugin } from './claude.js';
import { diffPluginsResolved } from './diff.js';
import { resolveProfiles } from './profiles.js';
import { colors, symbols } from './colors.js';

export interface ApplyResult {
  installed: string[];
  failed: { id: string; error: string }[];
  alreadyPresent: string[];
}

export function formatApplyResultHook(result: ApplyResult): string {
  if (result.installed.length === 0) {
    // Nothing installed - either nothing to do or all failed
    // Failures go to stderr, so stdout is empty
    return '';
  }

  const s = result.installed.length === 1 ? '' : 's';
  const pluginList = result.installed.map((id) => `  - ${id}`).join('\n');

  return [
    '<system-reminder>',
    `Fettle installed ${result.installed.length} plugin${s} for this project:`,
    pluginList,
    '',
    'User should restart Claude Code to activate them.',
    'User can run `fettle status` to see configured plugins.',
    '</system-reminder>',
  ].join('\n');
}

export function formatApplyResult(result: ApplyResult): string {
  const lines: string[] = [];

  if (result.installed.length === 0 && result.failed.length === 0) {
    lines.push(`${symbols.present} ${colors.success(`All ${result.alreadyPresent.length} plugins present`)}`);
    return lines.join('\n');
  }

  if (result.installed.length > 0) {
    lines.push(colors.header('Installed:'));
    for (const id of result.installed) {
      lines.push(`  ${symbols.install} ${id}`);
    }
  }

  if (result.failed.length > 0) {
    if (result.installed.length > 0) lines.push('');
    lines.push(colors.header('Failed:'));
    for (const { id, error } of result.failed) {
      lines.push(`  ${symbols.missing} ${id} ${colors.dim(`- ${error}`)}`);
    }
  }

  const summary = [
    result.installed.length > 0 ? colors.action(`${result.installed.length} plugin${result.installed.length > 1 ? 's' : ''} installed`) : null,
    result.failed.length > 0 ? colors.error(`${result.failed.length} failed`) : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary);

  return lines.join('\n');
}

export function runApply(cwd: string, options: { dryRun?: boolean; hook?: boolean } = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    // In hook mode, provide urgent context for Claude about missing config
    if (options.hook) {
      const message = [
        '⚠️ FETTLE NOT CONFIGURED FOR THIS PROJECT ⚠️',
        '',
        'IMPORTANT: Before doing anything else, inform the user:',
        '"I notice fettle (your plugin manager) isn\'t set up for this project.',
        'Run `fettle init` to configure plugins, or create an empty .claude/fettle.toml to skip."',
        '',
        'This message will stop appearing once fettle is configured.',
      ].join('\n');
      return { output: message, exitCode: 0 };
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
      output: `${colors.header('Profile errors:')}\n${resolution.errors.map((e) => `  ${symbols.missing} ${e}`).join('\n')}`,
      exitCode: 1,
    };
  }

  const installed = listPlugins();
  const diff = diffPluginsResolved(resolution.plugins, installed, projectRoot);

  if (options.dryRun) {
    if (diff.missing.length === 0) {
      return {
        output: `${colors.header('Context:')} ${projectRoot}\n\n${symbols.present} ${colors.success(`All ${diff.present.length} plugins present`)}`,
        exitCode: 0,
      };
    }
    const lines = [`${colors.header('Context:')} ${projectRoot}\n`, colors.header('Would install:')];
    for (const plugin of diff.missing) {
      lines.push(`  ${symbols.install} ${plugin.id}`);
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

  // At the end of runApply, replace the final return with:
  if (options.hook) {
    // In hook mode: stdout for success message, stderr for errors
    if (result.failed.length > 0) {
      return {
        output: '',
        exitCode: 1,
      };
    }
    return {
      output: formatApplyResultHook(result),
      exitCode: 0,
    };
  }

  return {
    output: `${colors.header('Context:')} ${projectRoot}\n\n${formatApplyResult(result)}`,
    exitCode: result.failed.length > 0 ? 1 : 0,
  };
}
