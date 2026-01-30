import { describe, it, expect } from 'vitest';
import { formatApplyResult, ApplyResult } from './apply.js';

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
