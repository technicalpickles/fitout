import { execFileSync } from 'node:child_process';

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
  const output = execFileSync('claude', ['plugin', 'list', '--json'], {
    encoding: 'utf-8',
  });
  return parsePluginList(output);
}

export function installPlugin(pluginId: string): void {
  execFileSync('claude', ['plugin', 'install', pluginId, '--scope', 'local'], {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}
