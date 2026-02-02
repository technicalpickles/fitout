import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfiguredMarketplaces } from './globalConfig.js';
import { getMarketplacesDir } from './paths.js';

export { getMarketplacesDir } from './paths.js';

export interface AvailablePlugin {
  id: string; // "git@pickled-claude-plugins"
  version: string;
  marketplace: string;
}

interface MarketplacePlugin {
  name: string;
  version: string;
  source: string | { source: string; url: string };
}

interface MarketplaceManifest {
  name: string;
  plugins: MarketplacePlugin[];
}

export function listAvailablePlugins(): AvailablePlugin[] {
  const marketplacesDir = getMarketplacesDir();

  if (!existsSync(marketplacesDir)) {
    return [];
  }

  const marketplaces = readdirSync(marketplacesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const plugins: AvailablePlugin[] = [];

  for (const marketplace of marketplaces) {
    const manifestPath = join(
      marketplacesDir,
      marketplace,
      '.claude-plugin',
      'marketplace.json'
    );

    if (!existsSync(manifestPath)) {
      continue;
    }

    try {
      const content = readFileSync(manifestPath, 'utf-8');
      const manifest: MarketplaceManifest = JSON.parse(content);

      for (const plugin of manifest.plugins) {
        plugins.push({
          id: `${plugin.name}@${marketplace}`,
          version: plugin.version,
          marketplace,
        });
      }
    } catch {
      // Skip malformed manifests
    }
  }

  return plugins;
}

export function refreshMarketplaces(): void {
  execFileSync('claude', ['plugin', 'marketplace', 'update'], {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}

/**
 * Get list of marketplace names that are installed locally
 */
export function getInstalledMarketplaces(): string[] {
  const marketplacesDir = getMarketplacesDir();

  if (!existsSync(marketplacesDir)) {
    return [];
  }

  return readdirSync(marketplacesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * Check if a marketplace is installed
 */
export function isMarketplaceInstalled(name: string): boolean {
  const marketplacesDir = getMarketplacesDir();
  return existsSync(join(marketplacesDir, name));
}

/**
 * Add a marketplace from a source URL
 */
export function addMarketplace(source: string): void {
  execFileSync('claude', ['plugin', 'marketplace', 'add', source], {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}

export interface EnsureMarketplacesResult {
  added: string[];
  alreadyInstalled: string[];
  failed: { name: string; error: string }[];
}

/**
 * Ensure all configured marketplaces are installed
 */
export function ensureMarketplaces(): EnsureMarketplacesResult {
  const configured = getConfiguredMarketplaces();
  const result: EnsureMarketplacesResult = {
    added: [],
    alreadyInstalled: [],
    failed: [],
  };

  for (const [name, source] of Object.entries(configured)) {
    if (isMarketplaceInstalled(name)) {
      result.alreadyInstalled.push(name);
    } else {
      try {
        addMarketplace(source);
        result.added.push(name);
      } catch (err) {
        result.failed.push({
          name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  return result;
}
