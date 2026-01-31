#!/usr/bin/env node
import { program } from 'commander';
import { runStatus } from './status.js';
import { runApply } from './apply.js';
import { runInit, getClaudeSettingsPath, getProjectConfigPath } from './init.js';
import { getProfilesDir, resolveProjectRoot } from './context.js';
import { confirm, input } from './prompt.js';
import { colors, symbols } from './colors.js';
import { refreshMarketplaces, listAvailablePlugins } from './marketplace.js';
import { runUpdate, updatePlugin } from './update.js';
import { listPlugins } from './claude.js';
import { handleCompletion, installCompletion, uninstallCompletion } from './completion.js';
import type { SupportedShell } from '@pnpm/tabtab';

// Handle shell completion requests before command parsing
if (handleCompletion()) {
  process.exit(0);
}

program
  .name('fettle')
  .description('Context-aware plugin manager for Claude Code')
  .version('0.1.0');

program
  .command('status')
  .description('Show desired vs actual plugin state')
  .option('--refresh', 'Refresh marketplace data before checking')
  .action((options) => {
    const { output, exitCode } = runStatus(process.cwd(), {
      refresh: options.refresh,
    });
    console.log(output);
    process.exit(exitCode);
  });

program
  .command('apply')
  .description('Install missing plugins to sync desired state')
  .option('--dry-run', 'Show what would change without applying')
  .option('--hook', 'Hook mode: silent on no-op, minimal output for Claude context')
  .action((options) => {
    const { output, exitCode } = runApply(process.cwd(), {
      dryRun: options.dryRun,
      hook: options.hook,
    });
    if (output) {
      console.log(output);
    }
    process.exit(exitCode);
  });

program
  .command('update [plugins...]')
  .description('Update outdated plugins (all if no plugins specified)')
  .option('--refresh', 'Refresh marketplace data before updating')
  .option('--dry-run', 'Show what would be updated without applying')
  .action((plugins, options) => {
    const projectRoot = resolveProjectRoot(process.cwd());

    if (options.refresh) {
      console.log('Refreshing marketplaces...');
      refreshMarketplaces();
    }

    const installed = listPlugins();
    const available = listAvailablePlugins();

    const result = runUpdate(projectRoot, installed, available, plugins, {
      dryRun: options.dryRun,
    });

    if (result.output) {
      console.log(result.output);
    }

    if (result.exitCode !== 0) {
      process.exit(result.exitCode);
    }

    // Perform actual updates
    if (result.pluginsToUpdate.length > 0) {
      for (const plugin of result.pluginsToUpdate) {
        console.log(`  ${symbols.outdated} ${plugin.id} v${plugin.installedVersion} → v${plugin.availableVersion}`);
        updatePlugin(plugin.id);
      }

      console.log('');
      console.log(
        `Updated ${result.pluginsToUpdate.length} plugin${result.pluginsToUpdate.length > 1 ? 's' : ''}. Restart Claude to apply changes.`
      );
    }

    process.exit(0);
  });

// Marketplace subcommands
const marketplace = program
  .command('marketplace')
  .description('Manage Claude Code marketplaces');

marketplace
  .command('refresh')
  .description('Update marketplace data from sources')
  .action(() => {
    console.log('Refreshing marketplaces...');
    refreshMarketplaces();
    console.log(`${symbols.present} Marketplaces updated`);
    process.exit(0);
  });

program
  .command('init')
  .description('Set up Fettle integration with Claude Code')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .option('--hook-only', 'Only add the hook, do not create profile or project config')
  .action(async (options) => {
    const settingsPath = getClaudeSettingsPath();
    const profilesDir = getProfilesDir();
    const projectRoot = resolveProjectRoot(process.cwd());
    const projectConfigPath = getProjectConfigPath(projectRoot);

    let createProfile = false;
    let profileName = 'default';
    let createProjectConfig = false;

    if (options.hookOnly) {
      createProfile = false;
      createProjectConfig = false;
    } else if (options.yes) {
      createProfile = true;
      createProjectConfig = true;
    } else {
      // Interactive mode
      console.log('Fettle - Context-aware plugin manager for Claude Code\n');
      console.log('This will:');
      console.log(`  - Add a SessionStart hook to ${settingsPath}`);
      console.log(`  - Create ${profilesDir}/ for shared plugin profiles`);
      console.log(`  - Create ${projectConfigPath} for this project\n`);

      createProfile = await confirm('Create a default profile?');
      if (createProfile) {
        profileName = await input('Profile name', 'default');
      }

      createProjectConfig = await confirm('Create project config (.claude/fettle.toml)?');
    }

    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile,
      profileName,
      projectRoot,
      createProjectConfig,
    });

    if (result.alreadyInitialized && !result.profileCreated && !result.projectConfigCreated) {
      console.log('\nFettle is already initialized.');
      process.exit(0);
    }

    console.log(`\n${colors.header('Created:')}`);
    if (result.hookAdded) {
      console.log(`  ${symbols.present} SessionStart hook added to ${settingsPath}`);
    }
    if (result.profileCreated) {
      console.log(`  ${symbols.present} ${result.profilePath}`);
    }
    if (result.projectConfigCreated) {
      console.log(`  ${symbols.present} ${result.projectConfigPath}`);
    }
    if (result.alreadyInitialized) {
      console.log(colors.dim('  (hook already existed)'));
    }

    console.log(`\n${colors.header('Next steps:')}`);
    if (result.profileCreated) {
      console.log(`  ${colors.dim('-')} Add plugins to your profile: ${result.profilePath}`);
    }
    if (result.projectConfigCreated) {
      console.log(`  ${colors.dim('-')} Add plugins to your project config: ${result.projectConfigPath}`);
    }
    console.log(`  ${colors.dim('-')} Restart Claude to activate the hook`);

    process.exit(0);
  });

// Completion subcommands
const completion = program
  .command('completion')
  .description('Manage shell completions');

completion
  .command('install')
  .description('Install shell completions')
  .argument('[shell]', 'Shell type: bash, zsh, fish, or pwsh (prompts if not specified)')
  .action(async (shell: SupportedShell | undefined) => {
    try {
      await installCompletion(shell);
      console.log(`${symbols.present} Shell completions installed`);
      console.log(colors.dim('  Restart your shell or source your config to activate'));
      process.exit(0);
    } catch (err) {
      console.error(`Failed to install completions: ${err}`);
      process.exit(1);
    }
  });

completion
  .command('uninstall')
  .description('Remove shell completions')
  .action(async () => {
    try {
      await uninstallCompletion();
      console.log(`${symbols.present} Shell completions removed`);
      process.exit(0);
    } catch (err) {
      console.error(`Failed to uninstall completions: ${err}`);
      process.exit(1);
    }
  });

program.parse();
