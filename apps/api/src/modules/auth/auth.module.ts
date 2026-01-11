import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionsService } from './services/permissions.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PortfolioGuard } from './guards/portfolio.guard';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuditModule } from '../audit/audit.module';


@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mdj-practice-manager-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    FileStorageModule,
    AuditModule,
  ],
  controllers: [AuthController],
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
    PassportModule, 
    PermissionsService,
    RolesGuard,
    PermissionsGuard,
    PortfolioGuard,
  ],
})
export class AuthModule {}