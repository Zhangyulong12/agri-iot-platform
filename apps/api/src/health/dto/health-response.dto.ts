import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ example: 'flowdesk-api' })
  service!: string;

  @ApiProperty({ example: '2026-10-13T00:00:00.000Z', format: 'date-time' })
  timestamp!: string;
}

export class ReadinessResponseDto extends HealthResponseDto {
  @ApiProperty({ example: 'up', enum: ['up'] })
  database!: 'up';
}
