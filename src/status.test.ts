import { describe, it, expect, vi } from 'vitest';
import { formatStatus, formatStatusResolved, StatusDiff } from './status.js';
import { PluginDiff, PluginDiffResolved } from './diff.js';
import { ConstraintOverride } from './profiles.js';

describe('formatStatus', () => {
  it('formats all present as success', () => {
    const diff: PluginDiff = {
      missing: [],
      extra: [],
      present: [{ id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true }],
    };

    const output = formatStatus(diff);
    expect(output).toContain('✓');
    expect(output).toContain('plugin-a@registry');
  });

  it('formats missing plugins', () => {
    const diff: PluginDiff = {
      missing: ['plugin-b@registry'],
      extra: [],
      present: [],
    };

    const output = formatStatus(diff);
    expect(output).toContain('✗');
    expect(output).toContain('missing');
  });
});

describe('formatStatusResolved', () => {
  it('shows provenance for non-project plugins', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, source: 'default', constraint: null },
        { id: 'plugin-b@registry', version: '1.0', scope: 'local', enabled: true, source: 'project', constraint: null },
      ],
      missing: [
        { id: 'plugin-c@registry', source: 'backend', constraint: null },
      ],
      extra: [],
      outdated: [],
    };

    const result = formatStatusResolved(diff, false);

    expect(result).toContain('✓ plugin-a@registry 1.0 (from: default)');
    expect(result).toContain('✓ plugin-b@registry 1.0');
    expect(result).not.toContain('plugin-b@registry (from:'); // no provenance for project
    expect(result).toContain('✗ plugin-c@registry (from: backend) (missing)');
  });

  it('shows outdated plugins with version info', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin-a@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
      ],
      missing: [],
      extra: [],
      outdated: [
        {
          id: 'plugin-a@registry',
          installedVersion: '1.0.0',
          availableVersion: '2.0.0',
          scope: 'local',
        },
      ],
    };

    const result = formatStatusResolved(diff, false);

    expect(result).toContain('↑');
    expect(result).toContain('v1.0.0 → v2.0.0');
    expect(result).toContain('(outdated)');
    expect(result).not.toContain('✓ plugin-a'); // should use outdated symbol, not present
  });

  it('shows update tip when there are outdated plugins', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin-a@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
      ],
      missing: [],
      extra: [],
      outdated: [
        {
          id: 'plugin-a@registry',
          installedVersion: '1.0.0',
          availableVersion: '2.0.0',
          scope: 'local',
        },
      ],
    };

    const result = formatStatusResolved(diff, true);

    expect(result).toContain('fitout update');
    expect(result).toContain('fitout status --refresh');
  });

  it('hides refresh tip when showRefreshTip is false', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin-a@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
      ],
      missing: [],
      extra: [],
      outdated: [
        {
          id: 'plugin-a@registry',
          installedVersion: '1.0.0',
          availableVersion: '2.0.0',
          scope: 'local',
        },
      ],
    };

    const result = formatStatusResolved(diff, false);

    expect(result).toContain('fitout update');
    expect(result).not.toContain('fitout status --refresh');
  });

  it('shows correct summary counts with outdated plugins', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin-a@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
        { id: 'plugin-b@registry', version: '2.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
      ],
      missing: [],
      extra: [],
      outdated: [
        {
          id: 'plugin-a@registry',
          installedVersion: '1.0.0',
          availableVersion: '2.0.0',
          scope: 'local',
        },
      ],
    };

    const result = formatStatusResolved(diff, false);

    expect(result).toContain('1 present'); // only plugin-b is up-to-date
    expect(result).toContain('1 outdated');
  });

  it('does not show tips when no outdated plugins', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin-a@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
      ],
      missing: [],
      extra: [],
      outdated: [],
    };

    const result = formatStatusResolved(diff, true);

    expect(result).not.toContain('Tip:');
    expect(result).not.toContain('fitout update');
  });

  it('shows version for present plugins', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
      ],
      missing: [],
      extra: [],
      outdated: [],
    };

    const output = formatStatusResolved(diff, false);
    expect(output).toContain('plugin@registry 1.0.0');
  });

  it('shows constraint when present', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: '1.0.0' },
      ],
      missing: [],
      extra: [],
      outdated: [],
    };

    const output = formatStatusResolved(diff, false);
    expect(output).toContain('>= 1.0.0');
  });

  it('shows constraint override warnings', () => {
    const diff: StatusDiff = {
      present: [
        { id: 'plugin@registry', version: '2.0.0', scope: 'local', enabled: true, source: 'default', constraint: '2.0.0' },
      ],
      missing: [],
      extra: [],
      outdated: [],
    };
    const overrides: ConstraintOverride[] = [
      { pluginId: 'plugin@registry', projectConstraint: '1.0.0', winningConstraint: '2.0.0', winningSource: 'default' },
    ];

    const output = formatStatusResolved(diff, false, overrides);
    expect(output).toContain('Warnings:');
    expect(output).toContain('>= 1.0.0 (project) overridden by >= 2.0.0');
    expect(output).toContain('To fix:');
  });
});
