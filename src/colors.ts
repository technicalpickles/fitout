import chalk from 'chalk';
import { homedir } from 'node:os';

export const colors = {
  // Semantic
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  action: chalk.cyan,

  // Structural
  header: chalk.bold.white,
  dim: chalk.dim,

  // Provenance (dim versions)
  sourceDefault: chalk.dim.blue,
  sourceProject: chalk.dim.magenta,
  sourceOther: chalk.dim.cyan,
};

export const symbols = {
  present: colors.success('✓'),
  missing: colors.error('✗'),
  extra: colors.warning('?'),
  install: colors.action('+'),
  outdated: colors.warning('↑'),
};

export function provenanceColor(source: string): (text: string) => string {
  switch (source) {
    case 'default':
      return colors.sourceDefault;
    case 'project':
      return colors.sourceProject;
    default:
      return colors.sourceOther;
  }
}

/**
 * Format a path for display, replacing $HOME with ~
 */
export function formatPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? path.replace(home, '~') : path;
}

/**
 * Format context line, only showing if different from cwd
 */
export function formatContextLine(projectRoot: string, cwd: string): string {
  if (projectRoot === cwd) {
    return '';
  }
  return `${colors.header('Context:')} ${formatPath(projectRoot)}\n\n`;
}
