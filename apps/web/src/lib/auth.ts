import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Auth DB lives next to Lumen's data dir so everything stays local.
 */
const authDbPath = process.env.LUMEN_AUTH_DB || join(homedir(), '.lumen', 'auth.db');
const resetUrlFile = join(dirname(authDbPath), 'last-reset-url.txt');
mkdirSync(dirname(authDbPath), { recursive: true });

export const auth = betterAuth({
    database: new Database(authDbPath),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        /**
         * Local-first: there's no SMTP. We log the reset URL to the dev
         * console AND persist it to `~/.lumen/last-reset-url.txt` so the
         * developer running the workspace can copy it without having to
         * hunt through scrolled-past terminal output. In a hosted deploy,
         * swap this for a real email transport.
         */
        sendResetPassword: async ({ user, url }) => {
            const banner = '━'.repeat(64);
            process.stdout.write(
                `\n${banner}\n[lumen-auth] PASSWORD RESET requested for ${user.email}\n[lumen-auth] Reset URL — open this in your browser:\n\n  ${url}\n\n[lumen-auth] Also saved to: ${resetUrlFile}\n${banner}\n\n`,
            );
            try {
                writeFileSync(resetUrlFile, `${url}\n`, { mode: 0o600 });
            } catch (err) {
                process.stderr.write(
                    `[lumen-auth] failed to write reset URL file: ${String(err)}\n`,
                );
            }
        },
        resetPasswordTokenExpiresIn: 60 * 60,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
    },
    secret: process.env.BETTER_AUTH_SECRET || 'will be fixed in prod pushing',
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    trustedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
});

export type Session = typeof auth.$Infer.Session;
