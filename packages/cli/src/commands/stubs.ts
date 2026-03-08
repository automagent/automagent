import type { Command } from 'commander';
import chalk from 'chalk';

const STUB_MESSAGE = `
This command requires the ${chalk.bold('automagent registry')}, launching in Phase 2.

Follow progress at: ${chalk.cyan('https://github.com/automagent/automagent')}
`;

function stubAction(): void {
  console.log(STUB_MESSAGE);
}

export function registerStubs(program: Command): void {
  program
    .command('login')
    .description('Authenticate with registry (coming soon)')
    .action(stubAction);
}
