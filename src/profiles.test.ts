import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadProfile, resolveProfiles } from './profiles.js';
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

describe('resolveProfiles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns project plugins when no profiles', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'project-plugin@registry', source: 'project', constraint: null },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('parses plugin constraints', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= 1.2.0'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'plugin@registry', source: 'project', constraint: '1.2.0' },
    ]);
  });

  it('auto-includes default profile when exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["default-plugin@registry"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'default-plugin@registry', source: 'default', constraint: null },
      { id: 'project-plugin@registry', source: 'project', constraint: null },
    ]);
  });

  it('skips missing default silently', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.errors).toEqual([]);
  });

  it('errors on missing explicit profile', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return !String(path).includes('nonexistent');
    });
    vi.mocked(readFileSync).mockReturnValue(`plugins = []`);

    const result = resolveProfiles('/profiles', {
      plugins: [],
      profiles: ['nonexistent'],
    });

    expect(result.errors).toEqual(['Profile not found: nonexistent']);
  });

  it('loads explicit profiles', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation((path) => {
      if (String(path).includes('backend')) {
        return `plugins = ["backend-plugin@registry"]`;
      }
      return `plugins = []`;
    });

    const result = resolveProfiles('/profiles', {
      plugins: [],
      profiles: ['backend'],
    });

    expect(result.plugins).toContainEqual({
      id: 'backend-plugin@registry',
      source: 'backend',
      constraint: null,
    });
  });

  it('dedupes plugins, first source wins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["shared-plugin@registry"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['shared-plugin@registry'],
      profiles: [],
    });

    const shared = result.plugins.filter((p) => p.id === 'shared-plugin@registry');
    expect(shared).toHaveLength(1);
    expect(shared[0].source).toBe('default');
  });

  it('merges constraints - higher wins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["plugin@registry >= 2.0.0"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= 1.0.0'],
      profiles: [],
    });

    const plugin = result.plugins.find((p) => p.id === 'plugin@registry');
    expect(plugin?.constraint).toBe('2.0.0');
  });

  it('tracks when project constraint is overridden', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["plugin@registry >= 2.0.0"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= 1.0.0'],
      profiles: [],
    });

    expect(result.constraintOverrides).toEqual([
      {
        pluginId: 'plugin@registry',
        projectConstraint: '1.0.0',
        winningConstraint: '2.0.0',
        winningSource: 'default',
      },
    ]);
  });

  it('collects parse errors', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= abc'],
      profiles: [],
    });

    expect(result.errors).toContainEqual(
      expect.stringContaining('Invalid version "abc"')
    );
  });
});
