// src/paths.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('paths', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getClaudeHome', () => {
    it('returns ~/.claude by default', async () => {
      const { getClaudeHome } = await import('./paths.js');
      expect(getClaudeHome()).toBe(join(homedir(), '.claude'));
    });

    it('respects CLAUDE_CONFIG_DIR env var', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/custom/claude');
      vi.resetModules();
      const { getClaudeHome } = await import('./paths.js');
      expect(getClaudeHome()).toBe('/custom/claude');
    });
  });

  describe('getFettleConfigHome', () => {
    it('returns ~/.config/fettle by default', async () => {
      const { getFettleConfigHome } = await import('./paths.js');
      expect(getFettleConfigHome()).toBe(join(homedir(), '.config', 'fettle'));
    });

    it('respects FETTLE_CONFIG_HOME env var', async () => {
      vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
      vi.resetModules();
      const { getFettleConfigHome } = await import('./paths.js');
      expect(getFettleConfigHome()).toBe('/custom/fettle');
    });
  });

  describe('derived paths', () => {
    it('getClaudeSettingsPath builds on getClaudeHome', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getClaudeSettingsPath } = await import('./paths.js');
      expect(getClaudeSettingsPath()).toBe('/test/claude/settings.json');
    });

    it('getClaudeSkillsDir builds on getClaudeHome', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getClaudeSkillsDir } = await import('./paths.js');
      expect(getClaudeSkillsDir()).toBe('/test/claude/skills');
    });

    it('getFettleSkillPath builds on getClaudeSkillsDir', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getFettleSkillPath } = await import('./paths.js');
      expect(getFettleSkillPath()).toBe('/test/claude/skills/fettle/SKILL.md');
    });

    it('getMarketplacesDir builds on getClaudeHome', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getMarketplacesDir } = await import('./paths.js');
      expect(getMarketplacesDir()).toBe('/test/claude/plugins/marketplaces');
    });

    it('getProfilesDir builds on getFettleConfigHome', async () => {
      vi.stubEnv('FETTLE_CONFIG_HOME', '/test/fettle');
      vi.resetModules();
      const { getProfilesDir } = await import('./paths.js');
      expect(getProfilesDir()).toBe('/test/fettle/profiles');
    });

    it('getGlobalConfigPath builds on getFettleConfigHome', async () => {
      vi.stubEnv('FETTLE_CONFIG_HOME', '/test/fettle');
      vi.resetModules();
      const { getGlobalConfigPath } = await import('./paths.js');
      expect(getGlobalConfigPath()).toBe('/test/fettle/config.toml');
    });
  });
});
