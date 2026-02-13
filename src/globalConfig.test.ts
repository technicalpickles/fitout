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

  it('returns path under ~/.config/fitout by default', () => {
    expect(getGlobalConfigDir()).toContain('.config');
    expect(getGlobalConfigDir()).toContain('fitout');
  });

  it('respects FITOUT_CONFIG_HOME env var', () => {
    vi.stubEnv('FITOUT_CONFIG_HOME', '/custom/fitout');
    expect(getGlobalConfigDir()).toBe('/custom/fitout');
  });
});

describe('getGlobalConfigPath', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns path to config.toml', () => {
    expect(getGlobalConfigPath()).toContain('config.toml');
  });

  it('respects FITOUT_CONFIG_HOME env var', () => {
    vi.stubEnv('FITOUT_CONFIG_HOME', '/custom/fitout');
    expect(getGlobalConfigPath()).toBe('/custom/fitout/config.toml');
  });
});

describe('getGlobalConfigContent', () => {
  it('generates empty config when no marketplaces specified', () => {
    const content = getGlobalConfigContent();
    expect(content).toContain('marketplaces = []');
  });

  it('generates config with marketplaces array when specified', () => {
    const content = getGlobalConfigContent([
      'https://github.com/owner/marketplace',
    ]);
    expect(content).toContain('marketplaces = [');
    expect(content).toContain('"https://github.com/owner/marketplace"');
  });

  it('handles multiple marketplaces', () => {
    const content = getGlobalConfigContent([
      'https://github.com/a/repo',
      'https://github.com/b/repo',
    ]);
    expect(content).toContain('"https://github.com/a/repo"');
    expect(content).toContain('"https://github.com/b/repo"');
  });
});
