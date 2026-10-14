import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service.js';
import { HealthResponseDto, ReadinessResponseDto } from './dto/health-response.dto.js';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'API 存活检查，不代表数据库已连接' })
  @ApiOkResponse({ type: HealthResponseDto })
  getLiveness(): HealthResponseDto {
    return this.health.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: '数据库就绪检查，执行 SELECT 1' })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({ description: '数据库不可用' })
  getReadiness(): Promise<ReadinessResponseDto> {
    return this.health.getReadiness();
  }
}
