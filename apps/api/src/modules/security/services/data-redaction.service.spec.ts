import { Test, TestingModule } from '@nestjs/testing';
import { DataRedactionService } from './data-redaction.service';

describe('DataRedactionService', () => {
  let service: DataRedactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataRedactionService],
    }).compile();

    service = module.get<DataRedactionService>(DataRedactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('redactString', () => {
    it('should redact email addresses', () => {
      const text = 'Contact john.doe@example.com for more info';
      const redacted = service.redactString(text);
      expect(redacted).toBe('Contact [EMAIL_REDACTED] for more info');
    });

    it('should redact phone numbers', () => {
      const text = 'Call me at 123-456-7890 or +44 7123 456789';
      const redacted = service.redactString(text);
      expect(redacted).toContain('[PHONE_REDACTED]');
    });

    it('should redact UK postcodes', () => {
      const text = 'Address: 123 Main St, London SW1A 1AA';
      const redacted = service.redactString(text);
      expect(redacted).toContain('[POSTCODE_REDACTED]');
    });

    it('should redact National Insurance numbers', () => {
      const text = 'NI Number: AB123456C';
      const redacted = service.redactString(text);
      expect(redacted).toContain('[NI_NUMBER_REDACTED]');
    });

    it('should redact UTR numbers', () => {
      const text = 'UTR: 1234567890';
      const redacted = service.redactString(text);
      expect(redacted).toContain('[UTR_REDACTED]');
    });

    it('should redact bank account numbers', () => {
      const text = 'Account: 12345678 Sort: 12-34-56';
      const redacted = service.redactString(text);
      expect(redacted).toContain('[ACCOUNT_REDACTED]');
      expect(redacted).toContain('[SORT_CODE_REDACTED]');
    });

    it('should apply custom patterns', () => {
      const text = 'Secret code: ABC123';
      const options = {
        customPatterns: [
          { pattern: /ABC\d+/g, replacement: '[SECRET_CODE]' }
        ]
      };
      const redacted = service.redactString(text, options);
      expect(redacted).toBe('Secret code: [SECRET_CODE]');
    });

    it('should handle empty or null input', () => {
      expect(service.redactString('')).toBe('');
      expect(service.redactString(null as any)).toBe(null);
      expect(service.redactString(undefined as any)).toBe(undefined);
    });
  });

  describe('redactObject', () => {
    it('should redact specified fields only', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: 'London SW1A 1AA',
      };

      const redacted = service.redactObject(obj, {}, ['email', 'phone']);
      
      expect(redacted.name).toBe('John Doe');
      expect(redacted.email).toBe('[EMAIL_REDACTED]');
      expect(redacted.phone).toBe('[PHONE_REDACTED]');
      expect(redacted.address).toBe('London SW1A 1AA'); // Not in fieldsToRedact
    });

    it('should redact all string fields when no specific fields specified', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        count: 42,
      };

      const redacted = service.redactObject(obj);
      
      expect(redacted.email).toBe('[EMAIL_REDACTED]');
      expect(redacted.phone).toBe('[PHONE_REDACTED]');
      expect(redacted.count).toBe(42); // Number unchanged
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        contact: {
          phone: '123-456-7890',
        },
      };

      const redacted = service.redactObject(obj);
      
      expect(redacted.user.email).toBe('[EMAIL_REDACTED]');
      expect(redacted.contact.phone).toBe('[PHONE_REDACTED]');
    });
  });

  describe('redactForAI', () => {
    it('should redact sensitive data for AI interactions', () => {
      const data = {
        client: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        apiKey: 'key_123456',
      };

      const redacted = service.redactForAI(data);
      
      expect(redacted.email).toBe('[EMAIL_REDACTED]');
      expect(redacted.password).toContain('[PASSWORD_FIELD]');
      expect(redacted.apiKey).toContain('[KEY_FIELD]');
    });

    it('should handle string input', () => {
      const text = 'Email john@example.com with password secret123';
      const redacted = service.redactForAI(text);
      
      expect(redacted).toContain('[EMAIL_REDACTED]');
      expect(redacted).toContain('[PASSWORD_FIELD]');
    });
  });

  describe('redactForLogging', () => {
    it('should redact authentication data in JSON strings', () => {
      const logData = '{"email": "john@example.com", "password": "secret123", "token": "abc123"}';
      const redacted = service.redactForLogging(logData);
      
      expect(redacted).toContain('[EMAIL_REDACTED]');
      expect(redacted).toContain('"password": "[REDACTED]"');
      expect(redacted).toContain('"token": "[REDACTED]"');
    });

    it('should redact Bearer tokens', () => {
      const logData = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = service.redactForLogging(logData);
      
      expect(redacted).toContain('Bearer [REDACTED]');
    });
  });

  describe('containsSensitiveData', () => {
    it('should detect sensitive data', () => {
      expect(service.containsSensitiveData('john@example.com')).toBe(true);
      expect(service.containsSensitiveData('123-456-7890')).toBe(true);
      expect(service.containsSensitiveData('AB123456C')).toBe(true);
      expect(service.containsSensitiveData('London SW1A 1AA')).toBe(true);
    });

    it('should not detect non-sensitive data', () => {
      expect(service.containsSensitiveData('John Doe')).toBe(false);
      expect(service.containsSensitiveData('Hello world')).toBe(false);
      expect(service.containsSensitiveData('123')).toBe(false);
    });

    it('should handle empty or null input', () => {
      expect(service.containsSensitiveData('')).toBe(false);
      expect(service.containsSensitiveData(null as any)).toBe(false);
      expect(service.containsSensitiveData(undefined as any)).toBe(false);
    });
  });

  describe('getRedactionSummary', () => {
    it('should count redactions by type', () => {
      const originalText = 'Contact john@example.com or jane@test.com, call 123-456-7890, NI: AB123456C';
      const redactedText = service.redactString(originalText);
      
      const summary = service.getRedactionSummary(originalText, redactedText);
      
      expect(summary.emailsRedacted).toBe(2);
      expect(summary.phonesRedacted).toBe(1);
      expect(summary.personalIdsRedacted).toBe(1);
      expect(summary.totalRedactions).toBe(4);
    });

    it('should handle text with no sensitive data', () => {
      const text = 'This is just normal text';
      const summary = service.getRedactionSummary(text, text);
      
      expect(summary.totalRedactions).toBe(0);
      expect(summary.emailsRedacted).toBe(0);
      expect(summary.phonesRedacted).toBe(0);
    });
  });
});