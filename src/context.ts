import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

export function resolveProjectRoot(cwd: string): string {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return gitRoot;
  } catch {
    return cwd;
  }
}

export function findConfigPath(startDir: string): string | null {
  const root = resolveProjectRoot(startDir);
  const configPath = join(root, '.claude', 'fettle.toml');

  if (existsSync(configPath)) {
    return configPath;
  }

  return null;
}
