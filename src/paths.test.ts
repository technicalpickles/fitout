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

  describe('getFitoutConfigHome', () => {
    it('returns ~/.config/fitout by default', async () => {
      const { getFitoutConfigHome } = await import('./paths.js');
      expect(getFitoutConfigHome()).toBe(join(homedir(), '.config', 'fitout'));
    });

    it('respects FITOUT_CONFIG_HOME env var', async () => {
      vi.stubEnv('FITOUT_CONFIG_HOME', '/custom/fitout');
      vi.resetModules();
      const { getFitoutConfigHome } = await import('./paths.js');
      expect(getFitoutConfigHome()).toBe('/custom/fitout');
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

    it('getFitoutSkillPath builds on getClaudeSkillsDir', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getFitoutSkillPath } = await import('./paths.js');
      expect(getFitoutSkillPath()).toBe('/test/claude/skills/fitout/SKILL.md');
    });

    it('getMarketplacesDir builds on getClaudeHome', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getMarketplacesDir } = await import('./paths.js');
      expect(getMarketplacesDir()).toBe('/test/claude/plugins/marketplaces');
    });

    it('getProfilesDir builds on getFitoutConfigHome', async () => {
      vi.stubEnv('FITOUT_CONFIG_HOME', '/test/fitout');
      vi.resetModules();
      const { getProfilesDir } = await import('./paths.js');
      expect(getProfilesDir()).toBe('/test/fitout/profiles');
    });

    it('getGlobalConfigPath builds on getFitoutConfigHome', async () => {
      vi.stubEnv('FITOUT_CONFIG_HOME', '/test/fitout');
      vi.resetModules();
      const { getGlobalConfigPath } = await import('./paths.js');
      expect(getGlobalConfigPath()).toBe('/test/fitout/config.toml');
    });
  });
});
