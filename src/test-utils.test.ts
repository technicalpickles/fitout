// src/test-utils.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { setupTestEnv, cleanTestTmp } from './test-utils.js';
import { getClaudeHome, getFettleConfigHome } from './paths.js';

describe('setupTestEnv', () => {
  afterEach(() => {
    cleanTestTmp();
  });

  it('creates isolated directories', () => {
    const ctx = setupTestEnv();

    expect(existsSync(ctx.claudeHome)).toBe(true);
    expect(existsSync(ctx.fettleHome)).toBe(true);

    ctx.cleanup();
  });

  it('sets env vars so paths.ts returns isolated paths', () => {
    const ctx = setupTestEnv();

    expect(getClaudeHome()).toBe(ctx.claudeHome);
    expect(getFettleConfigHome()).toBe(ctx.fettleHome);

    ctx.cleanup();
  });

  it('cleanup unstubs env vars', () => {
    const ctx = setupTestEnv();
    const isolatedClaude = ctx.claudeHome;

    ctx.cleanup();

    // After cleanup, should return default (not isolated path)
    expect(getClaudeHome()).not.toBe(isolatedClaude);
  });
});
