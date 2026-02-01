// src/prompt.ts
import * as readline from 'node:readline';

export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultValue ? '(Y/n)' : '(y/N)';

  return new Promise((resolve) => {
    let answered = false;

    rl.on('close', () => {
      if (!answered) {
        // Ctrl+C pressed - exit cleanly
        console.log('');
        process.exit(130);
      }
    });

    rl.question(`${question} ${hint} `, (answer) => {
      answered = true;
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultValue);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

export async function input(question: string, defaultValue = ''): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultValue ? ` [${defaultValue}]` : '';

  return new Promise((resolve) => {
    let answered = false;

    rl.on('close', () => {
      if (!answered) {
        // Ctrl+C pressed - exit cleanly
        console.log('');
        process.exit(130);
      }
    });

    rl.question(`${question}${hint}: `, (answer) => {
      answered = true;
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}
