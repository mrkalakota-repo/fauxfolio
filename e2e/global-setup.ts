import * as fs from 'fs';
import * as path from 'path';

/**
 * Runs before any test. Validates that the environment is ready for E2E:
 *  - DATABASE_URL is a PostgreSQL URL (schema.prisma requires it)
 *  - JWT_SECRET is set (required for auth)
 */
export default async function globalSetup() {
  const dbUrl = resolveEnvVar('DATABASE_URL');
  const jwtSecret = resolveEnvVar('JWT_SECRET');

  const errors: string[] = [];

  if (!dbUrl) {
    errors.push(
      'DATABASE_URL is not set.\n' +
      '  Set it in .env.local or pass it inline:\n' +
      '  DATABASE_URL="postgresql://user:pass@host/db" npx playwright test --config e2e/playwright.config.ts'
    );
  } else if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    errors.push(
      `DATABASE_URL must be a PostgreSQL URL (schema.prisma requires it).\n` +
      `  Got: ${dbUrl}\n` +
      '  Expected: postgresql://user:pass@host:5432/dbname\n' +
      '  If you are using a local SQLite file for development, run:\n' +
      '    npm run db:push  (after updating schema.prisma provider to "sqlite")\n' +
      '  Or point to a cloud Postgres (e.g. Neon) in .env.local.'
    );
  }

  if (!jwtSecret) {
    errors.push(
      'JWT_SECRET is not set in .env.local — auth will fail.\n' +
      '  Add: JWT_SECRET="any-long-random-string" to .env.local'
    );
  }

  if (errors.length > 0) {
    console.error('\n\x1b[31m[E2E Setup] Pre-flight checks failed:\x1b[0m\n');
    errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}\n`));
    process.exit(1);
  }

  // Ensure .auth dir exists for saved storage state
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  console.log('[E2E Setup] Environment OK — DATABASE_URL is a PostgreSQL URL.');
}

/**
 * Reads a var from process.env first, then .env.local, then .env.
 * Uses the LAST match in each file (shell semantics: later lines win).
 */
function resolveEnvVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];

  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    let found: string | undefined;
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=\s]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (match && match[1] === key) found = match[2]; // keep overwriting → last wins
    }
    if (found !== undefined) return found;
  }
  return undefined;
}
