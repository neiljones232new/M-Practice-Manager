import { Module, forwardRef } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FileStorageModule, forwardRef(() => AuthModule)],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}