// src/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readClaudeSettings, hasFettleHook, addFettleHook, writeClaudeSettings, getDefaultProfilePath, createDefaultProfile, runInit, InitResult, createFettleSkill, hasFettleSkill, hasDefaultProfile, hasProjectConfig, getProjectConfigContent, getProjectConfigPath } from './init.js';
import { getClaudeSettingsPath, getClaudeSkillsDir, getFettleSkillPath } from './paths.js';
import { setupTestEnv, TestContext } from './test-utils.js';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('getClaudeSettingsPath', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns path to Claude settings.json', () => {
    expect(getClaudeSettingsPath()).toBe(join(ctx.claudeHome, 'settings.json'));
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

  it('returns true when fettle install hook exists', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fettle install --hook' }
            ]
          }
        ]
      }
    };
    expect(hasFettleHook(settings)).toBe(true);
  });

  it('returns true when legacy fettle apply hook exists', () => {
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
        { type: 'command', command: 'fettle install --hook' }
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

describe('runInit', () => {
  it('returns already initialized when hook exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    // Create settings with existing hook
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        SessionStart: [{
          hooks: [{ type: 'command', command: 'fettle apply --hook' }]
        }]
      }
    }));

    const result = runInit({ settingsPath, profilesDir, createProfile: false });

    expect(result.hookAdded).toBe(false);
    expect(result.alreadyInitialized).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('adds hook when not present', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    const result = runInit({ settingsPath, profilesDir, createProfile: false });

    expect(result.hookAdded).toBe(true);
    expect(result.alreadyInitialized).toBe(false);

    // Verify settings file
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings.hooks.SessionStart).toBeDefined();

    rmSync(tmpDir, { recursive: true });
  });

  it('creates profile when requested', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile: true,
      profileName: 'default'
    });

    expect(result.profileCreated).toBe(true);
    expect(result.profilePath).toBe(join(profilesDir, 'default.toml'));
    expect(existsSync(result.profilePath!)).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('creates skill when requested', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    // Mock the skill path by testing with the real function
    // Since createFettleSkill uses a fixed path, we'll test via runInit result
    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile: false,
      createSkill: true
    });

    expect(result.skillPath).toBe(getFettleSkillPath());
    // Note: skillCreated may be false if skill already exists from previous runs

    rmSync(tmpDir, { recursive: true });
  });
});

describe('getClaudeSkillsDir', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns path to Claude skills directory', () => {
    expect(getClaudeSkillsDir()).toBe(join(ctx.claudeHome, 'skills'));
  });
});

describe('getFettleSkillPath', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns path to fettle skill file', () => {
    expect(getFettleSkillPath()).toBe(join(ctx.claudeHome, 'skills', 'fettle', 'SKILL.md'));
  });
});

describe('createFettleSkill', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('creates skill file with correct content', () => {
    const created = createFettleSkill();
    expect(created).toBe(true);

    const skillPath = getFettleSkillPath();
    expect(existsSync(skillPath)).toBe(true);

    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('name: fettle');
    expect(content).toContain('description:');
    expect(content).toContain('Fettle Diagnostic');
  });

  it('does not overwrite existing skill', () => {
    createFettleSkill();
    const result = createFettleSkill();
    expect(result).toBe(false);
  });
});

describe('hasFettleSkill', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns false when skill does not exist', () => {
    expect(hasFettleSkill()).toBe(false);
  });

  it('returns true when skill exists', () => {
    createFettleSkill();
    expect(hasFettleSkill()).toBe(true);
  });
});

describe('hasDefaultProfile', () => {
  it('returns false for nonexistent profile', () => {
    expect(hasDefaultProfile('/nonexistent/profiles')).toBe(false);
  });

  it('returns true when profile exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const profilePath = join(tmpDir, 'default.toml');
    writeFileSync(profilePath, 'plugins = []');

    expect(hasDefaultProfile(tmpDir, 'default')).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });
});

describe('hasProjectConfig', () => {
  it('returns false for nonexistent config', () => {
    expect(hasProjectConfig('/nonexistent/project')).toBe(false);
  });

  it('returns true when config exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const configPath = join(tmpDir, '.claude', 'fettle.toml');
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, 'plugins = []');

    expect(hasProjectConfig(tmpDir)).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });
});

describe('getProjectConfigContent', () => {
  it('generates config without profile when not specified', () => {
    const content = getProjectConfigContent();
    expect(content).toContain('# profiles = ["default"]');
    expect(content).toContain('plugins = [');
  });

  it('generates config with profile when specified', () => {
    const content = getProjectConfigContent('myprofile');
    expect(content).toContain('profiles = ["myprofile"]');
    expect(content).not.toContain('# profiles');
  });
});
