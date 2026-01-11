import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'test-api-key-12345';
      
      const encrypted = service.encrypt(plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
      
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different encrypted values for same input', () => {
      const plaintext = 'test-api-key-12345';
      
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'test-key-with-special-chars!@#$%^&*()';
      
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => service.decrypt('invalid-encrypted-data')).toThrow();
    });
  });

  describe('hash', () => {
    it('should generate consistent hash for same input', () => {
      const data = 'test-data-to-hash';
      
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
    });

    it('should generate different hashes for different inputs', () => {
      const data1 = 'test-data-1';
      const data2 = 'test-data-2';
      
      const hash1 = service.hash(data1);
      const hash2 = service.hash(data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of default length', () => {
      const token = service.generateSecureToken();
      
      expect(token).toBeDefined();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it('should generate token of specified length', () => {
      const length = 16;
      const token = service.generateSecureToken(length);
      
      expect(token).toBeDefined();
      expect(token).toHaveLength(length * 2); // bytes to hex characters
    });

    it('should generate different tokens each time', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('canDecrypt', () => {
    it('should return true for valid encrypted data', () => {
      const plaintext = 'test-api-key';
      const encrypted = service.encrypt(plaintext);
      
      expect(service.canDecrypt(encrypted)).toBe(true);
    });

    it('should return false for invalid encrypted data', () => {
      expect(service.canDecrypt('invalid-data')).toBe(false);
      expect(service.canDecrypt('')).toBe(false);
      expect(service.canDecrypt('not-base64-data')).toBe(false);
    });
  });
});