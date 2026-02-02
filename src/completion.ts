import tabtab, { type SupportedShell } from '@pnpm/tabtab';
import { listPlugins } from './claude.js';
import { resolveProjectRoot } from './context.js';
import { listAvailablePlugins } from './marketplace.js';
import { findOutdatedPlugins } from './update.js';

const COMMANDS = ['status', 'install', 'update', 'marketplace', 'init', 'completion'];
const MARKETPLACE_SUBCOMMANDS = ['refresh'];
const COMPLETION_SUBCOMMANDS = ['install', 'uninstall'];

const FLAGS: Record<string, string[]> = {
  status: ['--refresh'],
  install: ['--dry-run', '--hook'],
  update: ['--refresh', '--dry-run'],
  init: ['-y', '--yes', '--hook-only'],
};

/**
 * Get outdated plugin IDs for the current project (for `update` completion)
 * Falls back to all installed plugins if marketplace data unavailable
 */
function getOutdatedPluginIds(): string[] {
  try {
    const projectRoot = resolveProjectRoot(process.cwd());
    const installed = listPlugins();
    const available = listAvailablePlugins();

    // If we have marketplace data, show only outdated plugins
    if (available.length > 0) {
      const outdated = findOutdatedPlugins(installed, available, projectRoot);
      return outdated.map((p) => p.id);
    }

    // Fall back to all installed plugins if no marketplace data
    return installed
      .filter((p) => p.scope === 'local' && p.projectPath === projectRoot)
      .map((p) => p.id);
  } catch {
    return [];
  }
}

/**
 * Log completions helper
 */
function log(items: string[], shell: SupportedShell): void {
  tabtab.log(items, shell, console.log);
}

/**
 * Handle shell completion requests.
 * Call this early in CLI startup - returns true if we handled a completion request.
 */
export function handleCompletion(): boolean {
  const env = tabtab.parseEnv(process.env);

  if (!env.complete) {
    return false;
  }

  const { prev, last } = env;
  const shell = tabtab.getShellFromEnv(process.env);

  // Command-level completion: `fitout <tab>`
  if (prev === 'fitout') {
    log(COMMANDS, shell);
    return true;
  }

  // Subcommand completion: `fitout marketplace <tab>`
  if (prev === 'marketplace') {
    log(MARKETPLACE_SUBCOMMANDS, shell);
    return true;
  }

  // Subcommand completion: `fitout completion <tab>`
  if (prev === 'completion') {
    log(COMPLETION_SUBCOMMANDS, shell);
    return true;
  }

  // Flag completion for commands
  if (FLAGS[prev]) {
    log(FLAGS[prev], shell);
    return true;
  }

  // Plugin completion for `fitout update <tab>`
  if (prev === 'update' || isAfterUpdate(env)) {
    const plugins = getOutdatedPluginIds();
    const flags = FLAGS['update'] || [];
    log([...plugins, ...flags], shell);
    return true;
  }

  // Flag completion when typing `--`
  const command = findCommand(env);
  if (command && last.startsWith('-') && FLAGS[command]) {
    const matching = FLAGS[command].filter((f) => f.startsWith(last));
    log(matching.length > 0 ? matching : FLAGS[command], shell);
    return true;
  }

  // Default: show commands
  log(COMMANDS, shell);
  return true;
}

/**
 * Check if we're completing after `update` (for multiple plugin args)
 */
function isAfterUpdate(env: ReturnType<typeof tabtab.parseEnv>): boolean {
  const words = env.line?.split(/\s+/) || [];
  return words.includes('update');
}

/**
 * Find which command is being completed
 */
function findCommand(env: ReturnType<typeof tabtab.parseEnv>): string | null {
  const words = env.line?.split(/\s+/) || [];
  for (const word of words) {
    if (COMMANDS.includes(word)) {
      return word;
    }
  }
  return null;
}

/**
 * Install shell completions
 */
export async function installCompletion(shell?: SupportedShell): Promise<void> {
  await tabtab.install({
    name: 'fitout',
    completer: 'fitout',
    ...(shell && { shell }),
  });
}

/**
 * Uninstall shell completions
 */
export async function uninstallCompletion(): Promise<void> {
  await tabtab.uninstall({
    name: 'fitout',
  });
}
