import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthRepository } from './auth.repository.js';
import { PUBLIC_ROUTE } from './public.decorator.js';
import type { PublicUserDto } from './dto/auth.dto.js';

export type AuthenticatedRequest = Request & { user: PublicUserDto };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly repository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([^\s]+)$/.exec(request.headers.authorization ?? '');
    if (!match?.[1]) throw new UnauthorizedException('请先登录');
    let payload: { sub: string; sid: string; exp: number };
    try {
      payload = await this.jwt.verifyAsync(match[1]);
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (
        typeof payload.sub !== 'string' ||
        !uuid.test(payload.sub) ||
        typeof payload.sid !== 'string' ||
        !uuid.test(payload.sid) ||
        typeof payload.exp !== 'number'
      )
        throw new Error('Invalid claims');
    } catch {
      throw new UnauthorizedException('登录凭据无效或已过期');
    }
    const user = await this.repository.findActiveUser(payload.sid, payload.sub, new Date());
    if (!user) throw new UnauthorizedException('登录会话已失效');
    request.user = user;
    return true;
  }
}
