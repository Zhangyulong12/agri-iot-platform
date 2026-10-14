import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import type { Environment } from '../config/environment.js';
import { AuthRepository } from './auth.repository.js';
import { PasswordService } from './password.service.js';
import type { LoginDto, PublicUserDto, RegisterDto } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private expiration(): Date {
    return new Date(
      Date.now() + this.config.get('REFRESH_SESSION_TTL_DAYS', { infer: true }) * 86400000,
    );
  }

  private async result(
    session: { user: PublicUserDto; sessionId: string; expiresAt: Date },
    refreshToken: string,
  ) {
    const expiresIn = this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: session.user.id, sid: session.sessionId },
      { expiresIn },
    );
    return {
      body: { accessToken, expiresIn, user: session.user },
      refreshToken,
      expiresAt: session.expiresAt,
    };
  }

  async register(input: RegisterDto) {
    const refreshToken = randomBytes(32).toString('base64url');
    try {
      const session = await this.repository.createUserSession(
        {
          email: input.email,
          displayName: input.displayName,
          passwordHash: await this.passwords.hash(input.password),
        },
        refreshToken,
        this.expiration(),
      );
      return this.result(session, refreshToken);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('该邮箱已被注册');
      throw error;
    }
  }

  async login(input: LoginDto) {
    const credentials = await this.repository.findCredentials(input.email);
    const valid = await this.passwords.verify(input.password, credentials?.passwordHash);
    if (!credentials || !valid) throw new UnauthorizedException('邮箱或密码错误');
    const { id, email, displayName, createdAt } = credentials;
    const refreshToken = randomBytes(32).toString('base64url');
    return this.result(
      await this.repository.createSession(
        { id, email, displayName, createdAt },
        refreshToken,
        this.expiration(),
      ),
      refreshToken,
    );
  }

  async refresh(token: string | undefined) {
    if (!token) throw new UnauthorizedException('登录会话无效，请重新登录');
    const nextToken = randomBytes(32).toString('base64url');
    const session = await this.repository.rotate(token, nextToken, new Date());
    if (!session) throw new UnauthorizedException('登录会话无效，请重新登录');
    return this.result(session, nextToken);
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.repository.revoke(token, new Date());
  }
}
