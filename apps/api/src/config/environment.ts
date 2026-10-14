import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsString, Matches, Max, Min, validateSync } from 'class-validator';

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
}

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const environment = plainToInstance(Environment, {
    ...input,
    PORT: input.PORT === undefined ? 3000 : Number(input.PORT),
    SWAGGER_ENABLED: input.SWAGGER_ENABLED ?? (input.NODE_ENV === 'production' ? 'false' : 'true'),
  });
  const errors = validateSync(environment);
  if (errors.length) {
    throw new Error(
      `Invalid environment variables: ${errors.map((error) => error.property).join(', ')}`,
    );
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
