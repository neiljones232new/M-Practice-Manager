import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum StaffRole {
  PARTNER_DIRECTOR = 'PARTNER_DIRECTOR',
  MANAGER = 'MANAGER',
  SENIOR_STAFF = 'SENIOR_STAFF',
  STAFF = 'STAFF',
  TRAINEE = 'TRAINEE',
}

export class CreateStaffDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
