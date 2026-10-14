import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import type { Environment } from '../config/environment.js';
import { AuthService } from './auth.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { Public } from './public.decorator.js';
import { AuthResponseDto, LoginDto, PublicUserDto, RegisterDto } from './dto/auth.dto.js';
import type { AuthenticatedRequest } from './auth.guard.js';

export const REFRESH_COOKIE = 'flowdesk_refresh';

@ApiTags('身份认证')
@Controller('auth')
@UseGuards(CsrfGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }) === 'true',
      path: '/api/v1/auth',
    };
  }

  private token(request: Request): string | undefined {
    const value = (request.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
  }

  private respond(
    response: Response,
    result: Awaited<ReturnType<AuthService['login']>>,
  ): AuthResponseDto {
    response.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      expires: result.expiresAt,
    });
    return result.body;
  }

  @Public()
  @Post('register')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '注册并登录（邮箱暂未验证）' })
  @ApiHeader({ name: 'X-FlowDesk-CSRF', required: true, schema: { type: 'string', enum: ['1'] } })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: '邮箱已注册' })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(response, await this.auth.register(body));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '邮箱密码登录' })
  @ApiHeader({ name: 'X-FlowDesk-CSRF', required: true, schema: { type: 'string', enum: ['1'] } })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: '邮箱或密码错误' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(response, await this.auth.login(body));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '通过 HttpOnly Cookie 轮换会话' })
  @ApiHeader({ name: 'X-FlowDesk-CSRF', required: true, schema: { type: 'string', enum: ['1'] } })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: '会话无效、过期或刷新令牌重放' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    try {
      return this.respond(response, await this.auth.refresh(this.token(request)));
    } catch (error) {
      if (error instanceof UnauthorizedException)
        response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '撤销当前会话并清除 Cookie' })
  @ApiHeader({ name: 'X-FlowDesk-CSRF', required: true, schema: { type: 'string', enum: ['1'] } })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(this.token(request));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询当前登录用户' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: '需要有效 JWT 和未撤销会话' })
  me(@Req() request: AuthenticatedRequest): PublicUserDto {
    return request.user;
  }
}
