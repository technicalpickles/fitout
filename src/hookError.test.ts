// src/hookError.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeHookError, formatHookError } from './hookError.js';

describe('formatHookError', () => {
  it('prefixes message with [fitout]', () => {
    expect(formatHookError('something failed')).toBe('[fitout] something failed\n');
  });

  it('handles multi-line messages', () => {
    expect(formatHookError('line1\nline2')).toBe('[fitout] line1\nline2\n');
  });
});

describe('writeHookError', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('writes formatted message to stderr', () => {
    writeHookError('config not found');
    expect(stderrSpy).toHaveBeenCalledWith('[fitout] config not found\n');
  });
});
