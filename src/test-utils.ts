// src/test-utils.ts
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { vi } from 'vitest';

// Project-local temp directory (gitignored)
const TEST_TMP_ROOT = join(import.meta.dirname, '..', '.test-tmp');

export interface TestContext {
  claudeHome: string;
  fettleHome: string;
  baseDir: string;
  cleanup: () => void;
}

let testCounter = 0;

export function setupTestEnv(): TestContext {
  const testId = `${Date.now()}-${++testCounter}`;
  const baseDir = join(TEST_TMP_ROOT, testId);
  const claudeHome = join(baseDir, '.claude');
  const fettleHome = join(baseDir, '.config', 'fettle');

  mkdirSync(claudeHome, { recursive: true });
  mkdirSync(fettleHome, { recursive: true });

  vi.stubEnv('CLAUDE_CONFIG_DIR', claudeHome);
  vi.stubEnv('FETTLE_CONFIG_HOME', fettleHome);

  return {
    claudeHome,
    fettleHome,
    baseDir,
    cleanup: () => {
      vi.unstubAllEnvs();
    },
  };
}

export function cleanTestTmp(): void {
  try {
    rmSync(TEST_TMP_ROOT, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // Ignore errors - directory might be in use by parallel tests
  }
}
