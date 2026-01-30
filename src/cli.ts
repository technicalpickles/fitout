#!/usr/bin/env node
import { program } from 'commander';
import { runStatus } from './status.js';
import { runApply } from './apply.js';

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
  .action((options) => {
    const { output, exitCode } = runApply(process.cwd(), { dryRun: options.dryRun });
    console.log(output);
    process.exit(exitCode);
  });

program.parse();
