// src/paths.ts
import { join } from 'node:path';
import { homedir } from 'node:os';

// === Base directories ===

export function getClaudeHome(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
}

export function getFettleConfigHome(): string {
  return process.env.FETTLE_CONFIG_HOME || join(homedir(), '.config', 'fettle');
}

// === Claude Code paths ===

export function getClaudeSettingsPath(): string {
  return join(getClaudeHome(), 'settings.json');
}

export function getClaudeSkillsDir(): string {
  return join(getClaudeHome(), 'skills');
}

export function getFettleSkillPath(): string {
  return join(getClaudeSkillsDir(), 'fettle', 'SKILL.md');
}

export function getClaudePluginsDir(): string {
  return join(getClaudeHome(), 'plugins');
}

export function getMarketplacesDir(): string {
  return join(getClaudePluginsDir(), 'marketplaces');
}

// === Fettle config paths ===

export function getGlobalConfigDir(): string {
  return getFettleConfigHome();
}

export function getGlobalConfigPath(): string {
  return join(getFettleConfigHome(), 'config.toml');
}

export function getProfilesDir(): string {
  return join(getFettleConfigHome(), 'profiles');
}
