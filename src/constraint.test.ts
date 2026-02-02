// src/constraint.test.ts
import { describe, it, expect } from 'vitest';
import { parsePluginString, ParsedPlugin, ParseError } from './constraint.js';

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
