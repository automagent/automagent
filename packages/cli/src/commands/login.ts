import { Command } from 'commander';
import chalk from 'chalk';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { saveCredentials, loadCredentials, clearCredentials } from '../utils/credentials.js';
import { DEFAULT_HUB } from '../utils/constants.js';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description('Authenticate with the Automagent Hub via GitHub')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .action(async (opts: { hubUrl: string }) => {
      const hubUrl = opts.hubUrl;

      console.log(chalk.bold('\nAutomagent Hub Login\n'));

      const state = randomBytes(16).toString('hex');

      const port = await new Promise<number>((resolve, reject) => {
        const server = createServer(async (req, res) => {
          const url = new URL(req.url!, `http://localhost`);
          if (url.pathname !== '/callback') {
            res.writeHead(404);
            res.end();
            return;
          }

          if (url.searchParams.get('state') !== state) {
            res.writeHead(400);
            res.end('Invalid state parameter');
            return;
          }

          const code = url.searchParams.get('code');

          if (!code) {
            res.writeHead(400);
            res.end('Missing authorization code');
            return;
          }

          let token: string;
          let username: string;
          try {
            const tokenRes = await fetch(`${hubUrl}/auth/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            if (!tokenRes.ok) {
              const err = await tokenRes.json() as { error?: string };
              throw new Error(err.error ?? 'Token exchange failed');
            }
            const data = await tokenRes.json() as { token: string; username: string };
            token = data.token;
            username = data.username;
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: #f0f0f0;">
                  <div style="text-align: center;">
                    <h1 style="color: #ef4444;">Login failed</h1>
                    <p>${escapeHtml(err instanceof Error ? err.message : 'Unknown error')}</p>
                  </div>
                </body>
              </html>
            `);
            console.log(chalk.red(`\nLogin failed: ${err instanceof Error ? err.message : err}`));
            setTimeout(() => { server.close(); process.exitCode = 1; }, 500);
            return;
          }

          saveCredentials({ token, username, hubUrl });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: #f0f0f0;">
                <div style="text-align: center;">
                  <h1 style="color: #05B8DC;">Logged in!</h1>
                  <p>You can close this window and return to the terminal.</p>
                </div>
              </body>
            </html>
          `);

          console.log(chalk.green(`\nLogged in as ${chalk.bold(username)}`));

          setTimeout(() => {
            server.close();
            process.exitCode = 0;
          }, 500);
        });

        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          if (typeof addr === 'object' && addr) {
            resolve(addr.port);
          } else {
            reject(new Error('Failed to start callback server'));
          }
        });

        setTimeout(() => {
          server.close();
          console.log(chalk.red('\nLogin timed out. Please try again.'));
          process.exitCode = 1;
        }, 120000);
      });

      const authUrl = `${hubUrl}/auth/github?cli_port=${port}&state=${state}`;
      console.log(`Opening browser to authenticate...\n`);
      console.log(`If the browser doesn't open, visit:\n${chalk.cyan(authUrl)}\n`);

      const open = (await import('open')).default;
      await open(authUrl);
    });
}

export function registerLogout(program: Command): void {
  program
    .command('logout')
    .description('Log out from the Automagent Hub')
    .action(() => {
      clearCredentials();
      console.log(chalk.green('Logged out successfully.'));
    });
}

export function registerWhoami(program: Command): void {
  program
    .command('whoami')
    .description('Show the currently authenticated user')
    .action(() => {
      const creds = loadCredentials();
      if (!creds) {
        console.log(chalk.yellow('Not logged in. Run `automagent login` to authenticate.'));
        return;
      }
      console.log(chalk.bold(creds.username));
      console.log(chalk.dim(`Hub: ${creds.hubUrl}`));
    });
}
