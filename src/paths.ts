// src/paths.ts
import { join } from 'node:path';
import { homedir } from 'node:os';

// === Base directories ===

export function getClaudeHome(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
}

export function getFitoutConfigHome(): string {
  return process.env.FITOUT_CONFIG_HOME || join(homedir(), '.config', 'fitout');
}

// === Claude Code paths ===

export function getClaudeSettingsPath(): string {
  return join(getClaudeHome(), 'settings.json');
}

export function getClaudeSkillsDir(): string {
  return join(getClaudeHome(), 'skills');
}

export function getFitoutSkillPath(): string {
  return join(getClaudeSkillsDir(), 'fitout', 'SKILL.md');
}

export function getClaudePluginsDir(): string {
  return join(getClaudeHome(), 'plugins');
}

export function getMarketplacesDir(): string {
  return join(getClaudePluginsDir(), 'marketplaces');
}

// === Fitout config paths ===

export function getGlobalConfigDir(): string {
  return getFitoutConfigHome();
}

export function getGlobalConfigPath(): string {
  return join(getFitoutConfigHome(), 'config.toml');
}

export function getProfilesDir(): string {
  return join(getFitoutConfigHome(), 'profiles');
}
