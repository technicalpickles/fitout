// src/init.test.ts
import { describe, it, expect } from 'vitest';
import { getClaudeSettingsPath, readClaudeSettings, hasFettleHook, addFettleHook, writeClaudeSettings, getDefaultProfilePath, createDefaultProfile } from './init.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('getClaudeSettingsPath', () => {
  it('returns path to Claude settings.json', () => {
    expect(getClaudeSettingsPath()).toBe(join(homedir(), '.claude', 'settings.json'));
  });
});

describe('readClaudeSettings', () => {
  it('returns empty object for nonexistent file', () => {
    const settings = readClaudeSettings('/nonexistent/path/settings.json');
    expect(settings).toEqual({});
  });

  it('parses existing JSON file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({ foo: 'bar' }));

    const settings = readClaudeSettings(settingsPath);
    expect(settings).toEqual({ foo: 'bar' });

    rmSync(tmpDir, { recursive: true });
  });
});

describe('hasFettleHook', () => {
  it('returns false for empty settings', () => {
    expect(hasFettleHook({})).toBe(false);
  });

  it('returns false for settings without hooks', () => {
    expect(hasFettleHook({ env: {} })).toBe(false);
  });

  it('returns true when fettle hook exists', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fettle apply --hook' }
            ]
          }
        ]
      }
    };
    expect(hasFettleHook(settings)).toBe(true);
  });

  it('returns false for other SessionStart hooks', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'echo hello' }
            ]
          }
        ]
      }
    };
    expect(hasFettleHook(settings)).toBe(false);
  });
});

describe('addFettleHook', () => {
  it('creates hooks object if missing', () => {
    const settings = {};
    const result = addFettleHook(settings);
    expect(result.hooks?.SessionStart).toBeDefined();
  });

  it('creates SessionStart array if missing', () => {
    const settings = { hooks: {} };
    const result = addFettleHook(settings);
    expect(result.hooks?.SessionStart).toBeInstanceOf(Array);
  });

  it('appends to existing SessionStart hooks', () => {
    const settings = {
      hooks: {
        SessionStart: [
          { hooks: [{ type: 'command', command: 'echo existing' }] }
        ]
      }
    };
    const result = addFettleHook(settings);
    expect(result.hooks?.SessionStart).toHaveLength(2);
  });

  it('adds the correct hook structure', () => {
    const settings = {};
    const result = addFettleHook(settings);
    expect(result.hooks?.SessionStart?.[0]).toEqual({
      hooks: [
        { type: 'command', command: 'fettle apply --hook' }
      ]
    });
  });
});

describe('writeClaudeSettings', () => {
  it('writes JSON with 2-space indentation', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');

    writeClaudeSettings(settingsPath, { foo: 'bar' });

    const content = readFileSync(settingsPath, 'utf-8');
    expect(content).toBe('{\n  "foo": "bar"\n}\n');

    rmSync(tmpDir, { recursive: true });
  });

  it('creates parent directories if needed', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'nested', 'dir', 'settings.json');

    writeClaudeSettings(settingsPath, { foo: 'bar' });

    const content = readFileSync(settingsPath, 'utf-8');
    expect(content).toContain('foo');

    rmSync(tmpDir, { recursive: true });
  });
});

describe('getDefaultProfilePath', () => {
  it('returns path to default profile', () => {
    const profilesDir = '/some/profiles/dir';
    expect(getDefaultProfilePath(profilesDir, 'default')).toBe('/some/profiles/dir/default.toml');
  });
});

describe('createDefaultProfile', () => {
  it('creates profile file with comment header', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const profilePath = join(tmpDir, 'default.toml');

    createDefaultProfile(profilePath);

    expect(existsSync(profilePath)).toBe(true);
    const content = readFileSync(profilePath, 'utf-8');
    expect(content).toContain('plugins');

    rmSync(tmpDir, { recursive: true });
  });

  it('does not overwrite existing profile', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const profilePath = join(tmpDir, 'default.toml');

    // Create existing profile
    writeFileSync(profilePath, 'existing content');

    createDefaultProfile(profilePath);

    const content = readFileSync(profilePath, 'utf-8');
    expect(content).toBe('existing content');

    rmSync(tmpDir, { recursive: true });
  });
});
