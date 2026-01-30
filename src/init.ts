// src/init.ts
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';

export function getClaudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}

export function readClaudeSettings(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function hasFettleHook(settings: Record<string, unknown>): boolean {
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks?.SessionStart) return false;

  const sessionStartHooks = hooks.SessionStart as Array<{ hooks?: Array<{ command?: string }> }>;

  return sessionStartHooks.some((matcher) =>
    matcher.hooks?.some((hook) => hook.command?.includes('fettle apply --hook'))
  );
}

interface ClaudeSettings {
  hooks?: {
    SessionStart?: Array<{
      hooks: Array<{ type: string; command: string }>;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function addFettleHook(settings: Record<string, unknown>): ClaudeSettings {
  const result = { ...settings } as ClaudeSettings;

  if (!result.hooks) {
    result.hooks = {};
  }

  if (!result.hooks.SessionStart) {
    result.hooks.SessionStart = [];
  }

  result.hooks.SessionStart.push({
    hooks: [
      { type: 'command', command: 'fettle apply --hook' }
    ]
  });

  return result;
}

export function writeClaudeSettings(path: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
}

export function getDefaultProfilePath(profilesDir: string, name: string): string {
  return join(profilesDir, `${name}.toml`);
}

export function getProjectConfigPath(projectRoot: string): string {
  return join(projectRoot, '.claude', 'fettle.toml');
}

export function createProjectConfig(projectRoot: string, profileName?: string): boolean {
  const configPath = getProjectConfigPath(projectRoot);

  if (existsSync(configPath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(configPath), { recursive: true });

  const profileLine = profileName ? `profiles = ["${profileName}"]` : '# profiles = ["default"]';
  const content = `# Fettle project config - plugins listed here apply to this project
${profileLine}

plugins = [
  # "example-plugin@marketplace",
]
`;

  writeFileSync(configPath, content);
  return true;
}

export function createDefaultProfile(profilePath: string): boolean {
  if (existsSync(profilePath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(profilePath), { recursive: true });

  const content = `# Fettle profile - plugins listed here apply to all projects
# Add plugins in the format: "plugin-name@registry"

plugins = [
  # "example-plugin@marketplace",
]
`;

  writeFileSync(profilePath, content);
  return true;
}

export interface InitOptions {
  settingsPath: string;
  profilesDir: string;
  createProfile: boolean;
  profileName?: string;
  projectRoot?: string;
  createProjectConfig?: boolean;
}

export interface InitResult {
  hookAdded: boolean;
  alreadyInitialized: boolean;
  profileCreated: boolean;
  profilePath?: string;
  projectConfigCreated: boolean;
  projectConfigPath?: string;
}

export function runInit(options: InitOptions): InitResult {
  const {
    settingsPath,
    profilesDir,
    createProfile,
    profileName = 'default',
    projectRoot,
    createProjectConfig: shouldCreateProjectConfig,
  } = options;

  const result: InitResult = {
    hookAdded: false,
    alreadyInitialized: false,
    profileCreated: false,
    projectConfigCreated: false,
  };

  // Read existing settings
  const settings = readClaudeSettings(settingsPath);

  // Check if already initialized
  if (hasFettleHook(settings)) {
    result.alreadyInitialized = true;
  } else {
    // Add hook
    const updated = addFettleHook(settings);
    writeClaudeSettings(settingsPath, updated);
    result.hookAdded = true;
  }

  // Create profile if requested
  if (createProfile) {
    const profilePath = getDefaultProfilePath(profilesDir, profileName);
    result.profilePath = profilePath;
    result.profileCreated = createDefaultProfile(profilePath);
  }

  // Create project config if requested
  if (shouldCreateProjectConfig && projectRoot) {
    result.projectConfigPath = getProjectConfigPath(projectRoot);
    result.projectConfigCreated = createProjectConfig(
      projectRoot,
      createProfile ? profileName : undefined
    );
  }

  return result;
}
