import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

export class Environment {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV = 'development';

  @IsString()
  @Matches(/^(?:localhost|[a-zA-Z0-9.:-]+)$/)
  HOST = '127.0.0.1';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @Matches(/^postgres(?:ql)?:\/\/.+/)
  DATABASE_URL!: string;

  @IsString()
  CORS_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

  @IsIn(['true', 'false'])
  SWAGGER_ENABLED = 'true';

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  @MinLength(1)
  JWT_ISSUER = 'flowdesk-api';

  @IsString()
  @MinLength(1)
  JWT_AUDIENCE = 'flowdesk-web';

  @IsInt()
  @Min(60)
  @Max(3600)
  ACCESS_TOKEN_TTL_SECONDS = 900;

  @IsInt()
  @Min(1)
  @Max(30)
  REFRESH_SESSION_TTL_DAYS = 7;

  @IsIn(['true', 'false'])
  COOKIE_SECURE = 'false';
}

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const environment = plainToInstance(Environment, {
    ...input,
    PORT: input.PORT === undefined ? 3000 : Number(input.PORT),
    SWAGGER_ENABLED: input.SWAGGER_ENABLED ?? (input.NODE_ENV === 'production' ? 'false' : 'true'),
    COOKIE_SECURE: input.COOKIE_SECURE ?? (input.NODE_ENV === 'production' ? 'true' : 'false'),
    ACCESS_TOKEN_TTL_SECONDS: Number(input.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    REFRESH_SESSION_TTL_DAYS: Number(input.REFRESH_SESSION_TTL_DAYS ?? 7),
  });
  const errors = validateSync(environment);
  if (errors.length) {
    throw new Error(
      `Invalid environment variables: ${errors.map((error) => error.property).join(', ')}`,
    );
  }
  if (Buffer.byteLength(environment.JWT_SECRET, 'utf8') < 32 || !environment.JWT_SECRET.trim()) {
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  }
  if (
    environment.NODE_ENV === 'production' &&
    (environment.COOKIE_SECURE !== 'true' ||
      environment.CORS_ORIGINS.split(',').some((origin) => !origin.trim().startsWith('https://')))
  ) {
    throw new Error('Production requires secure cookies and HTTPS origins');
  }
  try {
    const database = new URL(environment.DATABASE_URL);
    if (
      !database.hostname ||
      database.pathname.length < 2 ||
      !database.username ||
      !database.password
    ) {
      throw new Error('Invalid database URL');
    }
    const origins = environment.CORS_ORIGINS.split(',').map((origin) => origin.trim());
    for (const origin of origins) {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
        throw new Error('Invalid origin');
      }
    }
  } catch {
    throw new Error(
      'Invalid DATABASE_URL or CORS_ORIGINS; use a PostgreSQL URL and explicit HTTP origins',
    );
  }
  return environment;
}
