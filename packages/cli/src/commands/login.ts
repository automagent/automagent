import { Command } from 'commander';
import chalk from 'chalk';
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { saveCredentials, loadCredentials, clearCredentials, checkHubSecurity } from '../utils/credentials.js';
import { DEFAULT_HUB } from '../utils/constants.js';
import { HubClient } from '../utils/hub-client.js';
import { success, warn, error as logError, heading } from '../utils/output.js';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function loginCommand(program: Command): void {
  program
    .command('login')
    .description('Authenticate with the Automagent Hub via GitHub')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .action(async (opts: { hubUrl: string }) => {
      const hubUrl = opts.hubUrl;

      heading('Automagent Hub Login');

      const state = randomBytes(16).toString('hex');
      const codeVerifier = randomBytes(32).toString('base64url');
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

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
              body: JSON.stringify({ code, code_verifier: codeVerifier }),
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
            logError(`Login failed: ${err instanceof Error ? err.message : err}`);
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

          success(`Logged in as ${chalk.bold(username)}`);

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
          logError('Login timed out. Please try again.');
          process.exitCode = 1;
        }, 120000);
      });

      const authUrl = `${hubUrl}/auth/github?cli_port=${port}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      console.log(`Opening browser to authenticate...\n`);
      console.log(`If the browser doesn't open, visit:\n${chalk.cyan(authUrl)}\n`);

      if (!process.env.NO_OPEN) {
        const open = (await import('open')).default;
        await open(authUrl);
      }
    });
}

export function logoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Log out from the Automagent Hub')
    .action(() => {
      clearCredentials();
      success('Logged out successfully.');
    });
}

export function whoamiCommand(program: Command): void {
  program
    .command('whoami')
    .description('Show the currently authenticated user')
    .option('--check', 'Validate token against the hub')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .option('--insecure', 'Allow insecure HTTP connections')
    .action(async (opts: { check?: boolean; hubUrl: string; insecure?: boolean }) => {
      const creds = loadCredentials();
      if (!creds) {
        warn('Not logged in. Run `automagent login` to authenticate.');
        return;
      }

      if (!opts.check) {
        console.log(chalk.bold(creds.username));
        console.log(chalk.dim(`Hub: ${creds.hubUrl}`));
        return;
      }

      if (!checkHubSecurity(opts.hubUrl, opts.insecure)) return;

      try {
        const client = new HubClient(opts.hubUrl);
        const res = await client.request('/agents?limit=1');
        if (res.ok) {
          console.log(chalk.bold(creds.username));
          success('Token is valid.');
        } else if (res.status === 401) {
          logError('Token is invalid or expired. Run `automagent login` to re-authenticate.');
          process.exitCode = 1;
        } else {
          logError(`Hub returned ${res.status}: ${res.error ?? 'unknown error'}`);
          process.exitCode = 1;
        }
      } catch (err) {
        HubClient.handleError(err);
      }
    });
}
