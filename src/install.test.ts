import { describe, it, expect } from 'vitest';
import { formatInstallResult, formatInstallResultHook, InstallResult, UnsatisfiableConstraint, runInstall } from './install.js';

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
      updated: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
      unsatisfiable: [],
    };
    expect(formatInstallResultHook(result)).toBe('');
  });

  it('returns Claude context when plugins installed', () => {
    const result: InstallResult = {
      installed: ['plugin-a@registry', 'plugin-b@registry'],
      updated: [],
      failed: [],
      alreadyPresent: [],
      unsatisfiable: [],
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
      updated: [],
      failed: [],
      alreadyPresent: [],
      unsatisfiable: [],
    };
    const output = formatInstallResultHook(result);
    expect(output).toContain('Fitout installed 1 plugin for this project');
    expect(output).not.toContain('1 plugins');
  });

  it('returns empty stdout and uses stderr for failures', () => {
    const result: InstallResult = {
      installed: [],
      updated: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
      unsatisfiable: [],
    };
    const formatted = formatInstallResultHook(result);
    // In hook mode, failures go to stderr, stdout stays empty
    expect(formatted).toBe('');
  });

  it('reports installs even when some fail', () => {
    const result: InstallResult = {
      installed: ['good@registry'],
      updated: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
      unsatisfiable: [],
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
      updated: [],
      failed: [],
      alreadyPresent: [],
      unsatisfiable: [],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('+ plugin-a@registry');
    expect(output).toContain('1 installed');
  });

  it('formats all present message', () => {
    const result: InstallResult = {
      installed: [],
      updated: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
      unsatisfiable: [],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('All 1 plugins present');
  });

  it('formats failures', () => {
    const result: InstallResult = {
      installed: [],
      updated: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
      unsatisfiable: [],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('✗ bad@registry');
    expect(output).toContain('1 failed');
  });

  it('formats updates', () => {
    const result: InstallResult = {
      installed: [],
      updated: ['plugin-a@registry'],
      failed: [],
      alreadyPresent: [],
      unsatisfiable: [],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('Updated:');
    expect(output).toContain('plugin-a@registry');
    expect(output).toContain('1 updated');
  });

  it('formats unsatisfiable constraints', () => {
    const result: InstallResult = {
      installed: [],
      updated: [],
      failed: [],
      alreadyPresent: [],
      unsatisfiable: [{
        pluginId: 'plugin-a@registry',
        installedVersion: '1.0.0',
        requiredConstraint: '2.0.0',
        marketplaceVersion: '1.5.0',
      }],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('Cannot satisfy constraints:');
    expect(output).toContain('plugin-a@registry');
    expect(output).toContain('Installed: 1.0.0');
    expect(output).toContain('Required:  >= 2.0.0');
    expect(output).toContain('Marketplace: 1.5.0');
    expect(output).toContain('1 unsatisfiable');
  });

  it('formats unsatisfiable with missing marketplace version', () => {
    const result: InstallResult = {
      installed: [],
      updated: [],
      failed: [],
      alreadyPresent: [],
      unsatisfiable: [{
        pluginId: 'plugin-a@registry',
        installedVersion: '1.0.0',
        requiredConstraint: '2.0.0',
        marketplaceVersion: null,
      }],
    };

    const output = formatInstallResult(result);
    expect(output).toContain('Marketplace: not found');
  });
});
