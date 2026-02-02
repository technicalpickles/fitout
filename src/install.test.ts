import { describe, it, expect } from 'vitest';
import { formatInstallResult, formatInstallResultHook, InstallResult, runInstall } from './install.js';

describe('runInstall with hook mode', () => {
  it('returns urgent message when no config found', () => {
    // runInstall looks for .claude/fitout.toml in git root
    // When run in a temp dir with no config, hook mode provides urgent context for Claude
    const result = runInstall('/tmp/nonexistent-project-dir', { hook: true });
    expect(result.output).toContain('FITOUT NOT CONFIGURED');
    expect(result.output).toContain('IMPORTANT');
    expect(result.output).toContain('fitout init');
    expect(result.exitCode).toBe(0);
  });
});

describe('formatInstallResultHook', () => {
  it('returns empty string when nothing to do', () => {
    const result: InstallResult = {
      installed: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
    };
    expect(formatInstallResultHook(result)).toBe('');
  });

  it('returns Claude context when plugins installed', () => {
    const result: InstallResult = {
      installed: ['plugin-a@registry', 'plugin-b@registry'],
      failed: [],
      alreadyPresent: [],
    };
    const output = formatInstallResultHook(result);
    expect(output).toContain('<system-reminder>');
    expect(output).toContain('Fitout installed 2 plugins');
    expect(output).toContain('plugin-a@registry');
    expect(output).toContain('plugin-b@registry');
    expect(output).toContain('restart Claude Code');
    expect(output).toContain('fitout status');
  });

  it('uses singular for one plugin', () => {
    const result: InstallResult = {
      installed: ['plugin-a@registry'],
      failed: [],
      alreadyPresent: [],
    };
    const output = formatInstallResultHook(result);
    expect(output).toContain('Fitout installed 1 plugin for this project');
    expect(output).not.toContain('1 plugins');
  });

  it('returns empty stdout and uses stderr for failures', () => {
    const result: InstallResult = {
      installed: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
    };
    const formatted = formatInstallResultHook(result);
    // In hook mode, failures go to stderr, stdout stays empty
    expect(formatted).toBe('');
  });

  it('reports installs even when some fail', () => {
    const result: InstallResult = {
      installed: ['good@registry'],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
    };
    const formatted = formatInstallResultHook(result);
    expect(formatted).toContain('Fitout installed 1 plugin');
    expect(formatted).toContain('good@registry');
  });
});

describe('formatInstallResult', () => {
  it('formats successful installs', () => {
    const result: InstallResult = {
      installed: ['plugin-a@registry'],
      failed: [],
      alreadyPresent: [],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('+ plugin-a@registry');
    expect(output).toContain('1 plugin installed');
  });

  it('formats all present message', () => {
    const result: InstallResult = {
      installed: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('All 1 plugins present');
  });

  it('formats failures', () => {
    const result: InstallResult = {
      installed: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('✗ bad@registry');
    expect(output).toContain('1 failed');
  });
});
