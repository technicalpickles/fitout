import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { listAvailablePlugins, getMarketplacesDir } from './marketplace.js';

vi.mock('node:fs');

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe('listAvailablePlugins', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty array when marketplaces dir does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const result = listAvailablePlugins();

    expect(result).toEqual([]);
  });

  it('parses plugins from marketplace.json', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: 'my-marketplace', isDirectory: () => true },
    ] as any);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        name: 'my-marketplace',
        plugins: [
          { name: 'plugin-a', version: '1.0.0', source: './plugins/plugin-a' },
          { name: 'plugin-b', version: '2.1.0', source: './plugins/plugin-b' },
        ],
      })
    );

    const result = listAvailablePlugins();

    expect(result).toEqual([
      { id: 'plugin-a@my-marketplace', version: '1.0.0', marketplace: 'my-marketplace' },
      { id: 'plugin-b@my-marketplace', version: '2.1.0', marketplace: 'my-marketplace' },
    ]);
  });

  it('handles multiple marketplaces', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: 'marketplace-1', isDirectory: () => true },
      { name: 'marketplace-2', isDirectory: () => true },
    ] as any);
    mockReadFileSync
      .mockReturnValueOnce(
        JSON.stringify({
          name: 'marketplace-1',
          plugins: [{ name: 'foo', version: '1.0.0', source: './plugins/foo' }],
        })
      )
      .mockReturnValueOnce(
        JSON.stringify({
          name: 'marketplace-2',
          plugins: [{ name: 'bar', version: '2.0.0', source: './plugins/bar' }],
        })
      );

    const result = listAvailablePlugins();

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      id: 'foo@marketplace-1',
      version: '1.0.0',
      marketplace: 'marketplace-1',
    });
    expect(result).toContainEqual({
      id: 'bar@marketplace-2',
      version: '2.0.0',
      marketplace: 'marketplace-2',
    });
  });

  it('skips marketplaces without manifest', () => {
    mockExistsSync
      .mockReturnValueOnce(true) // marketplaces dir exists
      .mockReturnValueOnce(false); // manifest doesn't exist
    mockReaddirSync.mockReturnValue([
      { name: 'no-manifest', isDirectory: () => true },
    ] as any);

    const result = listAvailablePlugins();

    expect(result).toEqual([]);
  });

  it('skips malformed manifests', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: 'bad-marketplace', isDirectory: () => true },
    ] as any);
    mockReadFileSync.mockReturnValue('not valid json');

    const result = listAvailablePlugins();

    expect(result).toEqual([]);
  });

  it('handles remote plugin sources', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      { name: 'remote-marketplace', isDirectory: () => true },
    ] as any);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        name: 'remote-marketplace',
        plugins: [
          {
            name: 'remote-plugin',
            version: '3.0.0',
            source: { source: 'url', url: 'https://github.com/foo/bar.git' },
          },
        ],
      })
    );

    const result = listAvailablePlugins();

    expect(result).toEqual([
      {
        id: 'remote-plugin@remote-marketplace',
        version: '3.0.0',
        marketplace: 'remote-marketplace',
      },
    ]);
  });
});

describe('getMarketplacesDir', () => {
  it('returns path under home directory', () => {
    const dir = getMarketplacesDir();
    expect(dir).toContain('.claude');
    expect(dir).toContain('plugins');
    expect(dir).toContain('marketplaces');
  });
});
