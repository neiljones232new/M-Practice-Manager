import { IsObject, IsOptional } from 'class-validator';

export class UpdateSectionDto {
  @IsObject()
  @IsOptional()
  data?: any; // Will be validated against specific section schemas
}