import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import tabtab from '@pnpm/tabtab';

// Mock tabtab
vi.mock('@pnpm/tabtab', () => ({
  default: {
    parseEnv: vi.fn(),
    getShellFromEnv: vi.fn(),
    log: vi.fn(),
    install: vi.fn(),
    uninstall: vi.fn(),
  },
}));

// Mock dependencies to avoid side effects
vi.mock('./claude.js', () => ({
  listPlugins: vi.fn(() => []),
}));

vi.mock('./context.js', () => ({
  resolveProjectRoot: vi.fn(() => '/test/project'),
}));

vi.mock('./marketplace.js', () => ({
  listAvailablePlugins: vi.fn(() => []),
}));

vi.mock('./update.js', () => ({
  findOutdatedPlugins: vi.fn(() => []),
}));

describe('completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('handleCompletion', () => {
    it('returns false when not in completion mode', async () => {
      vi.mocked(tabtab.parseEnv).mockReturnValue({
        complete: false,
        words: 0,
        point: 0,
        line: '',
        partial: '',
        last: '',
        lastPartial: '',
        prev: '',
      });

      const { handleCompletion } = await import('./completion.js');
      expect(handleCompletion()).toBe(false);
      expect(tabtab.log).not.toHaveBeenCalled();
    });

    it('completes commands for "fettle <tab>"', async () => {
      vi.mocked(tabtab.parseEnv).mockReturnValue({
        complete: true,
        words: 1,
        point: 7,
        line: 'fettle ',
        partial: 'fettle ',
        last: '',
        lastPartial: '',
        prev: 'fettle',
      });
      vi.mocked(tabtab.getShellFromEnv).mockReturnValue('bash');

      const { handleCompletion } = await import('./completion.js');
      expect(handleCompletion()).toBe(true);
      expect(tabtab.log).toHaveBeenCalledWith(
        ['status', 'install', 'update', 'marketplace', 'init', 'completion'],
        'bash',
        console.log
      );
    });

    it('completes marketplace subcommands', async () => {
      vi.mocked(tabtab.parseEnv).mockReturnValue({
        complete: true,
        words: 2,
        point: 19,
        line: 'fettle marketplace ',
        partial: 'fettle marketplace ',
        last: '',
        lastPartial: '',
        prev: 'marketplace',
      });
      vi.mocked(tabtab.getShellFromEnv).mockReturnValue('zsh');

      const { handleCompletion } = await import('./completion.js');
      expect(handleCompletion()).toBe(true);
      expect(tabtab.log).toHaveBeenCalledWith(['refresh'], 'zsh', console.log);
    });

    it('completes completion subcommands', async () => {
      vi.mocked(tabtab.parseEnv).mockReturnValue({
        complete: true,
        words: 2,
        point: 18,
        line: 'fettle completion ',
        partial: 'fettle completion ',
        last: '',
        lastPartial: '',
        prev: 'completion',
      });
      vi.mocked(tabtab.getShellFromEnv).mockReturnValue('bash');

      const { handleCompletion } = await import('./completion.js');
      expect(handleCompletion()).toBe(true);
      expect(tabtab.log).toHaveBeenCalledWith(['install', 'uninstall'], 'bash', console.log);
    });

    it('completes flags for status command', async () => {
      vi.mocked(tabtab.parseEnv).mockReturnValue({
        complete: true,
        words: 2,
        point: 14,
        line: 'fettle status ',
        partial: 'fettle status ',
        last: '',
        lastPartial: '',
        prev: 'status',
      });
      vi.mocked(tabtab.getShellFromEnv).mockReturnValue('bash');

      const { handleCompletion } = await import('./completion.js');
      expect(handleCompletion()).toBe(true);
      expect(tabtab.log).toHaveBeenCalledWith(['--refresh'], 'bash', console.log);
    });

    it('completes flags for install command', async () => {
      vi.mocked(tabtab.parseEnv).mockReturnValue({
        complete: true,
        words: 2,
        point: 15,
        line: 'fettle install ',
        partial: 'fettle install ',
        last: '',
        lastPartial: '',
        prev: 'install',
      });
      vi.mocked(tabtab.getShellFromEnv).mockReturnValue('bash');

      const { handleCompletion } = await import('./completion.js');
      expect(handleCompletion()).toBe(true);
      expect(tabtab.log).toHaveBeenCalledWith(['--dry-run', '--hook'], 'bash', console.log);
    });
  });

  describe('installCompletion', () => {
    it('calls tabtab.install with name and completer', async () => {
      const { installCompletion } = await import('./completion.js');
      await installCompletion();

      expect(tabtab.install).toHaveBeenCalledWith({
        name: 'fettle',
        completer: 'fettle',
      });
    });

    it('passes shell when specified', async () => {
      const { installCompletion } = await import('./completion.js');
      await installCompletion('zsh');

      expect(tabtab.install).toHaveBeenCalledWith({
        name: 'fettle',
        completer: 'fettle',
        shell: 'zsh',
      });
    });
  });

  describe('uninstallCompletion', () => {
    it('calls tabtab.uninstall with name', async () => {
      const { uninstallCompletion } = await import('./completion.js');
      await uninstallCompletion();

      expect(tabtab.uninstall).toHaveBeenCalledWith({
        name: 'fettle',
      });
    });
  });
});
