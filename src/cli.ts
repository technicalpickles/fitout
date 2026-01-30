#!/usr/bin/env node
import { program } from 'commander';
import { runStatus } from './status.js';
import { runApply } from './apply.js';
import { runInit, getClaudeSettingsPath } from './init.js';
import { getProfilesDir } from './context.js';

program
  .name('fettle')
  .description('Context-aware plugin manager for Claude Code')
  .version('0.1.0');

program
  .command('status')
  .description('Show desired vs actual plugin state')
  .action(() => {
    const { output, exitCode } = runStatus(process.cwd());
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
  .command('init')
  .description('Set up Fettle integration with Claude Code')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .option('--hook-only', 'Only add the hook, do not create profile')
  .action((options) => {
    const settingsPath = getClaudeSettingsPath();
    const profilesDir = getProfilesDir();

    // For now, implement non-interactive mode only
    const createProfile = options.yes && !options.hookOnly;

    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile,
      profileName: 'default',
    });

    if (result.alreadyInitialized) {
      console.log('Fettle is already initialized.');
      if (result.profileCreated) {
        console.log(`Created profile: ${result.profilePath}`);
      }
      process.exit(0);
    }

    console.log('Fettle initialized successfully!');
    if (result.hookAdded) {
      console.log(`  ✓ SessionStart hook added to ${settingsPath}`);
    }
    if (result.profileCreated) {
      console.log(`  ✓ Created profile: ${result.profilePath}`);
    }
    console.log('\nRestart Claude to activate the hook.');
    process.exit(0);
  });

program.parse();
