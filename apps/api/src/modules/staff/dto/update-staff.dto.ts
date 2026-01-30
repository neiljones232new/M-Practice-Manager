import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StaffRole } from './create-staff.dto';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
