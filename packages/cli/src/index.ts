import { createRequire } from 'node:module';
import { Command } from 'commander';
import { initCommand } from './commands/init.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };
import { validateCommand } from './commands/validate.js';
import { runCommand } from './commands/run.js';
import { importCommand } from './commands/import.js';
import { exportCommand } from './commands/export.js';
import { syncCommand } from './commands/sync.js';
import { pushCommand } from './commands/push.js';
import { pullCommand } from './commands/pull.js';
import { searchCommand } from './commands/search.js';
import { diffCommand } from './commands/diff.js';
import { registerLogin, registerLogout, registerWhoami } from './commands/login.js';

const program = new Command();

program
  .name('automagent')
  .description('The open standard for defining AI agents')
  .version(version);

initCommand(program);
validateCommand(program);
runCommand(program);
importCommand(program);
exportCommand(program);
syncCommand(program);
pushCommand(program);
pullCommand(program);
searchCommand(program);
diffCommand(program);
registerLogin(program);
registerLogout(program);
registerWhoami(program);

program.parse();
