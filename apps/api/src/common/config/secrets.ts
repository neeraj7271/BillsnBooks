/**
 * Centralised, fail-fast access to security-critical secrets.
 *
 * Previously these were read inline with hard-coded development fallbacks
 * (e.g. `process.env.JWT_SECRET || 'jwt-accounting-secret-key-32b'`), which
 * meant a misconfigured production deployment would silently sign and verify
 * tokens with a publicly-known key. These helpers throw on startup/use if a
 * secret is missing or too weak, and {@link assertSecretsConfigured} is called
 * during bootstrap so the process refuses to start when misconfigured.
 */

const MIN_SECRET_LENGTH = 32;

function read(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Environment variable ${name} must be set to a strong value of at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }
  return value;
}

export function getRequiredJwtSecret(): string {
  return read('JWT_SECRET');
}

export function getRequiredJwtRefreshSecret(): string {
  return read('JWT_REFRESH_SECRET');
}

export function getRequiredEncryptionKey(): string {
  return read('ENCRYPTION_KEY');
}

/**
 * Validates that every security-critical secret is present and strong.
 * Call once during application bootstrap. Throws a single aggregated error
 * listing all misconfigured variables.
 */
export function assertSecretsConfigured(): void {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
  const problems: string[] = [];
  for (const name of required) {
    const value = process.env[name];
    if (!value || value.trim().length < MIN_SECRET_LENGTH) {
      problems.push(
        `  - ${name} is missing or shorter than ${MIN_SECRET_LENGTH} characters`,
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Refusing to start: insecure secret configuration detected.\n${problems.join('\n')}\n` +
        `Set these in the environment (see apps/api/.env.example) before starting the API.`,
    );
  }
}
