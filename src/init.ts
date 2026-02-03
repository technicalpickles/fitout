// src/init.ts
import { join, dirname } from 'node:path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { getClaudeSettingsPath, getClaudeSkillsDir, getFitoutSkillPath } from './paths.js';

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

export type HookStatus = 'none' | 'current' | 'outdated';

// Hook command patterns
export const HOOK_COMMAND_DEFAULT = 'npx fitout@latest install --hook';
export const HOOK_COMMAND_DEV = 'fitout install --hook';

function isCurrentHook(command: string | undefined): boolean {
  if (!command) return false;
  // Match both "npx fitout@latest install --hook" and "fitout install --hook"
  return command.includes('fitout install --hook') || command.includes('fitout@latest install --hook');
}

function isLegacyHook(command: string | undefined): boolean {
  if (!command) return false;
  return command.includes('fitout apply --hook') || command.includes('fitout@latest apply --hook');
}

export function getFitoutHookStatus(settings: Record<string, unknown>): HookStatus {
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks?.SessionStart) return 'none';

  const sessionStartHooks = hooks.SessionStart as Array<{ hooks?: Array<{ command?: string }> }>;

  // Check for current command (matches both npx and dev versions)
  const hasCurrent = sessionStartHooks.some((matcher) =>
    matcher.hooks?.some((hook) => isCurrentHook(hook.command))
  );
  if (hasCurrent) return 'current';

  // Check for legacy command
  const hasLegacy = sessionStartHooks.some((matcher) =>
    matcher.hooks?.some((hook) => isLegacyHook(hook.command))
  );
  if (hasLegacy) return 'outdated';

  return 'none';
}

export function hasFitoutHook(settings: Record<string, unknown>): boolean {
  const status = getFitoutHookStatus(settings);
  return status === 'current' || status === 'outdated';
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

export function addFitoutHook(settings: Record<string, unknown>): ClaudeSettings {
  const result = { ...settings } as ClaudeSettings;

  if (!result.hooks) {
    result.hooks = {};
  }

  if (!result.hooks.SessionStart) {
    result.hooks.SessionStart = [];
  }

  result.hooks.SessionStart.push({
    hooks: [
      { type: 'command', command: HOOK_COMMAND_DEFAULT }
    ]
  });

  return result;
}

export function upgradeFitoutHook(settings: Record<string, unknown>): ClaudeSettings {
  const result = JSON.parse(JSON.stringify(settings)) as ClaudeSettings;

  if (!result.hooks?.SessionStart) {
    return result;
  }

  for (const matcher of result.hooks.SessionStart) {
    if (matcher.hooks) {
      for (const hook of matcher.hooks) {
        if (isLegacyHook(hook.command)) {
          // Replace both legacy patterns with the new default
          hook.command = hook.command
            .replace('fitout@latest apply --hook', HOOK_COMMAND_DEFAULT)
            .replace('fitout apply --hook', HOOK_COMMAND_DEFAULT);
        }
      }
    }
  }

  return result;
}

export function writeClaudeSettings(path: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
}

export function getDefaultProfilePath(profilesDir: string, name: string): string {
  return join(profilesDir, `${name}.toml`);
}

export function hasFitoutSkill(): boolean {
  return existsSync(getFitoutSkillPath());
}

export function hasDefaultProfile(profilesDir: string, name: string = 'default'): boolean {
  return existsSync(getDefaultProfilePath(profilesDir, name));
}

export function hasProjectConfig(projectRoot: string): boolean {
  return existsSync(getProjectConfigPath(projectRoot));
}

export function createFitoutSkill(): boolean {
  const skillPath = getFitoutSkillPath();

  if (existsSync(skillPath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(skillPath), { recursive: true });

  const content = `---
name: fitout
description: Use when checking Fitout plugin manager setup, diagnosing plugin issues, or validating that configured plugins are properly installed. Invoke when users ask about plugin status, mention fitout, or when plugin-related problems are suspected.
---

# Fitout Diagnostic

Check that the Fitout plugin manager is properly configured and all plugins are in sync.

## Diagnostic Steps

### 1. Check Hook Installation

Read \`~/.claude/settings.json\` and verify the Fitout hook exists:

\`\`\`json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "npx fitout@latest install --hook" }
        ]
      }
    ]
  }
}
\`\`\`

Note: Developers may use \`fitout install --hook\` (without npx) for local development.

If the hook is missing, suggest running \`fitout init\`.

### 2. Check Plugin Status

Run \`fitout status\` in the current project directory to check:
- Config file exists and parses correctly
- Profiles resolve without errors
- Which plugins are present, missing, or extra

### 3. Report Summary

Provide a clear diagnostic summary:
- **Hook:** Installed / Missing
- **Config:** Found / Not found / Parse error
- **Profiles:** OK / Errors (list them)
- **Plugins:** X present, Y missing, Z extra

If there are issues, suggest the appropriate fix:
- Missing hook → \`fitout init --hook-only\`
- Missing config → \`fitout init\`
- Missing plugins → \`fitout install\`
- Outdated plugins → \`fitout update\`
`;

  writeFileSync(skillPath, content);
  return true;
}

export function getProjectConfigPath(projectRoot: string): string {
  return join(projectRoot, '.claude', 'fitout.toml');
}

export function getProjectConfigContent(profileName?: string): string {
  const profileLine = profileName ? `profiles = ["${profileName}"]` : '# profiles = ["default"]';
  return `# Fitout project config - plugins listed here apply to this project
${profileLine}

plugins = [
  # "example-plugin@marketplace",
]
`;
}

export function createProjectConfig(projectRoot: string, profileName?: string): boolean {
  const configPath = getProjectConfigPath(projectRoot);

  if (existsSync(configPath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, getProjectConfigContent(profileName));
  return true;
}

export function createDefaultProfile(profilePath: string): boolean {
  if (existsSync(profilePath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(profilePath), { recursive: true });

  const content = `# Fitout profile - plugins listed here apply to all projects
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
  createSkill?: boolean;
}

export interface InitResult {
  hookAdded: boolean;
  hookUpgraded: boolean;
  alreadyInitialized: boolean;
  profileCreated: boolean;
  profilePath?: string;
  projectConfigCreated: boolean;
  projectConfigPath?: string;
  skillCreated: boolean;
  skillPath?: string;
}

export function runInit(options: InitOptions): InitResult {
  const {
    settingsPath,
    profilesDir,
    createProfile,
    profileName = 'default',
    projectRoot,
    createProjectConfig: shouldCreateProjectConfig,
    createSkill: shouldCreateSkill,
  } = options;

  const result: InitResult = {
    hookAdded: false,
    hookUpgraded: false,
    alreadyInitialized: false,
    profileCreated: false,
    projectConfigCreated: false,
    skillCreated: false,
  };

  // Read existing settings
  const settings = readClaudeSettings(settingsPath);

  // Check hook status and take appropriate action
  const hookStatus = getFitoutHookStatus(settings);
  if (hookStatus === 'current') {
    result.alreadyInitialized = true;
  } else if (hookStatus === 'outdated') {
    // Upgrade legacy hook
    const updated = upgradeFitoutHook(settings);
    writeClaudeSettings(settingsPath, updated);
    result.hookUpgraded = true;
  } else {
    // Add new hook
    const updated = addFitoutHook(settings);
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

  // Create skill if requested
  if (shouldCreateSkill) {
    result.skillPath = getFitoutSkillPath();
    result.skillCreated = createFitoutSkill();
  }

  return result;
}
