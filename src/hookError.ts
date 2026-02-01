// src/hookError.ts
export function formatHookError(message: string): string {
  return `[fettle] ${message}\n`;
}

export function writeHookError(message: string): void {
  process.stderr.write(formatHookError(message));
}
