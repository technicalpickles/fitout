// src/init.ts
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, existsSync } from 'node:fs';

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
