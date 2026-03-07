import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { runCommand } from './commands/run.js';
import { importCommand } from './commands/import.js';
import { pushCommand } from './commands/push.js';
import { pullCommand } from './commands/pull.js';
import { searchCommand } from './commands/search.js';
import { diffCommand } from './commands/diff.js';
import { registerLogin, registerLogout, registerWhoami } from './commands/login.js';

const program = new Command();

program
  .name('automagent')
  .description('The open standard for defining AI agents')
  .version('0.1.0');

initCommand(program);
validateCommand(program);
runCommand(program);
importCommand(program);
pushCommand(program);
pullCommand(program);
searchCommand(program);
diffCommand(program);
registerLogin(program);
registerLogout(program);
registerWhoami(program);

program.parse();
