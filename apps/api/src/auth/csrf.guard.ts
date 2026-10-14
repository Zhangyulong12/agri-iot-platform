import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Environment } from '../config/environment.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'GET') return true;
    const origins = this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim());
    if (
      !request.headers.origin ||
      !origins.includes(request.headers.origin) ||
      request.headers['x-flowdesk-csrf'] !== '1' ||
      !request.is('application/json')
    )
      throw new ForbiddenException('请求来源或 CSRF 校验失败');
    return true;
  }
}
