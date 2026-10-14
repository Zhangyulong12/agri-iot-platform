import 'reflect-metadata';
import { jest } from '@jest/globals';
import { randomBytes } from 'node:crypto';
import { Body, Controller, Get, HttpException, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

class ProbeDto {
  @IsString()
  name!: string;
}

@Controller('test-probe')
class ProbeController {
  @Post()
  echo(@Body() body: ProbeDto) {
    return body;
  }
  @Get('conflict')
  conflict() {
    throw new HttpException('Conflict', 409);
  }
  @Get('failure')
  failure() {
    throw new Error('Private implementation detail');
  }
}

@Module({ imports: [AppModule], controllers: [ProbeController] })
class TestModule {}

describe('API HTTP contract', () => {
  let app: INestApplication;
  const database = { isReady: jest.fn<() => Promise<boolean>>() };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `postgresql://test:${randomBytes(12).toString('hex')}@localhost:5432/test`;
    process.env.SWAGGER_ENABLED = 'true';
    const module = await Test.createTestingModule({ imports: [TestModule] })
      .overrideProvider(PrismaService)
      .useValue(database)
      .compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    database.isReady.mockReset();
  });

  it('serves liveness without querying the database', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'flowdesk-api' });
    expect(database.isReady).not.toHaveBeenCalled();
  });
  it('returns 200 only when readiness succeeds', async () => {
    database.isReady.mockResolvedValue(true);
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(response.body.database).toBe('up');
  });
  it('returns 503 when the database is unavailable', async () => {
    database.isReady.mockResolvedValue(false);
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
    expect(response.body).toMatchObject({ statusCode: 503, message: 'Database is unavailable' });
  });
  it('keeps 404 and 409 responses with a consistent error envelope', async () => {
    const missing = await request(app.getHttpServer()).get('/api/v1/missing').expect(404);
    expect(missing.body).toMatchObject({ statusCode: 404, path: '/api/v1/missing' });
    const conflict = await request(app.getHttpServer())
      .get('/api/v1/test-probe/conflict')
      .expect(409);
    expect(conflict.body.statusCode).toBe(409);
  });
  it('hides internal exception details on 500 responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/test-probe/failure')
      .expect(500);
    expect(response.body.message).toBe('Internal server error');
    expect(JSON.stringify(response.body)).not.toContain('Private implementation detail');
  });
  it('rejects undeclared and incorrectly typed fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/test-probe')
      .send({ name: 'valid', role: 'OWNER' })
      .expect(400);
    const response = await request(app.getHttpServer())
      .post('/api/v1/test-probe')
      .send({ name: 123 })
      .expect(400);
    expect(Array.isArray(response.body.message)).toBe(true);
    await request(app.getHttpServer())
      .post('/api/v1/test-probe')
      .send({ name: 'valid' })
      .expect(201);
  });
  it('allows configured CORS origins and omits permission for other origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'https://untrusted.example')
      .expect(200);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('serves Swagger UI and OpenAPI routes', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(response.body.paths['/api/v1/health']).toBeDefined();
  });
});
