import { describe, it, expect, vi } from 'vitest';
import { formatStatus } from './status.js';
import { PluginDiff } from './diff.js';

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
