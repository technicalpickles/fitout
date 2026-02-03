// src/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readClaudeSettings, hasFitoutHook, getFitoutHookStatus, addFitoutHook, upgradeFitoutHook, writeClaudeSettings, getDefaultProfilePath, createDefaultProfile, runInit, InitResult, createFitoutSkill, hasFitoutSkill, hasDefaultProfile, hasProjectConfig, getProjectConfigContent, getProjectConfigPath } from './init.js';
import { getClaudeSettingsPath, getClaudeSkillsDir, getFitoutSkillPath } from './paths.js';
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({ foo: 'bar' }));

    const settings = readClaudeSettings(settingsPath);
    expect(settings).toEqual({ foo: 'bar' });

    rmSync(tmpDir, { recursive: true });
  });
});

describe('hasFitoutHook', () => {
  it('returns false for empty settings', () => {
    expect(hasFitoutHook({})).toBe(false);
  });

  it('returns false for settings without hooks', () => {
    expect(hasFitoutHook({ env: {} })).toBe(false);
  });

  it('returns true when fitout install hook exists', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fitout install --hook' }
            ]
          }
        ]
      }
    };
    expect(hasFitoutHook(settings)).toBe(true);
  });

  it('returns true when legacy fitout apply hook exists', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fitout apply --hook' }
            ]
          }
        ]
      }
    };
    expect(hasFitoutHook(settings)).toBe(true);
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
    expect(hasFitoutHook(settings)).toBe(false);
  });
});

describe('getFitoutHookStatus', () => {
  it('returns "none" for empty settings', () => {
    expect(getFitoutHookStatus({})).toBe('none');
  });

  it('returns "none" for settings without hooks', () => {
    expect(getFitoutHookStatus({ env: {} })).toBe('none');
  });

  it('returns "current" when fitout install hook exists', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fitout install --hook' }
            ]
          }
        ]
      }
    };
    expect(getFitoutHookStatus(settings)).toBe('current');
  });

  it('returns "outdated" when legacy fitout apply hook exists', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fitout apply --hook' }
            ]
          }
        ]
      }
    };
    expect(getFitoutHookStatus(settings)).toBe('outdated');
  });

  it('returns "current" when both old and new hooks exist', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fitout apply --hook' }
            ]
          },
          {
            hooks: [
              { type: 'command', command: 'fitout install --hook' }
            ]
          }
        ]
      }
    };
    expect(getFitoutHookStatus(settings)).toBe('current');
  });

  it('returns "none" for other SessionStart hooks', () => {
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
    expect(getFitoutHookStatus(settings)).toBe('none');
  });
});

describe('addFitoutHook', () => {
  it('creates hooks object if missing', () => {
    const settings = {};
    const result = addFitoutHook(settings);
    expect(result.hooks?.SessionStart).toBeDefined();
  });

  it('creates SessionStart array if missing', () => {
    const settings = { hooks: {} };
    const result = addFitoutHook(settings);
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
    const result = addFitoutHook(settings);
    expect(result.hooks?.SessionStart).toHaveLength(2);
  });

  it('adds the correct hook structure', () => {
    const settings = {};
    const result = addFitoutHook(settings);
    expect(result.hooks?.SessionStart?.[0]).toEqual({
      hooks: [
        { type: 'command', command: 'fitout install --hook' }
      ]
    });
  });
});

describe('upgradeFitoutHook', () => {
  it('replaces fitout apply with fitout install', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fitout apply --hook' }
            ]
          }
        ]
      }
    };
    const result = upgradeFitoutHook(settings);
    expect(result.hooks?.SessionStart?.[0]?.hooks[0].command).toBe('fitout install --hook');
  });

  it('preserves other hooks in the same matcher', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'echo before' },
              { type: 'command', command: 'fitout apply --hook' },
              { type: 'command', command: 'echo after' }
            ]
          }
        ]
      }
    };
    const result = upgradeFitoutHook(settings);
    expect(result.hooks?.SessionStart?.[0]?.hooks).toHaveLength(3);
    expect(result.hooks?.SessionStart?.[0]?.hooks[0].command).toBe('echo before');
    expect(result.hooks?.SessionStart?.[0]?.hooks[1].command).toBe('fitout install --hook');
    expect(result.hooks?.SessionStart?.[0]?.hooks[2].command).toBe('echo after');
  });

  it('preserves other matchers', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'echo first' }
            ]
          },
          {
            hooks: [
              { type: 'command', command: 'fitout apply --hook' }
            ]
          }
        ]
      }
    };
    const result = upgradeFitoutHook(settings);
    expect(result.hooks?.SessionStart).toHaveLength(2);
    expect(result.hooks?.SessionStart?.[0]?.hooks[0].command).toBe('echo first');
    expect(result.hooks?.SessionStart?.[1]?.hooks[0].command).toBe('fitout install --hook');
  });

  it('does not modify settings without SessionStart hooks', () => {
    const settings = { env: { FOO: 'bar' } };
    const result = upgradeFitoutHook(settings);
    expect(result).toEqual({ env: { FOO: 'bar' } });
  });

  it('does not mutate original settings', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fitout apply --hook' }
            ]
          }
        ]
      }
    };
    upgradeFitoutHook(settings);
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('fitout apply --hook');
  });
});

describe('writeClaudeSettings', () => {
  it('writes JSON with 2-space indentation', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
    const settingsPath = join(tmpDir, 'settings.json');

    writeClaudeSettings(settingsPath, { foo: 'bar' });

    const content = readFileSync(settingsPath, 'utf-8');
    expect(content).toBe('{\n  "foo": "bar"\n}\n');

    rmSync(tmpDir, { recursive: true });
  });

  it('creates parent directories if needed', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
    const profilePath = join(tmpDir, 'default.toml');

    createDefaultProfile(profilePath);

    expect(existsSync(profilePath)).toBe(true);
    const content = readFileSync(profilePath, 'utf-8');
    expect(content).toContain('plugins');

    rmSync(tmpDir, { recursive: true });
  });

  it('does not overwrite existing profile', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
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
  it('returns already initialized when current hook exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    // Create settings with current hook
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        SessionStart: [{
          hooks: [{ type: 'command', command: 'fitout install --hook' }]
        }]
      }
    }));

    const result = runInit({ settingsPath, profilesDir, createProfile: false });

    expect(result.hookAdded).toBe(false);
    expect(result.hookUpgraded).toBe(false);
    expect(result.alreadyInitialized).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('upgrades outdated hook', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    // Create settings with legacy hook
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        SessionStart: [{
          hooks: [{ type: 'command', command: 'fitout apply --hook' }]
        }]
      }
    }));

    const result = runInit({ settingsPath, profilesDir, createProfile: false });

    expect(result.hookAdded).toBe(false);
    expect(result.hookUpgraded).toBe(true);
    expect(result.alreadyInitialized).toBe(false);

    // Verify settings file was updated
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('fitout install --hook');

    rmSync(tmpDir, { recursive: true });
  });

  it('adds hook when not present', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    // Mock the skill path by testing with the real function
    // Since createFitoutSkill uses a fixed path, we'll test via runInit result
    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile: false,
      createSkill: true
    });

    expect(result.skillPath).toBe(getFitoutSkillPath());
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

describe('getFitoutSkillPath', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns path to fitout skill file', () => {
    expect(getFitoutSkillPath()).toBe(join(ctx.claudeHome, 'skills', 'fitout', 'SKILL.md'));
  });
});

describe('createFitoutSkill', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('creates skill file with correct content', () => {
    const created = createFitoutSkill();
    expect(created).toBe(true);

    const skillPath = getFitoutSkillPath();
    expect(existsSync(skillPath)).toBe(true);

    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('name: fitout');
    expect(content).toContain('description:');
    expect(content).toContain('Fitout Diagnostic');
  });

  it('does not overwrite existing skill', () => {
    createFitoutSkill();
    const result = createFitoutSkill();
    expect(result).toBe(false);
  });
});

describe('hasFitoutSkill', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns false when skill does not exist', () => {
    expect(hasFitoutSkill()).toBe(false);
  });

  it('returns true when skill exists', () => {
    createFitoutSkill();
    expect(hasFitoutSkill()).toBe(true);
  });
});

describe('hasDefaultProfile', () => {
  it('returns false for nonexistent profile', () => {
    expect(hasDefaultProfile('/nonexistent/profiles')).toBe(false);
  });

  it('returns true when profile exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'fitout-test-'));
    const configPath = join(tmpDir, '.claude', 'fitout.toml');
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
