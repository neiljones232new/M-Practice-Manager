import { IsArray, IsInt, IsOptional, IsString, ArrayMinSize, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MergePortfoliosDto {
  @ApiProperty({
    description: 'Array of source portfolio codes to merge',
    example: [2, 3, 4],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  sourcePortfolioCodes: number[];

  @ApiPropertyOptional({
    description: 'Target portfolio code to merge into (existing portfolio)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @ValidateIf((o) => !o.newPortfolioName)
  targetPortfolioCode?: number;

  @ApiPropertyOptional({
    description: 'Name for new portfolio to create for merge',
    example: 'Merged Portfolio',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.targetPortfolioCode)
  newPortfolioName?: string;
}