// src/init.ts
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';

export function getClaudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}

export function readClaudeSettings(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function hasFettleHook(settings: Record<string, unknown>): boolean {
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks?.SessionStart) return false;

  const sessionStartHooks = hooks.SessionStart as Array<{ hooks?: Array<{ command?: string }> }>;

  return sessionStartHooks.some((matcher) =>
    matcher.hooks?.some((hook) => hook.command?.includes('fettle apply --hook'))
  );
}

interface ClaudeSettings {
  hooks?: {
    SessionStart?: Array<{
      hooks: Array<{ type: string; command: string }>;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function addFettleHook(settings: Record<string, unknown>): ClaudeSettings {
  const result = { ...settings } as ClaudeSettings;

  if (!result.hooks) {
    result.hooks = {};
  }

  if (!result.hooks.SessionStart) {
    result.hooks.SessionStart = [];
  }

  result.hooks.SessionStart.push({
    hooks: [
      { type: 'command', command: 'fettle apply --hook' }
    ]
  });

  return result;
}

export function writeClaudeSettings(path: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
}
