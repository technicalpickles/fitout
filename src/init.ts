// src/init.ts
import { join } from 'node:path';
import { homedir } from 'node:os';

export function getClaudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}
