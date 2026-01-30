import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot } from './context.js';
import { parseConfig, FettleConfig } from './config.js';
import { listPlugins } from './claude.js';
import { diffPlugins, PluginDiff } from './diff.js';

export function formatStatus(diff: PluginDiff): string {
  const lines: string[] = [];

  for (const plugin of diff.present) {
    lines.push(`✓ ${plugin.id}`);
  }

  for (const id of diff.missing) {
    lines.push(`✗ ${id} (missing)`);
  }

  for (const plugin of diff.extra) {
    lines.push(`? ${plugin.id} (not in config)`);
  }

  const summary = [
    diff.present.length > 0 ? `${diff.present.length} present` : null,
    diff.missing.length > 0 ? `${diff.missing.length} missing` : null,
    diff.extra.length > 0 ? `${diff.extra.length} extra` : null,
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

  const installed = listPlugins();
  const diff = diffPlugins(config.plugins, installed, projectRoot);

  return {
    output: `Context: ${projectRoot}\n\n${formatStatus(diff)}`,
    exitCode: diff.missing.length > 0 ? 1 : 0,
  };
}
