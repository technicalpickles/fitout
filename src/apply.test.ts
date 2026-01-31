import { describe, it, expect } from 'vitest';
import { formatApplyResult, formatApplyResultHook, ApplyResult, runApply } from './apply.js';

describe('runApply with hook mode', () => {
  it('returns urgent message when no config found', () => {
    // runApply looks for .claude/fettle.toml in git root
    // When run in a temp dir with no config, hook mode provides urgent context for Claude
    const result = runApply('/tmp/nonexistent-project-dir', { hook: true });
    expect(result.output).toContain('FETTLE NOT CONFIGURED');
    expect(result.output).toContain('IMPORTANT');
    expect(result.output).toContain('fettle init');
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

  it('returns Claude context when plugins installed', () => {
    const result: ApplyResult = {
      installed: ['plugin-a@registry', 'plugin-b@registry'],
      failed: [],
      alreadyPresent: [],
    };
    const output = formatApplyResultHook(result);
    expect(output).toContain('<system-reminder>');
    expect(output).toContain('Fettle installed 2 plugins');
    expect(output).toContain('plugin-a@registry');
    expect(output).toContain('plugin-b@registry');
    expect(output).toContain('restart Claude Code');
    expect(output).toContain('fettle status');
  });

  it('uses singular for one plugin', () => {
    const result: ApplyResult = {
      installed: ['plugin-a@registry'],
      failed: [],
      alreadyPresent: [],
    };
    const output = formatApplyResultHook(result);
    expect(output).toContain('Fettle installed 1 plugin for this project');
    expect(output).not.toContain('1 plugins');
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
    expect(formatted).toContain('Fettle installed 1 plugin');
    expect(formatted).toContain('good@registry');
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

  it('formats all present message', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
    };

    const output = formatApplyResult(result);
    expect(output).toContain('All 1 plugins present');
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
