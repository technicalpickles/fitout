import chalk from 'chalk';

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
