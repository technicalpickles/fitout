#!/usr/bin/env node
import { program } from 'commander';
import { runStatus } from './status.js';
import { runApply } from './apply.js';
import { runInit, getClaudeSettingsPath } from './init.js';
import { getProfilesDir } from './context.js';
import { confirm, input } from './prompt.js';

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
  .action(async (options) => {
    const settingsPath = getClaudeSettingsPath();
    const profilesDir = getProfilesDir();

    let createProfile = false;
    let profileName = 'default';

    if (options.hookOnly) {
      createProfile = false;
    } else if (options.yes) {
      createProfile = true;
    } else {
      // Interactive mode
      console.log('Fettle - Context-aware plugin manager for Claude Code\n');
      console.log('This will:');
      console.log(`  - Add a SessionStart hook to ${settingsPath}`);
      console.log(`  - Create ${profilesDir}/ for shared plugin profiles\n`);

      createProfile = await confirm('Create a default profile?');
      if (createProfile) {
        profileName = await input('Profile name', 'default');
      }
    }

    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile,
      profileName,
    });

    if (result.alreadyInitialized && !result.profileCreated) {
      console.log('\nFettle is already initialized.');
      process.exit(0);
    }

    console.log('\nCreated:');
    if (result.hookAdded) {
      console.log(`  ✓ SessionStart hook added to ${settingsPath}`);
    }
    if (result.profileCreated) {
      console.log(`  ✓ ${result.profilePath}`);
    }
    if (result.alreadyInitialized) {
      console.log('  (hook already existed)');
    }

    console.log('\nNext steps:');
    if (result.profileCreated) {
      console.log(`  - Add plugins to your profile: ${result.profilePath}`);
    }
    console.log('  - Or create a project config: .claude/fettle.toml');
    console.log('  - Restart Claude to activate the hook');

    process.exit(0);
  });

program.parse();
