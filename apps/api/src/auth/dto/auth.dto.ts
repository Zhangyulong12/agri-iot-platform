import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '邮箱（自动 trim、小写）', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: '密码，12–128 字符',
    minLength: 12,
    maxLength: 128,
    format: 'password',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({ description: '显示名称', minLength: 1, maxLength: 80 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;
}

export class PublicUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty()
  displayName!: string;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: '仅保存于前端内存的 JWT' })
  accessToken!: string;
  @ApiProperty({ example: 900 })
  expiresIn!: number;
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;
}
