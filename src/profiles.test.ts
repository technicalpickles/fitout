import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadProfile, ResolvedPlugin } from './profiles.js';
import { existsSync, readFileSync } from 'node:fs';

vi.mock('node:fs');

describe('loadProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads existing profile and returns plugins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`
plugins = ["plugin-a@registry", "plugin-b@registry"]
`);

    const result = loadProfile('/profiles', 'backend');

    expect(result).toEqual(['plugin-a@registry', 'plugin-b@registry']);
    expect(readFileSync).toHaveBeenCalledWith('/profiles/backend.toml', 'utf-8');
  });

  it('returns null for missing profile', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = loadProfile('/profiles', 'nonexistent');

    expect(result).toBeNull();
  });

  it('returns empty array for profile with no plugins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`# empty profile`);

    const result = loadProfile('/profiles', 'empty');

    expect(result).toEqual([]);
  });
});
