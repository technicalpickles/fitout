import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';

export interface ResolvedPlugin {
  id: string;
  source: string; // "project" | profile name
}

export function loadProfile(profilesDir: string, name: string): string[] | null {
  const profilePath = join(profilesDir, `${name}.toml`);

  if (!existsSync(profilePath)) {
    return null;
  }

  const content = readFileSync(profilePath, 'utf-8');
  const parsed = parse(content);

  const plugins = Array.isArray(parsed.plugins)
    ? parsed.plugins.filter((p): p is string => typeof p === 'string')
    : [];

  return plugins;
}
