import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'), // 64 char hex = 32 bytes
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', () => {
      const plaintext = 'sensitive data';
      
      const encrypted = service.encrypt(plaintext);
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different encrypted data for same input', () => {
      const plaintext = 'test data';
      
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      
      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail to decrypt with wrong data', () => {
      const plaintext = 'test data';
      const encrypted = service.encrypt(plaintext);
      
      // Corrupt the encrypted data
      encrypted.data = 'corrupted';
      
      expect(() => service.decrypt(encrypted)).toThrow('Failed to decrypt data');
    });
  });

  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt object fields', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        publicData: 'not sensitive',
      };
      
      const sensitiveFields = ['email', 'phone'] as ('email' | 'name' | 'phone' | 'publicData')[];
      
      const encrypted = service.encryptObject(obj, sensitiveFields);
      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.publicData).toBe('not sensitive');
      expect(typeof encrypted.email).toBe('object');
      expect(typeof encrypted.phone).toBe('object');
      
      const decrypted = service.decryptObject(encrypted, sensitiveFields);
      expect(decrypted).toEqual(obj);
    });

    it('should handle missing fields gracefully', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      
      const sensitiveFields = ['email', 'name'] as ('email' | 'name')[];
      
      const encrypted = service.encryptObject(obj, sensitiveFields);
      const decrypted = service.decryptObject(encrypted, sensitiveFields);
      
      expect(decrypted.name).toBe('John Doe');
      expect(decrypted.email).toBe('john@example.com');
    });
  });

  describe('hash and verifyHash', () => {
    it('should hash and verify data successfully', () => {
      const data = 'password123';
      
      const hashed = service.hash(data);
      expect(hashed).toContain(':');
      
      const isValid = service.verifyHash(data, hashed);
      expect(isValid).toBe(true);
      
      const isInvalid = service.verifyHash('wrongpassword', hashed);
      expect(isInvalid).toBe(false);
    });

    it('should produce different hashes for same input', () => {
      const data = 'password123';
      
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);
      
      expect(hash1).not.toBe(hash2);
      expect(service.verifyHash(data, hash1)).toBe(true);
      expect(service.verifyHash(data, hash2)).toBe(true);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure tokens of specified length', () => {
      const token1 = service.generateSecureToken(16);
      const token2 = service.generateSecureToken(32);
      
      expect(token1).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token2).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens each time', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateApiKey', () => {
    it('should generate API keys with correct format', () => {
      const apiKey = service.generateApiKey();
      
      expect(apiKey).toMatch(/^mdj_[a-z0-9]+_[A-Za-z0-9_-]+$/);
      expect(apiKey.startsWith('mdj_')).toBe(true);
    });

    it('should generate unique API keys', () => {
      const key1 = service.generateApiKey();
      const key2 = service.generateApiKey();
      
      expect(key1).not.toBe(key2);
    });
  });
});