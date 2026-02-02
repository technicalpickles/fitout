#!/usr/bin/env node
import { program } from 'commander';
import { runStatus } from './status.js';
import { runInstall } from './install.js';
import {
  runInit,
  getProjectConfigPath,
  readClaudeSettings,
  hasFitoutHook,
  hasFitoutSkill,
  hasDefaultProfile,
  hasProjectConfig,
  getProjectConfigContent,
  getDefaultProfilePath,
} from './init.js';
import { getClaudeSettingsPath, getFitoutSkillPath } from './paths.js';
import { getProfilesDir, resolveProjectRoot } from './context.js';
import { confirm, input } from './prompt.js';
import { colors, symbols, formatPath } from './colors.js';
import { hasGlobalConfig, createGlobalConfig, getGlobalConfigPath, getGlobalConfigContent } from './globalConfig.js';
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
  .name('fitout')
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

// Helper for install action (used by both `install` command and default)
function doInstall(options: { dryRun?: boolean; hook?: boolean } = {}) {
  const { output, exitCode } = runInstall(process.cwd(), {
    dryRun: options.dryRun,
    hook: options.hook,
  });
  if (output) {
    console.log(output);
  }
  process.exit(exitCode);
}

program
  .command('install', { isDefault: true })
  .description('Install missing plugins to sync desired state')
  .option('--dry-run', 'Show what would change without installing')
  .option('--hook', 'Hook mode: silent on no-op, minimal output for Claude context')
  .action((options) => doInstall(options));

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
  .description('Set up Fitout integration with Claude Code')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .option('--hook-only', 'Only add the hook, do not create profile or project config')
  .action(async (options) => {
    const settingsPath = getClaudeSettingsPath();
    const profilesDir = getProfilesDir();
    const projectRoot = resolveProjectRoot(process.cwd());
    const projectConfigPath = getProjectConfigPath(projectRoot);
    const skillPath = getFitoutSkillPath();

    // Check current state
    const settings = readClaudeSettings(settingsPath);
    const hookExists = hasFitoutHook(settings);
    const skillExists = hasFitoutSkill();
    const profileExists = hasDefaultProfile(profilesDir);
    const configExists = hasProjectConfig(projectRoot);

    // Handle --hook-only mode
    if (options.hookOnly) {
      if (hookExists) {
        console.log(`${symbols.present} Hook already installed`);
        process.exit(0);
      }
      const result = runInit({
        settingsPath,
        profilesDir,
        createProfile: false,
        createSkill: false,
      });
      console.log(`${symbols.present} SessionStart hook added to ${formatPath(settingsPath)}`);
      console.log(colors.dim('  Restart Claude to activate'));
      process.exit(0);
    }

    // Handle --yes mode (non-interactive)
    if (options.yes) {
      const result = runInit({
        settingsPath,
        profilesDir,
        createProfile: true,
        profileName: 'default',
        projectRoot,
        createProjectConfig: true,
        createSkill: true,
      });

      const created: string[] = [];
      if (result.hookAdded) created.push('hook');
      if (result.skillCreated) created.push('skill');
      if (result.profileCreated) created.push('profile');
      if (result.projectConfigCreated) created.push('project config');

      if (created.length === 0) {
        console.log(`${symbols.present} Already initialized`);
      } else {
        console.log(`${symbols.present} Created: ${created.join(', ')}`);
        console.log(colors.dim('  Restart Claude to activate'));
      }
      process.exit(0);
    }

    // Interactive phased mode
    console.log('Checking Fitout setup...\n');

    // Phase 1: Global setup
    console.log(colors.header('Global:'));
    let needsGlobalSetup = false;

    if (hookExists) {
      console.log(`  ${symbols.present} SessionStart hook`);
    } else {
      console.log(`  ${symbols.missing} SessionStart hook ${colors.dim('(missing)')}`);
      needsGlobalSetup = true;
    }

    if (skillExists) {
      console.log(`  ${symbols.present} Diagnostic skill`);
    } else {
      console.log(`  ${symbols.missing} Diagnostic skill ${colors.dim('(missing)')}`);
      needsGlobalSetup = true;
    }

    const globalConfigExists = hasGlobalConfig();
    if (globalConfigExists) {
      console.log(`  ${symbols.present} Global config`);
    } else {
      console.log(`  ${symbols.missing} Global config ${colors.dim('(optional)')}`);
    }

    // Set up global components if needed
    let hookAdded = false;
    let skillCreated = false;
    let globalConfigCreated = false;
    if (needsGlobalSetup) {
      console.log('');
      const setupGlobal = await confirm('Set up missing global components?');
      if (setupGlobal) {
        const result = runInit({
          settingsPath,
          profilesDir,
          createProfile: false,
          createSkill: !skillExists,
        });
        hookAdded = result.hookAdded;
        skillCreated = result.skillCreated;
        if (hookAdded) console.log(`  ${symbols.present} Hook installed`);
        if (skillCreated) console.log(`  ${symbols.present} Skill installed`);
      }
    }

    // Offer to create global config if missing
    if (!globalConfigExists) {
      console.log('');
      const createConfig = await confirm('Create global config for marketplaces?');
      if (createConfig) {
        // Show preview
        const configContent = getGlobalConfigContent();
        console.log(`\nReady to create ${formatPath(getGlobalConfigPath())}:`);
        console.log(colors.dim('    ' + configContent.split('\n').join('\n    ')));

        const confirmCreate = await confirm('Create?');
        if (confirmCreate) {
          globalConfigCreated = createGlobalConfig();
          if (globalConfigCreated) {
            console.log(`  ${symbols.present} Created ${formatPath(getGlobalConfigPath())}`);
          }
        }
      }
    }

    // Phase 2: Default profile
    console.log('');
    console.log(colors.header('Profile:'));
    let profileCreated = false;
    let profileName = 'default';

    if (profileExists) {
      console.log(`  ${symbols.present} Default profile`);
    } else {
      console.log(`  ${symbols.missing} Default profile ${colors.dim('(missing)')}`);
      console.log('');
      const createProfile = await confirm('Create a default profile?');
      if (createProfile) {
        profileName = await input('Profile name', 'default');
        const result = runInit({
          settingsPath,
          profilesDir,
          createProfile: true,
          profileName,
          createSkill: false,
        });
        profileCreated = result.profileCreated;
        if (profileCreated) {
          console.log(`  ${symbols.present} Created ${formatPath(getDefaultProfilePath(profilesDir, profileName))}`);
        }
      }
    }

    // Phase 3: Project config
    console.log('');
    console.log(colors.header('Project:'));
    let projectConfigCreated = false;

    if (configExists) {
      console.log(`  ${symbols.present} Project config`);
    } else {
      console.log(`  ${symbols.missing} Project config ${colors.dim('(missing)')}`);
      console.log('');

      // Show preview
      const configContent = getProjectConfigContent(profileCreated || profileExists ? profileName : undefined);
      console.log(`Ready to create ${formatPath(projectConfigPath)}:`);
      console.log(colors.dim('    ' + configContent.split('\n').join('\n    ')));

      const createConfig = await confirm('Create project config?');
      if (createConfig) {
        const result = runInit({
          settingsPath,
          profilesDir,
          createProfile: false,
          projectRoot,
          createProjectConfig: true,
          createSkill: false,
        });
        projectConfigCreated = result.projectConfigCreated;
        if (projectConfigCreated) {
          console.log(`  ${symbols.present} Created ${formatPath(projectConfigPath)}`);
        }
      }
    }

    // Summary
    console.log('');
    const anythingCreated = hookAdded || skillCreated || globalConfigCreated || profileCreated || projectConfigCreated;
    if (!anythingCreated && hookExists && skillExists && profileExists && configExists) {
      console.log(`${symbols.present} ${colors.success('Already initialized')}`);
    } else if (anythingCreated) {
      console.log(colors.dim('Restart Claude to activate changes.'));
    }

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
