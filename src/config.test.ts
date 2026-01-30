import { describe, it, expect } from 'vitest';
import { parseConfig, FettleConfig } from './config.js';

describe('parseConfig', () => {
  it('parses valid TOML with plugins array', () => {
    const toml = `
plugins = [
  "superpowers@superpowers-marketplace",
  "ci-cd-tools@pickled-claude-plugins",
]
`;
    const result = parseConfig(toml);
    expect(result.plugins).toEqual([
      'superpowers@superpowers-marketplace',
      'ci-cd-tools@pickled-claude-plugins',
    ]);
  });

  it('returns empty array for missing plugins', () => {
    const toml = `# empty config`;
    const result = parseConfig(toml);
    expect(result.plugins).toEqual([]);
  });

  it('throws on invalid TOML', () => {
    const toml = `plugins = [invalid`;
    expect(() => parseConfig(toml)).toThrow();
  });
});

describe('parseConfig profiles field', () => {
  it('parses profiles array', () => {
    const toml = `
profiles = ["default", "backend"]
plugins = ["some-plugin@registry"]
`;
    const result = parseConfig(toml);
    expect(result.profiles).toEqual(['default', 'backend']);
  });

  it('returns empty array for missing profiles', () => {
    const toml = `plugins = ["some-plugin@registry"]`;
    const result = parseConfig(toml);
    expect(result.profiles).toEqual([]);
  });
});
