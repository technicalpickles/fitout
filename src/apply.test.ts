import { describe, it, expect } from 'vitest';
import { formatApplyResult, ApplyResult, runApply } from './apply.js';

describe('runApply with hook mode', () => {
  it('returns empty output when no config found', () => {
    // runApply looks for .claude/fettle.toml in git root
    // When run in a temp dir with no config, hook mode should be silent
    const result = runApply('/tmp/nonexistent-project-dir', { hook: true });
    expect(result.output).toBe('');
    expect(result.exitCode).toBe(0);
  });
});

describe('formatApplyResult', () => {
  it('formats successful installs', () => {
    const result: ApplyResult = {
      installed: ['plugin-a@registry'],
      failed: [],
      alreadyPresent: [],
    };

    const output = formatApplyResult(result);
    expect(output).toContain('+ plugin-a@registry');
    expect(output).toContain('1 plugin installed');
  });

  it('formats nothing to do', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
    };

    const output = formatApplyResult(result);
    expect(output).toContain('Nothing to do');
  });

  it('formats failures', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
    };

    const output = formatApplyResult(result);
    expect(output).toContain('✗ bad@registry');
    expect(output).toContain('1 failed');
  });
});
