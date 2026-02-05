import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  GenerateLetterDto,
  TemplatePlaceholder,
  PlaceholderType,
} from './interfaces';

/**
 * Service for validating and sanitizing template-related inputs
 * Requirements: 3.3, 2.4
 * Security: Prevents template injection, validates all user inputs, sanitizes placeholder values
 */
@Injectable()
export class TemplateValidationService {
  private readonly logger = new Logger(TemplateValidationService.name);

  // Dangerous patterns that could indicate injection attempts
  private readonly dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
  ];

  /**
   * Validate CreateTemplateDto
   * Requirements: 6.4
   */
  validateCreateTemplate(dto: CreateTemplateDto): void {
    const errors: string[] = [];

    // Validate required fields
    if (!dto.name || dto.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!dto.description || dto.description.trim().length === 0) {
      errors.push('Template description is required');
    }

    if (!dto.category) {
      errors.push('Template category is required');
    }

    if (!dto.type) {
      errors.push('Template type is required');
    }

    if (!dto.content || dto.content.trim().length === 0) {
      errors.push('Template content is required');
    }

    // Validate name length
    if (dto.name && dto.name.length > 200) {
      errors.push('Template name must not exceed 200 characters');
    }

    // Validate description length
    if (dto.description && dto.description.length > 1000) {
      errors.push('Template description must not exceed 1000 characters');
    }

    // Sanitize text fields
    if (dto.name) {
      dto.name = this.sanitizeText(dto.name);
    }

    if (dto.description) {
      dto.description = this.sanitizeText(dto.description);
    }

    // Validate placeholders if provided
    if (dto.placeholders) {
      this.validatePlaceholders(dto.placeholders, errors);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Template validation failed',
        errors,
      });
    }
  }

  /**
   * Validate UpdateTemplateDto
   * Requirements: 6.4
   */
  validateUpdateTemplate(dto: UpdateTemplateDto): void {
    const errors: string[] = [];

    // Validate name if provided
    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        errors.push('Template name cannot be empty');
      }
      if (dto.name.length > 200) {
        errors.push('Template name must not exceed 200 characters');
      }
      dto.name = this.sanitizeText(dto.name);
    }

    // Validate description if provided
    if (dto.description !== undefined) {
      if (dto.description.trim().length === 0) {
        errors.push('Template description cannot be empty');
      }
      if (dto.description.length > 1000) {
        errors.push('Template description must not exceed 1000 characters');
      }
      dto.description = this.sanitizeText(dto.description);
    }

    // Validate placeholders if provided
    if (dto.placeholders) {
      this.validatePlaceholders(dto.placeholders, errors);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Template validation failed',
        errors,
      });
    }
  }

  /**
   * Validate GenerateLetterDto
   * Requirements: 3.3, 2.4
   */
  validateGenerateLetter(dto: GenerateLetterDto): void {
    const errors: string[] = [];

    // Validate required fields
    if (!dto.templateId || dto.templateId.trim().length === 0) {
      errors.push('Template ID is required');
    }

    if (!dto.clientId || dto.clientId.trim().length === 0) {
      errors.push('Client ID is required');
    }

    // Validate output formats if provided
    if (dto.outputFormats) {
      if (!Array.isArray(dto.outputFormats)) {
        errors.push('Output formats must be an array');
      } else {
        for (const format of dto.outputFormats) {
          if (format !== 'PDF' && format !== 'DOCX') {
            errors.push(`Invalid output format: ${format}. Must be PDF or DOCX`);
          }
        }
      }
    }

    // Sanitize placeholder values
    if (dto.placeholderValues) {
      dto.placeholderValues = this.sanitizePlaceholderValues(dto.placeholderValues);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Letter generation validation failed',
        errors,
      });
    }
  }

  /**
   * Validate placeholder definitions
   */
  private validatePlaceholders(placeholders: TemplatePlaceholder[], errors: string[]): void {
    const keys = new Set<string>();

    for (const placeholder of placeholders) {
      // Check for duplicate keys
      if (keys.has(placeholder.key)) {
        errors.push(`Duplicate placeholder key: ${placeholder.key}`);
      }
      keys.add(placeholder.key);

      // Validate key format (alphanumeric and underscores only)
      if (!/^[a-zA-Z0-9_.]+$/.test(placeholder.key)) {
        errors.push(`Invalid placeholder key: ${placeholder.key}. Must contain only letters, numbers, underscores, and dots`);
      }

      // Validate label
      if (!placeholder.label || placeholder.label.trim().length === 0) {
        errors.push(`Placeholder ${placeholder.key} must have a label`);
      }

      // Validate type
      if (!Object.values(PlaceholderType).includes(placeholder.type)) {
        errors.push(`Invalid placeholder type for ${placeholder.key}: ${placeholder.type}`);
      }

      // Validate validation rules if present
      if (placeholder.validation) {
        if (placeholder.validation.minLength !== undefined && placeholder.validation.minLength < 0) {
          errors.push(`Invalid minLength for ${placeholder.key}: must be non-negative`);
        }

        if (placeholder.validation.maxLength !== undefined && placeholder.validation.maxLength < 0) {
          errors.push(`Invalid maxLength for ${placeholder.key}: must be non-negative`);
        }

        if (
          placeholder.validation.minLength !== undefined &&
          placeholder.validation.maxLength !== undefined &&
          placeholder.validation.minLength > placeholder.validation.maxLength
        ) {
          errors.push(`Invalid length constraints for ${placeholder.key}: minLength cannot exceed maxLength`);
        }

        if (placeholder.validation.min !== undefined && placeholder.validation.max !== undefined) {
          if (placeholder.validation.min > placeholder.validation.max) {
            errors.push(`Invalid numeric constraints for ${placeholder.key}: min cannot exceed max`);
          }
        }

        // Validate regex pattern if present
        if (placeholder.validation.pattern) {
          try {
            new RegExp(placeholder.validation.pattern);
          } catch (e) {
            errors.push(`Invalid regex pattern for ${placeholder.key}: ${e.message}`);
          }
        }
      }
    }
  }

  /**
   * Sanitize text to prevent XSS and injection attacks
   * Requirements: 3.3
   */
  sanitizeText(text: string): string {
    if (!text) {
      return text;
    }

    let sanitized = text;

    // Remove dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    // Log if sanitization changed the input
    if (sanitized !== text) {
      this.logger.warn('Potentially dangerous content was sanitized from input');
    }

    return sanitized;
  }

  /**
   * Sanitize placeholder values to prevent injection
   * Requirements: 3.3, 2.4
   */
  sanitizePlaceholderValues(values: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(values)) {
      // Validate key format
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        this.logger.warn(`Skipping invalid placeholder key: ${key}`);
        continue;
      }

      // Sanitize value based on type
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (typeof value === 'object') {
        // For objects (like addresses), sanitize string properties
        sanitized[key] = this.sanitizeObject(value);
      } else {
        // Convert other types to string and sanitize
        sanitized[key] = this.sanitizeText(String(value));
      }
    }

    return sanitized;
  }

  /**
   * Sanitize object properties recursively
   */
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.sanitizeText(obj);
      }
      return obj;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate that a template content doesn't contain malicious code
   * Requirements: 6.3, 6.4
   */
  validateTemplateContent(content: string): void {
    const errors: string[] = [];

    // Check for dangerous patterns in template content
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(content)) {
        errors.push('Template content contains potentially dangerous code');
        break;
      }
    }

    // Check for excessive placeholder nesting (potential DoS)
    const placeholderDepth = this.calculatePlaceholderDepth(content);
    if (placeholderDepth > 5) {
      errors.push('Template contains excessive placeholder nesting (max depth: 5)');
    }

    // Check for excessive template size
    if (content.length > 1000000) { // 1MB limit
      errors.push('Template content exceeds maximum size (1MB)');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Template content validation failed',
        errors,
      });
    }
  }

  /**
   * Validate file format
   * Requirements: 6.4
   */
  validateFileFormat(fileName: string, allowedFormats: string[]): void {
    const errors: string[] = [];

    if (!fileName || fileName.trim().length === 0) {
      errors.push('File name is required');
    }

    const extension = fileName.split('.').pop()?.toUpperCase();
    if (!extension || !allowedFormats.includes(extension)) {
      errors.push(`Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`);
    }

    // Check for path traversal attempts
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      errors.push('File name contains invalid characters');
    }

    // Check file name length
    if (fileName.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'File format validation failed',
        errors,
      });
    }
  }

  /**
   * Validate file size
   * Requirements: 6.4
   */
  validateFileSize(size: number, maxSizeBytes: number = 10485760): void {
    // Default max size: 10MB
    const errors: string[] = [];

    if (size <= 0) {
      errors.push('File size must be greater than 0');
    }

    if (size > maxSizeBytes) {
      const maxSizeMB = maxSizeBytes / (1024 * 1024);
      errors.push(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'File size validation failed',
        errors,
      });
    }
  }

  /**
   * Validate template file upload
   * Requirements: 6.4
   */
  validateTemplateUpload(fileName: string, fileSize: number, fileBuffer?: Buffer): void {
    const errors: string[] = [];

    // Validate file name and format
    try {
      this.validateFileFormat(fileName, ['DOCX', 'MD']);
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response = error.getResponse() as any;
        errors.push(...(response.errors || [error.message]));
      }
    }

    // Validate file size
    try {
      this.validateFileSize(fileSize);
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response = error.getResponse() as any;
        errors.push(...(response.errors || [error.message]));
      }
    }

    // Validate file content if buffer provided
    if (fileBuffer) {
      // Check for null bytes (potential binary exploit)
      if (fileBuffer.includes(0x00) && fileName.endsWith('.md')) {
        errors.push('Markdown file contains invalid binary data');
      }

      // Validate that file is not empty
      if (fileBuffer.length === 0) {
        errors.push('File is empty');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Template upload validation failed',
        errors,
      });
    }
  }

  /**
   * Validate placeholder value against its type
   * Requirements: 3.3
   */
  validatePlaceholderValue(key: string, value: any, type: PlaceholderType): void {
    const errors: string[] = [];

    // Skip validation for null/undefined values (handled by required check)
    if (value === null || value === undefined) {
      return;
    }

    switch (type) {
      case PlaceholderType.EMAIL:
        if (typeof value === 'string' && !this.isValidEmail(value)) {
          errors.push(`${key}: Invalid email format`);
        }
        break;

      case PlaceholderType.PHONE:
        if (typeof value === 'string' && !this.isValidPhone(value)) {
          errors.push(`${key}: Invalid phone number format`);
        }
        break;

      case PlaceholderType.DATE:
        if (!this.isValidDate(value)) {
          errors.push(`${key}: Invalid date format`);
        }
        break;

      case PlaceholderType.NUMBER:
      case PlaceholderType.CURRENCY:
        if (!this.isValidNumber(value)) {
          errors.push(`${key}: Invalid number format`);
        }
        break;

      case PlaceholderType.TEXT:
        if (typeof value !== 'string') {
          errors.push(`${key}: Must be a text value`);
        }
        break;
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Placeholder value validation failed',
        errors,
      });
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    const digits = phone.replace(/\D/g, '');
    return phoneRegex.test(phone) && digits.length >= 10;
  }

  /**
   * Validate date
   */
  private isValidDate(value: any): boolean {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * Validate number
   */
  private isValidNumber(value: any): boolean {
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value);
    }
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }

  /**
   * Calculate the maximum nesting depth of placeholders
   */
  private calculatePlaceholderDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    // Simple depth calculation based on nested {{if:...}} blocks
    const ifPattern = /\{\{if:/g;
    const endifPattern = /\{\{endif\}\}/g;

    let match;
    const positions: Array<{ pos: number; type: 'if' | 'endif' }> = [];

    while ((match = ifPattern.exec(content)) !== null) {
      positions.push({ pos: match.index, type: 'if' });
    }

    while ((match = endifPattern.exec(content)) !== null) {
      positions.push({ pos: match.index, type: 'endif' });
    }

    positions.sort((a, b) => a.pos - b.pos);

    for (const { type } of positions) {
      if (type === 'if') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else {
        currentDepth--;
      }
    }

    return maxDepth;
  }
}
