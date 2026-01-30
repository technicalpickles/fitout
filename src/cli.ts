#!/usr/bin/env node
import { program } from 'commander';
import { runStatus } from './status.js';
import { runApply } from './apply.js';
import { runInit, getClaudeSettingsPath, getProjectConfigPath } from './init.js';
import { getProfilesDir, resolveProjectRoot } from './context.js';
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

    console.log('\nCreated:');
    if (result.hookAdded) {
      console.log(`  ✓ SessionStart hook added to ${settingsPath}`);
    }
    if (result.profileCreated) {
      console.log(`  ✓ ${result.profilePath}`);
    }
    if (result.projectConfigCreated) {
      console.log(`  ✓ ${result.projectConfigPath}`);
    }
    if (result.alreadyInitialized) {
      console.log('  (hook already existed)');
    }

    console.log('\nNext steps:');
    if (result.profileCreated) {
      console.log(`  - Add plugins to your profile: ${result.profilePath}`);
    }
    if (result.projectConfigCreated) {
      console.log(`  - Add plugins to your project config: ${result.projectConfigPath}`);
    }
    console.log('  - Restart Claude to activate the hook');

    process.exit(0);
  });

program.parse();
