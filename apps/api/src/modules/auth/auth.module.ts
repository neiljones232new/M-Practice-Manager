import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserManagementController } from './controllers/user-management.controller';

import { PermissionsService } from './services/permissions.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PortfolioGuard } from './guards/portfolio.guard';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
  ],

  controllers: [
    AuthController,
    UserManagementController,
  ],

  providers: [
    AuthService,
    PermissionsService,
    RolesGuard,
    PermissionsGuard,
    PortfolioGuard,
  ],

  exports: [
    AuthService,
    PermissionsService,
    RolesGuard,
    PermissionsGuard,
    PortfolioGuard,
  ],
})
export class AuthModule {}
