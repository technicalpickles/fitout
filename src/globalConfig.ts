// src/globalConfig.ts
import { dirname } from 'node:path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse, stringify } from 'smol-toml';
import { getGlobalConfigDir, getGlobalConfigPath } from './paths.js';

export { getGlobalConfigDir, getGlobalConfigPath } from './paths.js';

export interface GlobalConfig {
  marketplaces?: string[];
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

export function getConfiguredMarketplaces(): string[] {
  const config = readGlobalConfig();
  return config.marketplaces || [];
}

export function getGlobalConfigContent(marketplaces?: string[]): string {
  if (!marketplaces || marketplaces.length === 0) {
    return `# Fitout global config
# Marketplace sources to ensure are installed

marketplaces = []
`;
  }

  const quotedSources = marketplaces.map((s) => `  "${s}"`).join(',\n');
  return `# Fitout global config
# Marketplace sources to ensure are installed

marketplaces = [
${quotedSources},
]
`;
}

export function createGlobalConfig(marketplaces?: string[]): boolean {
  const configPath = getGlobalConfigPath();

  if (existsSync(configPath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, getGlobalConfigContent(marketplaces));
  return true;
}
