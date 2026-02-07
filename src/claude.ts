import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface InstalledPlugin {
  id: string;
  version: string;
  scope: 'local' | 'user' | 'global';
  enabled: boolean;
  projectPath?: string;
}

export function parsePluginList(jsonOutput: string): InstalledPlugin[] {
  const parsed = JSON.parse(jsonOutput);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as InstalledPlugin[];
}

export function listPlugins(): InstalledPlugin[] {
  // Use file redirection to work around Claude CLI stdout truncation at 64KB
  // when piped to a non-tty. File redirection captures the full output.
  const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-'));
  const tmpFile = join(tmpDir, 'plugins.json');
  try {
    execSync(`claude plugin list --json > "${tmpFile}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const output = readFileSync(tmpFile, 'utf-8');
    return parsePluginList(output);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function installPlugin(pluginId: string): void {
  execFileSync('claude', ['plugin', 'install', pluginId, '--scope', 'local'], {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}
