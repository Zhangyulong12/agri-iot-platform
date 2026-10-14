import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PublicUserDto } from './dto/auth.dto.js';

export const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
export const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCredentials(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, passwordHash: true },
    });
  }

  createUserSession(
    data: { email: string; displayName: string; passwordHash: string },
    token: string,
    expiresAt: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data, select: publicUserSelect });
      const session = await tx.authSession.create({
        data: {
          userId: user.id,
          expiresAt,
          refreshTokens: { create: { tokenHash: hashRefreshToken(token) } },
        },
      });
      return { user, sessionId: session.id, expiresAt };
    });
  }

  createSession(user: PublicUserDto, token: string, expiresAt: Date) {
    return this.prisma.authSession
      .create({
        data: {
          userId: user.id,
          expiresAt,
          refreshTokens: { create: { tokenHash: hashRefreshToken(token) } },
        },
      })
      .then((session) => ({ user, sessionId: session.id, expiresAt }));
  }

  async rotate(token: string, nextToken: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(token) },
      });
      if (!record) return null;
      await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${record.sessionId}::uuid FOR UPDATE`;
      const current = await tx.refreshToken.findUnique({
        where: { id: record.id },
        include: { session: { include: { user: { select: publicUserSelect } } } },
      });
      if (!current || current.session.revokedAt || current.session.expiresAt <= now) return null;
      if (current.consumedAt) {
        await tx.authSession.update({ where: { id: record.sessionId }, data: { revokedAt: now } });
        return null;
      }
      await tx.refreshToken.update({ where: { id: record.id }, data: { consumedAt: now } });
      await tx.refreshToken.create({
        data: { sessionId: record.sessionId, tokenHash: hashRefreshToken(nextToken) },
      });
      return {
        user: current.session.user,
        sessionId: record.sessionId,
        expiresAt: current.session.expiresAt,
      };
    });
  }

  async revoke(token: string, now: Date): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(token) },
      select: { sessionId: true },
    });
    if (record)
      await this.prisma.authSession.updateMany({
        where: { id: record.sessionId, revokedAt: null },
        data: { revokedAt: now },
      });
  }

  async findActiveUser(sessionId: string, userId: string, now: Date) {
    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: now } },
      select: { user: { select: publicUserSelect } },
    });
    return session?.user ?? null;
  }
}
