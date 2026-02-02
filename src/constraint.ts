// src/constraint.ts
export interface ParsedPlugin {
  id: string;
  constraint: string | null;
}

export interface ParseError {
  input: string;
  message: string;
}

const UNSUPPORTED_OPERATORS = ['<', '<=', '>', '=', '^', '~'];

/**
 * Validate version string is parseable as dot-separated numbers.
 * Permissive: accepts 1, 1.0, 1.0.0, etc.
 */
export function isValidVersion(version: string): boolean {
  if (!version || version.trim() === '') return false;
  const parts = version.split('.');
  return parts.every((part) => {
    if (part === '') return false;
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0;
  });
}

/**
 * Parse a plugin string that may contain a version constraint.
 * Format: "plugin@registry" or "plugin@registry >= 1.0.0"
 */
export function parsePluginString(input: string): ParsedPlugin | ParseError {
  const trimmed = input.trim();

  // Check for >= operator (the only supported one)
  const geqMatch = trimmed.match(/^(.+?)\s*>=\s*(.*)$/);
  if (geqMatch) {
    const [, id, version] = geqMatch;
    const trimmedVersion = version.trim();

    if (!trimmedVersion) {
      return { input, message: 'Missing version after ">="' };
    }

    if (!isValidVersion(trimmedVersion)) {
      return {
        input,
        message: `Invalid version "${trimmedVersion}" - expected number segments (e.g., 1.0.0)`,
      };
    }

    return { id: id.trim(), constraint: trimmedVersion };
  }

  // Check for unsupported operators
  for (const op of UNSUPPORTED_OPERATORS) {
    // Handle operators that might be attached to version (^1.0.0, ~1.0.0)
    const attachedMatch = trimmed.match(new RegExp(`^(.+?)\\s*\\${op}(\\S+)$`));
    if (attachedMatch) {
      return { input, message: `Unsupported operator "${op}". Only ">=" is supported.` };
    }

    // Handle operators with space
    const spacedMatch = trimmed.match(new RegExp(`^(.+?)\\s+\\${op}\\s+(.*)$`));
    if (spacedMatch) {
      return { input, message: `Unsupported operator "${op}". Only ">=" is supported.` };
    }
  }

  // No constraint - just a plugin ID
  return { id: trimmed, constraint: null };
}
