import { IsString, IsDateString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AccountingFramework } from '../interfaces/accounts-set.interface';

export class CreateAccountsSetDto {
  @IsString()
  clientId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsEnum(['MICRO_FRS105', 'SMALL_FRS102_1A', 'DORMANT'])
  framework: AccountingFramework;

  @IsOptional()
  @IsBoolean()
  isFirstYear?: boolean;
}
