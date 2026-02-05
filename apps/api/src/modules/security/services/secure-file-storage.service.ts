import { Injectable, Logger } from '@nestjs/common';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { EncryptionService, EncryptedData } from './encryption.service';
import { DataRedactionService } from './data-redaction.service';

export interface SecureStorageOptions {
  encrypt?: boolean;
  redactForLogging?: boolean;
  sensitiveFields?: string[];
}

@Injectable()
export class SecureFileStorageService {
  private readonly logger = new Logger(SecureFileStorageService.name);

  constructor(
    private readonly fileStorage: FileStorageService,
    private readonly encryption: EncryptionService,
    private readonly redaction: DataRedactionService,
  ) {}

  /**
   * Write data with optional encryption
   */
  async writeSecureFile<T>(
    path: string, 
    data: T, 
    options: SecureStorageOptions = {}
  ): Promise<void> {
    try {
      let processedData = data;

      // Encrypt sensitive fields if specified
      if (options.encrypt && options.sensitiveFields && typeof data === 'object' && data !== null) {
        processedData = this.encryption.encryptObject(
          data as Record<string, any>, 
          options.sensitiveFields
        ) as T;
      }

      await this.fileStorage.writeFile(path, processedData);

      // Log with redaction if enabled
      if (options.redactForLogging) {
        const redactedData = this.redaction.redactForLogging(data);
        this.logger.log(`Secure file written: ${path}`, { data: redactedData });
      } else {
        this.logger.log(`Secure file written: ${path}`);
      }
    } catch (error) {
      this.logger.error(`Failed to write secure file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Read data with optional decryption
   */
  async readSecureFile<T>(
    path: string, 
    options: SecureStorageOptions = {}
  ): Promise<T | null> {
    try {
      const data = await this.fileStorage.readFile<T>(path);
      
      if (!data) {
        return null;
      }

      let processedData = data;

      // Decrypt sensitive fields if specified
      if (options.encrypt && options.sensitiveFields && typeof data === 'object' && data !== null) {
        processedData = this.encryption.decryptObject(
          data as Record<string, any>, 
          options.sensitiveFields
        ) as any;
      }

      return processedData;
    } catch (error) {
      this.logger.error(`Failed to read secure file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Store encrypted client data
   */
  async writeClientData(clientId: string, clientData: any): Promise<void> {
    const sensitiveFields = [
      'mainEmail', 
      'mainPhone', 
      'address', 
      'registeredNumber',
      'taxReference',
      'bankDetails'
    ];

    await this.writeSecureFile(
      `clients/${clientId}.json`,
      clientData,
      {
        encrypt: true,
        sensitiveFields,
        redactForLogging: true,
      }
    );
  }

  /**
   * Read encrypted client data
   */
  async readClientData(clientId: string): Promise<any> {
    const sensitiveFields = [
      'mainEmail', 
      'mainPhone', 
      'address', 
      'registeredNumber',
      'taxReference',
      'bankDetails'
    ];

    return this.readSecureFile(
      `clients/${clientId}.json`,
      {
        encrypt: true,
        sensitiveFields,
      }
    );
  }

  /**
   * Store encrypted integration credentials
   */
  async writeIntegrationCredentials(integrationId: string, credentials: any): Promise<void> {
    const sensitiveFields = ['apiKey', 'secret', 'token', 'password'];

    await this.writeSecureFile(
      `config/integrations/${integrationId}.json`,
      credentials,
      {
        encrypt: true,
        sensitiveFields,
        redactForLogging: true,
      }
    );
  }

  /**
   * Read encrypted integration credentials
   */
  async readIntegrationCredentials(integrationId: string): Promise<any> {
    const sensitiveFields = ['apiKey', 'secret', 'token', 'password'];

    return this.readSecureFile(
      `config/integrations/${integrationId}.json`,
      {
        encrypt: true,
        sensitiveFields,
      }
    );
  }

  /**
   * Store user authentication data
   */
  async writeUserAuthData(userId: string, authData: any): Promise<void> {
    const sensitiveFields = ['passwordHash', 'salt', 'refreshToken', 'recoveryToken'];

    await this.writeSecureFile(
      `auth/users/${userId}.json`,
      authData,
      {
        encrypt: true,
        sensitiveFields,
        redactForLogging: true,
      }
    );
  }

  /**
   * Read user authentication data
   */
  async readUserAuthData(userId: string): Promise<any> {
    const sensitiveFields = ['passwordHash', 'salt', 'refreshToken', 'recoveryToken'];

    return this.readSecureFile(
      `auth/users/${userId}.json`,
      {
        encrypt: true,
        sensitiveFields,
      }
    );
  }

  /**
   * Backup sensitive data with encryption
   */
  async createSecureBackup(backupName: string, data: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const backupData = {
      timestamp,
      data: this.encryption.encrypt(JSON.stringify(data)),
      checksum: this.encryption.hash(JSON.stringify(data)),
    };

    await this.fileStorage.writeFile(`backups/${backupName}-${timestamp}.json`, backupData);
    this.logger.log(`Secure backup created: ${backupName}`);
  }

  /**
   * Restore from secure backup
   */
  async restoreSecureBackup(backupPath: string): Promise<any> {
    try {
      const backupData = await this.fileStorage.readFile(backupPath);
      
      const backupDataTyped = backupData as { data?: any; checksum?: string };
      
      if (!backupDataTyped || !backupDataTyped.data) {
        throw new Error('Invalid backup file');
      }

      const decryptedData = this.encryption.decrypt(backupDataTyped.data as EncryptedData);
      const parsedData = JSON.parse(decryptedData);

      // Verify checksum if available
      if (backupDataTyped.checksum) {
        const isValid = this.encryption.verifyHash(JSON.stringify(parsedData), backupDataTyped.checksum);
        if (!isValid) {
          throw new Error('Backup integrity check failed');
        }
      }

      this.logger.log(`Secure backup restored: ${backupPath}`);
      return parsedData;
    } catch (error) {
      this.logger.error(`Failed to restore secure backup ${backupPath}:`, error);
      throw error;
    }
  }

  /**
   * Securely delete file (overwrite before deletion)
   */
  async secureDelete(path: string): Promise<void> {
    try {
      // Overwrite with random data multiple times
      for (let i = 0; i < 3; i++) {
        const randomData = this.encryption.generateSecureToken(1024);
        await this.fileStorage.writeFile(path, { secureWipe: randomData });
      }

      // Finally delete the file
      await this.fileStorage.deleteFile(path);
      this.logger.log(`File securely deleted: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to securely delete file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Audit file access
   */
  async auditFileAccess(
    path: string, 
    operation: 'READ' | 'WRITE' | 'DELETE', 
    userId: string,
    success: boolean,
    metadata?: any
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      path,
      operation,
      userId,
      success,
      metadata: this.redaction.redactForLogging(metadata),
    };

    const auditPath = `audit/file-access/${new Date().toISOString().slice(0, 7)}.json`;
    
    try {
      const existingAudit = await this.fileStorage.readFile(auditPath) || [];
      (existingAudit as any[]).push(auditEntry);
      await this.fileStorage.writeFile(auditPath, existingAudit);
    } catch (error) {
      this.logger.error('Failed to write file access audit:', error);
    }
  }
}
