// src/globalConfig.ts
import { dirname } from 'node:path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse, stringify } from 'smol-toml';
import { getGlobalConfigDir, getGlobalConfigPath } from './paths.js';

export { getGlobalConfigDir, getGlobalConfigPath } from './paths.js';

export interface GlobalConfig {
  marketplaces?: Record<string, string>;
}

export function readGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath();

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return parse(content) as GlobalConfig;
  } catch {
    return {};
  }
}

export function writeGlobalConfig(config: GlobalConfig): void {
  const configPath = getGlobalConfigPath();
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, stringify(config));
}

export function hasGlobalConfig(): boolean {
  return existsSync(getGlobalConfigPath());
}

export function getConfiguredMarketplaces(): Record<string, string> {
  const config = readGlobalConfig();
  return config.marketplaces || {};
}

export function getGlobalConfigContent(marketplaces?: Record<string, string>): string {
  if (!marketplaces || Object.keys(marketplaces).length === 0) {
    return `# Fettle global config
# Marketplaces and their sources

[marketplaces]
# pickled-claude-plugins = "https://github.com/technicalpickles/pickled-claude-plugins"
`;
  }

  const lines = [
    '# Fettle global config',
    '# Marketplaces and their sources',
    '',
    '[marketplaces]',
  ];

  for (const [name, source] of Object.entries(marketplaces)) {
    lines.push(`${name} = "${source}"`);
  }

  return lines.join('\n') + '\n';
}

export function createGlobalConfig(marketplaces?: Record<string, string>): boolean {
  const configPath = getGlobalConfigPath();

  if (existsSync(configPath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, getGlobalConfigContent(marketplaces));
  return true;
}
