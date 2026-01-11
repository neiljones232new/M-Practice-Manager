import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePortfolioDto {
  @ApiPropertyOptional({
    description: 'Portfolio code (auto-generated if not provided)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  code?: number;

  @ApiProperty({
    description: 'Portfolio name',
    example: 'Main Portfolio',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Portfolio description',
    example: 'Primary client portfolio for the practice',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}