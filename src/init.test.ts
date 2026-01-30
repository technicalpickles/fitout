// src/init.test.ts
import { describe, it, expect } from 'vitest';
import { getClaudeSettingsPath, readClaudeSettings } from './init.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('getClaudeSettingsPath', () => {
  it('returns path to Claude settings.json', () => {
    expect(getClaudeSettingsPath()).toBe(join(homedir(), '.claude', 'settings.json'));
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
