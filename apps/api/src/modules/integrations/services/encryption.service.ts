import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  
  // In production, this should be loaded from environment variables or secure key management
  private readonly masterKey: Buffer;

  constructor() {
    // Generate or load master key - in production this should come from secure storage
    const keyString = process.env.MDJ_ENCRYPTION_KEY || 'mdj-default-key-change-in-production-32-chars';
    this.masterKey = crypto.scryptSync(keyString, 'salt', this.keyLength);
    
    if (!process.env.MDJ_ENCRYPTION_KEY) {
      this.logger.warn('Using default encryption key - please set MDJ_ENCRYPTION_KEY environment variable in production');
    }
  }

  /**
   * Encrypt sensitive data like API keys
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data like API keys
   */
  decrypt(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      const iv = combined.subarray(0, this.ivLength);
      const encrypted = combined.subarray(this.ivLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash data for comparison without storing the original
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure random string for tokens or IDs
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify if encrypted data can be decrypted (for validation)
   */
  canDecrypt(encryptedData: string): boolean {
    try {
      this.decrypt(encryptedData);
      return true;
    } catch {
      return false;
    }
  }
}