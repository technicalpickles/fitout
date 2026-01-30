import { describe, it, expect } from 'vitest';
import { findConfigPath, resolveProjectRoot } from './context.js';

describe('resolveProjectRoot', () => {
  it('returns cwd when no git root exists', () => {
    const result = resolveProjectRoot('/tmp/not-a-repo');
    expect(result).toBe('/tmp/not-a-repo');
  });
});

describe('findConfigPath', () => {
  it('returns null when no config exists', () => {
    const result = findConfigPath('/tmp/not-a-repo');
    expect(result).toBeNull();
  });
});
