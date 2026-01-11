import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './services/encryption.service';
import { DataRedactionService } from './services/data-redaction.service';
import { SessionSecurityService } from './services/session-security.service';
import { SecureFileStorageService } from './services/secure-file-storage.service';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [ConfigModule, FileStorageModule],
  providers: [
    EncryptionService,
    DataRedactionService,
    SessionSecurityService,
    SecureFileStorageService,
  ],
  exports: [
    EncryptionService,
    DataRedactionService,
    SessionSecurityService,
    SecureFileStorageService,
  ],
})
export class SecurityModule {}