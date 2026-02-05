import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserManagementController } from './controllers/user-management.controller';

import { PermissionsService } from './services/permissions.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PortfolioGuard } from './guards/portfolio.guard';

import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuditModule } from '../audit/audit.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    FileStorageModule,
    AuditModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],

  controllers: [
    AuthController,
    UserManagementController,
  ],

  providers: [
    AuthService,
    JwtStrategy,
    PermissionsService,
    RolesGuard,
    PermissionsGuard,
    PortfolioGuard,
  ],

  exports: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    PermissionsGuard,
    PortfolioGuard,
  ],
})
export class AuthModule {}
