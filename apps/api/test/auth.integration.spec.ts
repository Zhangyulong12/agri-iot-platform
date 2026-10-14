import 'reflect-metadata';
import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { setupApp } from '../src/setup-app.js';
import { hashRefreshToken } from '../src/auth/auth.repository.js';

const enabled = process.env.RUN_DATABASE_TESTS === 'true';
if (enabled) {
  const target = new URL(process.env.TEST_DATABASE_URL ?? '');
  const development = new URL(process.env.DEV_DATABASE_URL ?? '');
  if (
    !target.pathname.endsWith('_test') ||
    decodeURIComponent(target.pathname) === decodeURIComponent(development.pathname)
  )
    throw new Error('Integration tests require a separate database ending in _test');
}

(enabled ? describe : describe.skip)('Authentication with real PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const prefix = `auth-${randomUUID()}`;
  const password = randomBytes(24).toString('base64url');
  const organizations: string[] = [];
  let sequence = 0;

  const post = (path: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/auth/${path}`)
      .set('Origin', 'http://127.0.0.1:5173')
      .set('X-FlowDesk-CSRF', '1');
  const me = (token: string) =>
    request(app.getHttpServer()).get('/api/v1/auth/me').auth(token, { type: 'bearer' });
  function cookie(response: { headers: Record<string, unknown> }): string {
    const values = response.headers['set-cookie'] as string[];
    return values.find((value) => value.startsWith('flowdesk_refresh='))!.split(';')[0]!;
  }
  const rawToken = (value: string) => value.slice(value.indexOf('=') + 1);
  async function register() {
    const email = `${prefix}-${sequence++}@example.com`;
    const response = await post('register')
      .send({ email, displayName: '测试用户', password })
      .expect(201);
    return {
      response,
      email,
      cookie: cookie(response),
      accessToken: response.body.accessToken as string,
    };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    process.env.CORS_ORIGINS = 'http://127.0.0.1:5173';
    process.env.COOKIE_SECURE = 'false';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });
  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.membership.deleteMany({ where: { organizationId: { in: organizations } } });
        await prisma.organization.deleteMany({ where: { id: { in: organizations } } });
        await prisma.user.deleteMany({ where: { email: { startsWith: `${prefix}-` } } });
      }
    } finally {
      if (app) await app.close();
    }
  });

  it('has a real ready database', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(response.body.database).toBe('up');
  });
  it('registers normalized identities, stores only hashes and returns public fields', async () => {
    const email = `${prefix}-${sequence++}@example.com`;
    const response = await post('register')
      .send({ email: ` ${email.toUpperCase()} `, displayName: ' 测试用户 ', password })
      .expect(201);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.displayName).toBe('测试用户');
    expect(Object.keys(response.body).sort()).toEqual(['accessToken', 'expiresIn', 'user']);
    expect(Object.keys(response.body.user).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'id',
    ]);
    expect(response.headers['cache-control']).toBe('no-store');
    const header = (response.headers['set-cookie'] as unknown as string[])[0]!;
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/api/v1/auth');
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain(password);
    const refresh = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashRefreshToken(rawToken(cookie(response))) },
    });
    expect(refresh.tokenHash).not.toBe(rawToken(cookie(response)));
    await me(response.body.accessToken).expect(200);
  });
  it('rejects normalized duplicate registration without creating another session', async () => {
    const user = await register();
    await post('register')
      .send({ email: user.email.toUpperCase(), displayName: '另一个', password })
      .expect(409);
    expect(await prisma.authSession.count({ where: { userId: user.response.body.user.id } })).toBe(
      1,
    );
  });
  it('logs in and gives the same error for missing accounts and wrong passwords', async () => {
    const user = await register();
    const response = await post('login').send({ email: user.email, password }).expect(200);
    await me(response.body.accessToken).expect(200);
    const wrong = await post('login')
      .send({ email: user.email, password: `${password}!` })
      .expect(401);
    const missing = await post('login')
      .send({ email: `${prefix}-missing@example.com`, password })
      .expect(401);
    expect(wrong.body.message).toBe(missing.body.message);
  });
  it('rejects blank names, short passwords and client-assigned roles', async () => {
    const input = { email: `${prefix}-invalid@example.com`, displayName: '测试', password };
    await post('register')
      .send({ ...input, displayName: '   ' })
      .expect(400);
    await post('register')
      .send({ ...input, password: 'short' })
      .expect(400);
    await post('register')
      .send({ ...input, role: 'OWNER' })
      .expect(400);
    expect(await prisma.user.count({ where: { email: input.email } })).toBe(0);
  });
  it('rejects missing, forged, expired and incorrectly scoped access tokens', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await me('forged.token.signature').expect(401);
    const user = await register();
    const claims = jwt.decode<{ sub: string; sid: string }>(user.accessToken);
    await me(await jwt.signAsync({ sub: claims.sub, sid: claims.sid }, { expiresIn: -1 })).expect(
      401,
    );
    await me(
      await jwt.signAsync({ sub: claims.sub, sid: claims.sid }, { audience: 'another-app' }),
    ).expect(401);
    await me(
      await jwt.signAsync({ sub: claims.sub, sid: claims.sid }, { issuer: 'another-api' }),
    ).expect(401);
    await me(await jwt.signAsync({ sub: claims.sub, sid: claims.sid })).expect(401);
  });
  it('rotates once, keeps the absolute expiry and revokes on old-token replay', async () => {
    const user = await register();
    const session = await prisma.authSession.findFirstOrThrow({
      where: { userId: user.response.body.user.id },
    });
    const refresh = await post('refresh').set('Cookie', user.cookie).send({}).expect(200);
    const next = cookie(refresh);
    expect(next).not.toBe(user.cookie);
    const old = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashRefreshToken(rawToken(user.cookie)) },
    });
    expect(old.consumedAt).not.toBeNull();
    const current = await prisma.authSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(current.expiresAt).toEqual(session.expiresAt);
    await post('refresh').set('Cookie', user.cookie).send({}).expect(401);
    await post('refresh').set('Cookie', next).send({}).expect(401);
    await me(refresh.body.accessToken).expect(401);
    expect(
      (await prisma.authSession.findUniqueOrThrow({ where: { id: session.id } })).revokedAt,
    ).not.toBeNull();
  });
  it('serializes concurrent consumption and commits replay revocation', async () => {
    const user = await register();
    const responses = await Promise.all([
      post('refresh').set('Cookie', user.cookie).send({}),
      post('refresh').set('Cookie', user.cookie).send({}),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    const success = responses.find((response) => response.status === 200)!;
    await me(success.body.accessToken).expect(401);
  });
  it('logs out idempotently and immediately invalidates the existing JWT', async () => {
    const user = await register();
    await post('logout').set('Cookie', user.cookie).send({}).expect(204);
    await me(user.accessToken).expect(401);
    await post('refresh').set('Cookie', user.cookie).send({}).expect(401);
    await post('logout').send({}).expect(204);
  });
  it('rejects expired sessions and invalid refresh cookies', async () => {
    const user = await register();
    await prisma.authSession.updateMany({
      where: { userId: user.response.body.user.id },
      data: { expiresAt: new Date(0) },
    });
    await me(user.accessToken).expect(401);
    await post('refresh').set('Cookie', user.cookie).send({}).expect(401);
    await post('refresh').set('Cookie', 'flowdesk_refresh=invalid').send({}).expect(401);
    await post('refresh').send({}).expect(401);
  });
  it('requires an allowed origin, the CSRF header and JSON for auth mutations', async () => {
    const input = { email: `${prefix}-csrf@example.com`, displayName: '测试', password };
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(input).expect(403);
    await post('register').set('Origin', 'https://untrusted.example').send(input).expect(403);
    await post('register').unset('X-FlowDesk-CSRF').send(input).expect(403);
    await post('register').type('form').send(input).expect(403);
    await post('logout').set('Origin', 'https://untrusted.example').send({}).expect(403);
  });
  it('enforces real membership uniqueness and foreign keys', async () => {
    const user = await register();
    const organization = await prisma.organization.create({
      data: { name: '约束验收', slug: prefix },
    });
    organizations.push(organization.id);
    const data = { organizationId: organization.id, userId: user.response.body.user.id };
    await prisma.membership.create({ data });
    await expect(prisma.membership.create({ data })).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.membership.create({ data: { ...data, userId: randomUUID() } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.membership.create({ data: { ...data, organizationId: randomUUID() } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.organization.delete({ where: { id: organization.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
