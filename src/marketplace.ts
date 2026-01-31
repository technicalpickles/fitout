import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

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

export function getMarketplacesDir(): string {
  return join(homedir(), '.claude', 'plugins', 'marketplaces');
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
