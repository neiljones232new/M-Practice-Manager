import { Injectable, Logger } from '@nestjs/common';

export interface RedactionOptions {
  redactEmails?: boolean;
  redactPhones?: boolean;
  redactAddresses?: boolean;
  redactFinancial?: boolean;
  redactPersonalIds?: boolean;
  customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
}

@Injectable()
export class DataRedactionService {
  private readonly logger = new Logger(DataRedactionService.name);

  // Common patterns for sensitive data
  private readonly patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    ukPhone: /(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}/g,
    postcode: /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/gi,
    niNumber: /\b[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}\b/gi,
    utr: /\bUTR:?\s*[0-9]{10}\b/gi,
    companyNumber: /\b\d{8}\b/g, // Keep broad for now, but order matters
    bankAccount: /\bAccount:?\s*\d{8}\b/gi,
    sortCode: /\b[0-9]{2}-[0-9]{2}-[0-9]{2}\b/g,
    creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  };

  /**
   * Redact sensitive data from a string
   */
  redactString(text: string, options: RedactionOptions = {}): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let redactedText = text;

    // Apply default redactions - more specific patterns first
    if (options.redactFinancial !== false) {
      redactedText = redactedText.replace(this.patterns.bankAccount, '[ACCOUNT_REDACTED]');
      redactedText = redactedText.replace(this.patterns.sortCode, '[SORT_CODE_REDACTED]');
      redactedText = redactedText.replace(this.patterns.creditCard, '[CARD_REDACTED]');
    }

    if (options.redactPersonalIds !== false) {
      redactedText = redactedText.replace(this.patterns.utr, '[UTR_REDACTED]');
      redactedText = redactedText.replace(this.patterns.niNumber, '[NI_NUMBER_REDACTED]');
      redactedText = redactedText.replace(this.patterns.companyNumber, '[COMPANY_NUMBER_REDACTED]');
    }

    if (options.redactEmails !== false) {
      redactedText = redactedText.replace(this.patterns.email, '[EMAIL_REDACTED]');
    }

    if (options.redactPhones !== false) {
      redactedText = redactedText.replace(this.patterns.phone, '[PHONE_REDACTED]');
      redactedText = redactedText.replace(this.patterns.ukPhone, '[PHONE_REDACTED]');
    }

    if (options.redactAddresses !== false) {
      redactedText = redactedText.replace(this.patterns.postcode, '[POSTCODE_REDACTED]');
    }

    // Apply custom patterns
    if (options.customPatterns) {
      for (const { pattern, replacement } of options.customPatterns) {
        redactedText = redactedText.replace(pattern, replacement);
      }
    }

    return redactedText;
  }

  /**
   * Redact sensitive data from an object
   */
  redactObject<T extends Record<string, any>>(
    obj: T, 
    options: RedactionOptions = {},
    fieldsToRedact?: (keyof T)[]
  ): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const redacted = { ...obj };

    // If specific fields are specified, only redact those
    if (fieldsToRedact) {
      for (const field of fieldsToRedact) {
        if (redacted[field] && typeof redacted[field] === 'string') {
          redacted[field] = this.redactString(redacted[field] as string, options) as T[keyof T];
        }
      }
    } else {
      // Redact all string fields
      for (const [key, value] of Object.entries(redacted)) {
        // Check if field name indicates sensitive data
        const isSensitiveField = /(password|secret|token|key|auth|credential|postcode)/i.test(key);
        
        if (typeof value === 'string') {
          let redactedValue = this.redactString(value, options);
          if (isSensitiveField) {
            redactedValue = this.getFieldRedactionPlaceholder(key);
          }
          redacted[key as keyof T] = redactedValue as T[keyof T];
        } else if (typeof value === 'object' && value !== null) {
          // Recursively redact nested objects
          redacted[key as keyof T] = this.redactObject(value, options) as T[keyof T];
        }
      }
    }

    return redacted;
  }

  /**
   * Get placeholder for sensitive field names
   */
  private getFieldRedactionPlaceholder(fieldName: string): string {
    const lowerField = fieldName.toLowerCase();
    if (lowerField.includes('password')) return '[PASSWORD_FIELD]';
    if (lowerField.includes('secret')) return '[SECRET_FIELD]';
    if (lowerField.includes('token')) return '[TOKEN_FIELD]';
    if (lowerField.includes('key')) return '[KEY_FIELD]';
    if (lowerField.includes('auth')) return '[AUTH_FIELD]';
    if (lowerField.includes('credential')) return '[CREDENTIAL_FIELD]';
    if (lowerField.includes('postcode')) return '[POSTCODE_FIELD]';
    return '[REDACTED_FIELD]';
  }

  /**
   * Redact data for AI interactions
   */
  redactForAI(data: any): any {
    const aiRedactionOptions: RedactionOptions = {
      redactEmails: true,
      redactPhones: true,
      redactAddresses: true,
      redactFinancial: true,
      redactPersonalIds: true,
      customPatterns: [
        // Additional patterns for AI safety
        { pattern: /\bpassword\b/gi, replacement: '[PASSWORD_FIELD]' },
        { pattern: /\bsecret\b/gi, replacement: '[SECRET_FIELD]' },
        { pattern: /\btoken\b/gi, replacement: '[TOKEN_FIELD]' },
        { pattern: /\bkey\b/gi, replacement: '[KEY_FIELD]' },
      ],
    };

    if (typeof data === 'string') {
      return this.redactString(data, aiRedactionOptions);
    } else if (typeof data === 'object' && data !== null) {
      return this.redactObject(data, aiRedactionOptions);
    }

    return data;
  }

  /**
   * Redact data for logging
   */
  redactForLogging(data: any): any {
    const loggingRedactionOptions: RedactionOptions = {
      redactEmails: true,
      redactPhones: true,
      redactAddresses: true,
      redactFinancial: true,
      redactPersonalIds: true,
      customPatterns: [
        // Redact authentication data
        { pattern: /"password":\s*"[^"]*"/gi, replacement: '"password": "[REDACTED]"' },
        { pattern: /"token":\s*"[^"]*"/gi, replacement: '"token": "[REDACTED]"' },
        { pattern: /"secret":\s*"[^"]*"/gi, replacement: '"secret": "[REDACTED]"' },
        { pattern: /"key":\s*"[^"]*"/gi, replacement: '"key": "[REDACTED]"' },
        { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'Bearer [REDACTED]' },
      ],
    };

    if (typeof data === 'string') {
      return this.redactString(data, loggingRedactionOptions);
    } else if (typeof data === 'object' && data !== null) {
      return this.redactObject(data, loggingRedactionOptions);
    }

    return data;
  }

  /**
   * Check if a string contains sensitive data
   */
  containsSensitiveData(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const sensitivePatterns = [
      this.patterns.email,
      this.patterns.phone,
      this.patterns.ukPhone,
      this.patterns.postcode,
      this.patterns.niNumber,
      this.patterns.utr,
      this.patterns.companyNumber,
      this.patterns.bankAccount,
      this.patterns.sortCode,
      this.patterns.creditCard,
    ];

    return sensitivePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Get redaction summary
   */
  getRedactionSummary(originalText: string, redactedText: string): {
    emailsRedacted: number;
    phonesRedacted: number;
    personalIdsRedacted: number;
    financialDataRedacted: number;
    totalRedactions: number;
  } {
    const summary = {
      emailsRedacted: 0,
      phonesRedacted: 0,
      personalIdsRedacted: 0,
      financialDataRedacted: 0,
      totalRedactions: 0,
    };

    // Count redactions by type
    const emailMatches = originalText.match(this.patterns.email);
    if (emailMatches) summary.emailsRedacted = emailMatches.length;

    const phoneMatches = originalText.match(this.patterns.phone) || [];
    const ukPhoneMatches = originalText.match(this.patterns.ukPhone) || [];
    summary.phonesRedacted = phoneMatches.length + ukPhoneMatches.length;

    const niMatches = originalText.match(this.patterns.niNumber) || [];
    const utrMatches = originalText.match(this.patterns.utr) || [];
    summary.personalIdsRedacted = niMatches.length + utrMatches.length;

    const bankMatches = originalText.match(this.patterns.bankAccount) || [];
    const sortMatches = originalText.match(this.patterns.sortCode) || [];
    const cardMatches = originalText.match(this.patterns.creditCard) || [];
    summary.financialDataRedacted = bankMatches.length + sortMatches.length + cardMatches.length;

    summary.totalRedactions = summary.emailsRedacted + summary.phonesRedacted + 
                             summary.personalIdsRedacted + summary.financialDataRedacted;

    return summary;
  }
}