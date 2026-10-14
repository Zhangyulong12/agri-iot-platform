import { randomBytes } from 'node:crypto';
import { validateEnvironment } from '../src/config/environment.js';

function validInput() {
  return {
    DATABASE_URL: `postgresql://test:${randomBytes(12).toString('hex')}@localhost:5432/test`,
  };
}

describe('Environment validation', () => {
  it('converts a valid port and applies safe defaults', () => {
    expect(validateEnvironment({ ...validInput(), PORT: '3001' }).PORT).toBe(3001);
  });
  it('disables Swagger by default in production', () => {
    expect(validateEnvironment({ ...validInput(), NODE_ENV: 'production' }).SWAGGER_ENABLED).toBe(
      'false',
    );
  });
  it.each([
    { PORT: 'invalid' },
    { PORT: '70000' },
    { DATABASE_URL: 'not-a-url' },
    { CORS_ORIGINS: '*' },
    { CORS_ORIGINS: 'https://example.com/path' },
    { SWAGGER_ENABLED: 'yes' },
  ])('rejects invalid configuration %j', (invalid) => {
    expect(() => validateEnvironment({ ...validInput(), ...invalid })).toThrow();
  });
  it('does not expose secret values when validation fails', () => {
    const secret = randomBytes(12).toString('hex');
    try {
      validateEnvironment({ DATABASE_URL: secret });
      throw new Error('Validation should fail');
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
