import { describe, it, expect, vi, afterEach } from 'vitest';
import { join, dirname } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  getGlobalConfigContent,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from './globalConfig.js';

describe('getGlobalConfigDir', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns path under ~/.config/fettle by default', () => {
    expect(getGlobalConfigDir()).toContain('.config');
    expect(getGlobalConfigDir()).toContain('fettle');
  });

  it('respects FETTLE_CONFIG_HOME env var', () => {
    vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
    expect(getGlobalConfigDir()).toBe('/custom/fettle');
  });
});

describe('getGlobalConfigPath', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns path to config.toml', () => {
    expect(getGlobalConfigPath()).toContain('config.toml');
  });

  it('respects FETTLE_CONFIG_HOME env var', () => {
    vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
    expect(getGlobalConfigPath()).toBe('/custom/fettle/config.toml');
  });
});

describe('getGlobalConfigContent', () => {
  it('generates empty config when no marketplaces specified', () => {
    const content = getGlobalConfigContent();
    expect(content).toContain('[marketplaces]');
    expect(content).toContain('# pickled-claude-plugins');
  });

  it('generates config with marketplaces when specified', () => {
    const content = getGlobalConfigContent({
      'my-marketplace': 'https://example.com/marketplace',
    });
    expect(content).toContain('[marketplaces]');
    expect(content).toContain('my-marketplace = "https://example.com/marketplace"');
  });

  it('handles multiple marketplaces', () => {
    const content = getGlobalConfigContent({
      'marketplace-a': 'https://a.com',
      'marketplace-b': 'https://b.com',
    });
    expect(content).toContain('marketplace-a = "https://a.com"');
    expect(content).toContain('marketplace-b = "https://b.com"');
  });
});
