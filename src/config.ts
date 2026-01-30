import { parse } from 'smol-toml';

export interface FettleConfig {
  plugins: string[];
  profiles: string[];
}

export function parseConfig(tomlContent: string): FettleConfig {
  const parsed = parse(tomlContent);

  const plugins = Array.isArray(parsed.plugins)
    ? parsed.plugins.filter((p): p is string => typeof p === 'string')
    : [];

  const profiles = Array.isArray(parsed.profiles)
    ? parsed.profiles.filter((p): p is string => typeof p === 'string')
    : [];

  return { plugins, profiles };
}
