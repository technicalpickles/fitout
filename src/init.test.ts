// src/init.test.ts
import { describe, it, expect } from 'vitest';
import { getClaudeSettingsPath } from './init.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('getClaudeSettingsPath', () => {
  it('returns path to Claude settings.json', () => {
    expect(getClaudeSettingsPath()).toBe(join(homedir(), '.claude', 'settings.json'));
  });
});
