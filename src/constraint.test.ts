// src/constraint.test.ts
import { describe, it, expect } from 'vitest';
import { parsePluginString, parsePluginList, isParsedPlugin, isParseError, ParsedPlugin, ParseError } from './constraint.js';

describe('parsePluginString', () => {
  it('parses plugin without constraint', () => {
    const result = parsePluginString('git@marketplace');
    expect(result).toEqual({ id: 'git@marketplace', constraint: null });
  });

  it('parses plugin with >= constraint', () => {
    const result = parsePluginString('git@marketplace >= 1.2.0');
    expect(result).toEqual({ id: 'git@marketplace', constraint: '1.2.0' });
  });

  it('parses constraint with two-part version', () => {
    const result = parsePluginString('git@marketplace >= 1.2');
    expect(result).toEqual({ id: 'git@marketplace', constraint: '1.2' });
  });

  it('parses constraint with single-part version', () => {
    const result = parsePluginString('git@marketplace >= 2');
    expect(result).toEqual({ id: 'git@marketplace', constraint: '2' });
  });

  it('returns error for unsupported operator <', () => {
    const result = parsePluginString('git@marketplace < 1.0.0');
    expect(result).toEqual({
      input: 'git@marketplace < 1.0.0',
      message: 'Unsupported operator "<". Only ">=" is supported.',
    });
  });

  it('returns error for unsupported operator =', () => {
    const result = parsePluginString('git@marketplace = 1.0.0');
    expect(result).toEqual({
      input: 'git@marketplace = 1.0.0',
      message: 'Unsupported operator "=". Only ">=" is supported.',
    });
  });

  it('returns error for unsupported operator ^', () => {
    const result = parsePluginString('git@marketplace ^1.0.0');
    expect(result).toEqual({
      input: 'git@marketplace ^1.0.0',
      message: 'Unsupported operator "^". Only ">=" is supported.',
    });
  });

  it('returns error for missing version after >=', () => {
    const result = parsePluginString('git@marketplace >=');
    expect(result).toEqual({
      input: 'git@marketplace >=',
      message: 'Missing version after ">="',
    });
  });

  it('returns error for invalid version', () => {
    const result = parsePluginString('git@marketplace >= abc');
    expect(result).toEqual({
      input: 'git@marketplace >= abc',
      message: 'Invalid version "abc" - expected number segments (e.g., 1.0.0)',
    });
  });

  it('returns error for empty version segment', () => {
    const result = parsePluginString('git@marketplace >= 1..0');
    expect(result).toEqual({
      input: 'git@marketplace >= 1..0',
      message: 'Invalid version "1..0" - expected number segments (e.g., 1.0.0)',
    });
  });
});

describe('parsePluginList', () => {
  it('parses list of valid plugins', () => {
    const result = parsePluginList([
      'git@marketplace >= 1.0.0',
      'other@marketplace',
    ]);

    expect(result.plugins).toEqual([
      { id: 'git@marketplace', constraint: '1.0.0' },
      { id: 'other@marketplace', constraint: null },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('collects all errors', () => {
    const result = parsePluginList([
      'git@marketplace >= abc',
      'other@marketplace < 1.0.0',
      'valid@marketplace',
    ]);

    expect(result.plugins).toEqual([
      { id: 'valid@marketplace', constraint: null },
    ]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].input).toBe('git@marketplace >= abc');
    expect(result.errors[1].input).toBe('other@marketplace < 1.0.0');
  });

  it('returns empty arrays for empty input', () => {
    const result = parsePluginList([]);
    expect(result.plugins).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});

describe('type guards', () => {
  it('isParsedPlugin returns true for valid parse', () => {
    const result = parsePluginString('git@marketplace >= 1.0.0');
    expect(isParsedPlugin(result)).toBe(true);
  });

  it('isParsedPlugin returns false for error', () => {
    const result = parsePluginString('git@marketplace >= abc');
    expect(isParsedPlugin(result)).toBe(false);
  });

  it('isParseError returns true for error', () => {
    const result = parsePluginString('git@marketplace >= abc');
    expect(isParseError(result)).toBe(true);
  });

  it('isParseError returns false for valid parse', () => {
    const result = parsePluginString('git@marketplace >= 1.0.0');
    expect(isParseError(result)).toBe(false);
  });
});
