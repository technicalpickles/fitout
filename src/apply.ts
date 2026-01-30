import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot } from './context.js';
import { parseConfig } from './config.js';
import { listPlugins, installPlugin } from './claude.js';
import { diffPlugins } from './diff.js';

export interface ApplyResult {
  installed: string[];
  failed: { id: string; error: string }[];
  alreadyPresent: string[];
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

export function runApply(cwd: string, options: { dryRun?: boolean } = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }

  const projectRoot = resolveProjectRoot(cwd);
  const configContent = readFileSync(configPath, 'utf-8');
  const config = parseConfig(configContent);
  const installed = listPlugins();
  const diff = diffPlugins(config.plugins, installed, projectRoot);

  if (options.dryRun) {
    if (diff.missing.length === 0) {
      return {
        output: `Context: ${projectRoot}\n\nNothing to do. ${diff.present.length} plugins already installed.`,
        exitCode: 0,
      };
    }
    const lines = [`Context: ${projectRoot}\n`, 'Would install:'];
    for (const id of diff.missing) {
      lines.push(`  + ${id}`);
    }
    return { output: lines.join('\n'), exitCode: 0 };
  }

  const result: ApplyResult = {
    installed: [],
    failed: [],
    alreadyPresent: diff.present.map((p) => p.id),
  };

  for (const id of diff.missing) {
    try {
      installPlugin(id);
      result.installed.push(id);
    } catch (err) {
      result.failed.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return {
    output: `Context: ${projectRoot}\n\n${formatApplyResult(result)}`,
    exitCode: result.failed.length > 0 ? 1 : 0,
  };
}
