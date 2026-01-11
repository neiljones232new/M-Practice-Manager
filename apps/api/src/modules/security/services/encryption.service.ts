import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get encryption key from environment or generate one
   */
  private getEncryptionKey(): Buffer {
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (keyString) {
      return Buffer.from(keyString, 'hex');
    }
    
    // Generate a new key if none exists (for development)
    const key = crypto.randomBytes(this.keyLength);
    this.logger.warn('No ENCRYPTION_KEY found in environment. Generated temporary key for development.');
    this.logger.warn(`Set ENCRYPTION_KEY=${key.toString('hex')} in your environment for production.`);
    
    return key;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        data: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      const key = this.getEncryptionKey();
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt an object's sensitive fields
   */
  encryptObject<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field] as string) as T[keyof T];
      }
    }
    
    return result;
  }

  /**
   * Decrypt an object's sensitive fields
   */
  decryptObject<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of sensitiveFields) {
      if (result[field] && typeof result[field] === 'object') {
        try {
          result[field] = this.decrypt(result[field] as EncryptedData) as T[keyof T];
        } catch (error) {
          this.logger.error(`Failed to decrypt field ${String(field)}:`, error);
          // Keep encrypted data if decryption fails
        }
      }
    }
    
    return result;
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
    return `${actualSalt}:${hash.toString('hex')}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
      return hash === verifyHash.toString('hex');
    } catch (error) {
      this.logger.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure API key
   */
  generateApiKey(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(24).toString('base64url');
    return `mdj_${timestamp}_${randomPart}`;
  }
}