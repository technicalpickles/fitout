import { describe, it, expect, vi } from 'vitest';
import { formatStatus, formatStatusResolved } from './status.js';
import { PluginDiff, PluginDiffResolved } from './diff.js';

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
    const diff: PluginDiffResolved = {
      present: [
        { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, source: 'default' },
        { id: 'plugin-b@registry', version: '1.0', scope: 'local', enabled: true, source: 'project' },
      ],
      missing: [
        { id: 'plugin-c@registry', source: 'backend' },
      ],
      extra: [],
    };

    const result = formatStatusResolved(diff);

    expect(result).toContain('✓ plugin-a@registry (from: default)');
    expect(result).toContain('✓ plugin-b@registry');
    expect(result).not.toContain('plugin-b@registry (from:'); // no provenance for project
    expect(result).toContain('✗ plugin-c@registry (from: backend) (missing)');
  });
});
