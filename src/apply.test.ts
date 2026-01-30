import { describe, it, expect } from 'vitest';
import { formatApplyResult, formatApplyResultHook, ApplyResult, runApply } from './apply.js';

describe('runApply with hook mode', () => {
  it('returns empty output when no config found', () => {
    // runApply looks for .claude/fettle.toml in git root
    // When run in a temp dir with no config, hook mode should be silent
    const result = runApply('/tmp/nonexistent-project-dir', { hook: true });
    expect(result.output).toBe('');
    expect(result.exitCode).toBe(0);
  });
});

describe('formatApplyResultHook', () => {
  it('returns empty string when nothing to do', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
    };
    expect(formatApplyResultHook(result)).toBe('');
  });

  it('returns restart message when plugins installed', () => {
    const result: ApplyResult = {
      installed: ['plugin-a@registry', 'plugin-b@registry'],
      failed: [],
      alreadyPresent: [],
    };
    expect(formatApplyResultHook(result)).toBe('Installed 2 plugins. Restart Claude to activate.');
  });

  it('uses singular for one plugin', () => {
    const result: ApplyResult = {
      installed: ['plugin-a@registry'],
      failed: [],
      alreadyPresent: [],
    };
    expect(formatApplyResultHook(result)).toBe('Installed 1 plugin. Restart Claude to activate.');
  });

  it('returns empty stdout and uses stderr for failures', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
    };
    const formatted = formatApplyResultHook(result);
    // In hook mode, failures go to stderr, stdout stays empty
    expect(formatted).toBe('');
  });

  it('reports installs even when some fail', () => {
    const result: ApplyResult = {
      installed: ['good@registry'],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
    };
    const formatted = formatApplyResultHook(result);
    expect(formatted).toBe('Installed 1 plugin. Restart Claude to activate.');
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
