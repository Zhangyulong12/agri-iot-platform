import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { HealthResponseDto, ReadinessResponseDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): HealthResponseDto {
    return { status: 'ok', service: 'flowdesk-api', timestamp: new Date().toISOString() };
  }

  async getReadiness(): Promise<ReadinessResponseDto> {
    if (!(await this.prisma.isReady())) {
      throw new ServiceUnavailableException('Database is unavailable');
    }
    return { ...this.getLiveness(), database: 'up' };
  }
}
