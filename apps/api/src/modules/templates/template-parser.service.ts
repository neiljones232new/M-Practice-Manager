import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TemplateErrorHandlerService } from './template-error-handler.service';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import {
  ParsedTemplate,
  TemplatePlaceholder,
  Template,
  ValidationResult,
  PlaceholderType,
  PlaceholderSource,
} from './interfaces';

interface PlaceholderMatch {
  fullMatch: string;
  key: string;
  type?: string;
  format?: string;
  condition?: string;
  isConditional?: boolean;
  isList?: boolean;
  isEnd?: boolean;
}

@Injectable()
export class TemplateParserService {
  private readonly logger = new Logger(TemplateParserService.name);

  constructor(private readonly errorHandler: TemplateErrorHandlerService) {}

  // Regex patterns for different placeholder types
  private readonly SIMPLE_PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
  private readonly FORMATTED_PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_.]+):([a-zA-Z0-9_]+):([^}]+)\}\}/g;
  private readonly CONDITIONAL_START_REGEX = /\{\{if:([a-zA-Z0-9_.]+)\}\}/g;
  private readonly CONDITIONAL_END_REGEX = /\{\{endif\}\}/g;
  private readonly LIST_START_REGEX = /\{\{list:([a-zA-Z0-9_.]+)\}\}/g;
  private readonly LIST_END_REGEX = /\{\{endlist\}\}/g;
  private readonly ALL_PLACEHOLDERS_REGEX = /\{\{[^}]+\}\}/g;

  /**
   * Parse a template file and extract content and placeholders
   * Supports both DOCX and MD formats
   */
  async parseTemplate(filePath: string, format: 'DOCX' | 'MD'): Promise<ParsedTemplate> {
    try {
      if (!existsSync(filePath)) {
        throw new BadRequestException(`Template file not found: ${filePath}`);
      }

      let content: string;

      if (format === 'MD') {
        // Read markdown file directly
        content = await fs.readFile(filePath, 'utf8');
      } else if (format === 'DOCX') {
        // For DOCX, we'll need a library like mammoth or docxtemplater
        // For now, throw an error indicating DOCX parsing needs additional setup
        this.errorHandler.handleUnsupportedFileFormat('DOCX');
      } else {
        this.errorHandler.handleUnsupportedFileFormat(format);
      }

      // Extract placeholders from content
      const placeholders = this.extractPlaceholders(content);

      return {
        content,
        placeholders,
        metadata: {
          format,
          filePath,
          parsedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to parse template ${filePath}:`, error);
      this.errorHandler.handleTemplateParsingError(filePath, error as Error);
    }
  }

  /**
   * Extract all placeholders from template content
   * Supports simple, formatted, conditional, and list placeholders
   */
  extractPlaceholders(content: string): TemplatePlaceholder[] {
    const placeholderMap = new Map<string, TemplatePlaceholder>();
    
    // Find all placeholder matches
    const matches = this.findAllPlaceholderMatches(content);

    // Process each match and create placeholder metadata
    for (const match of matches) {
      if (match.isEnd) {
        // Skip end tags (endif, endlist)
        continue;
      }

      const placeholder = this.createPlaceholderFromMatch(match);
      
      // Use key as unique identifier, but track if we've seen it before
      if (!placeholderMap.has(placeholder.key)) {
        placeholderMap.set(placeholder.key, placeholder);
      }
    }

    return Array.from(placeholderMap.values());
  }

  /**
   * Validate template structure and placeholder syntax
   */
  validateTemplate(template: Template): ValidationResult {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    try {
      // Validate basic template properties
      if (!template.name || template.name.trim() === '') {
        errors.push({
          field: 'name',
          message: 'Template name is required',
          code: 'REQUIRED_FIELD',
        });
      }

      if (!template.type) {
        errors.push({
          field: 'type',
          message: 'Template type is required',
          code: 'REQUIRED_FIELD',
        });
      }

      if (!template.content || template.content.trim() === '') {
        errors.push({
          field: 'content',
          message: 'Template content is required',
          code: 'REQUIRED_FIELD',
        });
      }

      // Validate placeholders
      if (template.placeholders && template.placeholders.length > 0) {
        template.placeholders.forEach((placeholder, index) => {
          if (!placeholder.key || placeholder.key.trim() === '') {
            errors.push({
              field: `placeholders[${index}].key`,
              message: 'Placeholder key is required',
              code: 'REQUIRED_FIELD',
            });
          }

          if (!placeholder.label || placeholder.label.trim() === '') {
            errors.push({
              field: `placeholders[${index}].label`,
              message: 'Placeholder label is required',
              code: 'REQUIRED_FIELD',
            });
          }

          if (!placeholder.type) {
            errors.push({
              field: `placeholders[${index}].type`,
              message: 'Placeholder type is required',
              code: 'REQUIRED_FIELD',
            });
          }

          // Validate placeholder key format (alphanumeric, underscore, dot)
          if (placeholder.key && !/^[a-zA-Z0-9_.]+$/.test(placeholder.key)) {
            errors.push({
              field: `placeholders[${index}].key`,
              message: 'Placeholder key must contain only letters, numbers, underscores, and dots',
              code: 'INVALID_FORMAT',
            });
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Error validating template:', error);
      return {
        isValid: false,
        errors: [{
          field: 'template',
          message: 'Failed to validate template',
          code: 'VALIDATION_ERROR',
        }],
      };
    }
  }

  /**
   * Get template content by reading the file
   */
  async getTemplateContent(filePath: string): Promise<string> {
    try {
      if (!existsSync(filePath)) {
        throw new BadRequestException(`Template file not found: ${filePath}`);
      }

      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get template content from ${filePath}:`, error);
      this.errorHandler.handleGenericError('reading template file', error as Error, { filePath });
    }
  }

  /**
   * Find all placeholder matches in content
   */
  private findAllPlaceholderMatches(content: string): PlaceholderMatch[] {
    const matches: PlaceholderMatch[] = [];
    const allMatches = content.match(this.ALL_PLACEHOLDERS_REGEX) || [];

    for (const match of allMatches) {
      const parsed = this.parsePlaceholderMatch(match);
      if (parsed) {
        matches.push(parsed);
      }
    }

    return matches;
  }

  /**
   * Parse a single placeholder match to determine its type and properties
   */
  private parsePlaceholderMatch(match: string): PlaceholderMatch | null {
    // Remove {{ and }}
    const inner = match.slice(2, -2).trim();

    // Check for conditional end
    if (inner === 'endif') {
      return {
        fullMatch: match,
        key: 'endif',
        isEnd: true,
        isConditional: true,
      };
    }

    // Check for list end
    if (inner === 'endlist') {
      return {
        fullMatch: match,
        key: 'endlist',
        isEnd: true,
        isList: true,
      };
    }

    // Check for conditional start: {{if:condition}}
    if (inner.startsWith('if:')) {
      const condition = inner.substring(3);
      return {
        fullMatch: match,
        key: condition,
        condition,
        isConditional: true,
      };
    }

    // Check for list start: {{list:key}}
    if (inner.startsWith('list:')) {
      const key = inner.substring(5);
      return {
        fullMatch: match,
        key,
        isList: true,
      };
    }

    // Check for formatted placeholder: {{type:key:format}}
    const parts = inner.split(':');
    if (parts.length === 3) {
      return {
        fullMatch: match,
        type: parts[0],
        key: parts[1],
        format: parts[2],
      };
    }

    // Simple placeholder: {{key}}
    return {
      fullMatch: match,
      key: inner,
    };
  }

  /**
   * Create a TemplatePlaceholder object from a match
   */
  private createPlaceholderFromMatch(match: PlaceholderMatch): TemplatePlaceholder {
    const key = match.key;
    const label = this.generateLabelFromKey(key);

    // Determine placeholder type
    let type: PlaceholderType = PlaceholderType.TEXT;
    let format: string | undefined = match.format;

    if (match.isConditional) {
      type = PlaceholderType.CONDITIONAL;
    } else if (match.isList) {
      type = PlaceholderType.LIST;
    } else if (match.type) {
      // Formatted placeholder - determine type from prefix
      type = this.inferTypeFromPrefix(match.type);
      format = match.format;
    } else {
      // Infer type from key name
      type = this.inferTypeFromKey(key);
    }

    // Determine source from key name
    const source = this.inferSourceFromKey(key);

    // Determine if required (default to false for now)
    const required = false;

    return {
      key,
      label,
      type,
      required,
      format,
      source,
      sourcePath: this.generateSourcePath(key, source),
    };
  }

  /**
   * Generate a human-readable label from a camelCase or snake_case key
   */
  private generateLabelFromKey(key: string): string {
    // Convert camelCase to Title Case
    let label = key.replace(/([A-Z])/g, ' $1').trim();
    
    // Convert snake_case to Title Case
    label = label.replace(/_/g, ' ');
    
    // Capitalize first letter of each word
    label = label.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return label;
  }

  /**
   * Infer placeholder type from type prefix in formatted placeholders
   */
  private inferTypeFromPrefix(prefix: string): PlaceholderType {
    const lowerPrefix = prefix.toLowerCase();

    switch (lowerPrefix) {
      case 'date':
        return PlaceholderType.DATE;
      case 'currency':
      case 'money':
        return PlaceholderType.CURRENCY;
      case 'number':
      case 'num':
        return PlaceholderType.NUMBER;
      case 'email':
        return PlaceholderType.EMAIL;
      case 'phone':
      case 'tel':
        return PlaceholderType.PHONE;
      case 'address':
        return PlaceholderType.ADDRESS;
      case 'list':
        return PlaceholderType.LIST;
      default:
        return PlaceholderType.TEXT;
    }
  }

  /**
   * Infer placeholder type from key name
   */
  private inferTypeFromKey(key: string): PlaceholderType {
    const lowerKey = key.toLowerCase();

    // Date patterns
    if (lowerKey.includes('date') || lowerKey.includes('time') || 
        lowerKey.endsWith('at') || lowerKey.endsWith('on')) {
      return PlaceholderType.DATE;
    }

    // Currency patterns
    if (lowerKey.includes('fee') || lowerKey.includes('price') || 
        lowerKey.includes('cost') || lowerKey.includes('amount') ||
        lowerKey.includes('payment')) {
      return PlaceholderType.CURRENCY;
    }

    // Number patterns
    if (lowerKey.includes('number') || lowerKey.includes('count') || 
        lowerKey.includes('quantity') || lowerKey.includes('qty')) {
      return PlaceholderType.NUMBER;
    }

    // Email patterns
    if (lowerKey.includes('email')) {
      return PlaceholderType.EMAIL;
    }

    // Phone patterns
    if (lowerKey.includes('phone') || lowerKey.includes('mobile') || 
        lowerKey.includes('tel')) {
      return PlaceholderType.PHONE;
    }

    // Address patterns
    if (lowerKey.includes('address') || lowerKey === 'postcode' || 
        lowerKey === 'zipcode') {
      return PlaceholderType.ADDRESS;
    }

    // List patterns
    if (lowerKey.endsWith('s') && !lowerKey.endsWith('ss') && 
        (lowerKey.includes('director') || lowerKey.includes('shareholder') || 
         lowerKey.includes('item') || lowerKey.includes('list'))) {
      return PlaceholderType.LIST;
    }

    // Default to text
    return PlaceholderType.TEXT;
  }

  /**
   * Infer data source from key name
   */
  private inferSourceFromKey(key: string): PlaceholderSource {
    const lowerKey = key.toLowerCase();
    const rootKey = lowerKey.split('.')[0];

    // Client-related keys
    if (rootKey === 'client' || rootKey === 'company' || rootKey === 'profile' ||
        lowerKey.startsWith('client') || lowerKey.startsWith('company') || 
        lowerKey.includes('utr') || lowerKey.includes('vat') ||
        lowerKey.includes('incorporation')) {
      return rootKey === 'profile' ? PlaceholderSource.PROFILE : PlaceholderSource.CLIENT;
    }

    // Service-related keys
    if (rootKey === 'service' || lowerKey.startsWith('service') || lowerKey.includes('engagement') ||
        lowerKey.includes('fee') || lowerKey.includes('due')) {
      return PlaceholderSource.SERVICE;
    }

    // User-related keys
    if (rootKey === 'user' || rootKey === 'advisor' || lowerKey.startsWith('user') || lowerKey.includes('preparedby') ||
        lowerKey.includes('accountant')) {
      return PlaceholderSource.USER;
    }

    // System-related keys
    if (rootKey === 'practice' || lowerKey.startsWith('practice')) {
      return PlaceholderSource.PRACTICE;
    }

    if (rootKey === 'system' || lowerKey.startsWith('current') || lowerKey.startsWith('today')) {
      return PlaceholderSource.SYSTEM;
    }

    // Default to manual entry
    return PlaceholderSource.MANUAL;
  }

  /**
   * Generate source path for data retrieval
   */
  private generateSourcePath(key: string, source: PlaceholderSource): string | undefined {
    if (source === PlaceholderSource.MANUAL) {
      return undefined;
    }

    if (key.includes('.')) {
      return key;
    }

    const lowerKey = key.toLowerCase();

    // Remove source prefix if present
    let cleanKey = key;
    if (lowerKey.startsWith('client')) {
      cleanKey = key.substring(6);
    } else if (lowerKey.startsWith('service')) {
      cleanKey = key.substring(7);
    } else if (lowerKey.startsWith('user')) {
      cleanKey = key.substring(4);
    } else if (lowerKey.startsWith('practice')) {
      cleanKey = key.substring(8);
    } else if (lowerKey.startsWith('company')) {
      cleanKey = key.substring(7);
    } else if (lowerKey.startsWith('system')) {
      cleanKey = key.substring(6);
    }

    // Convert to lowercase first letter
    if (cleanKey.length > 0) {
      cleanKey = cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1);
    }

    // Build source path
    switch (source) {
      case PlaceholderSource.CLIENT:
      case PlaceholderSource.PROFILE:
        return `client.${cleanKey || key}`;
      case PlaceholderSource.SERVICE:
        return `service.${cleanKey || key}`;
      case PlaceholderSource.USER:
        return `user.${cleanKey || key}`;
      case PlaceholderSource.SYSTEM:
        return cleanKey || key;
      case PlaceholderSource.PRACTICE:
        return `practice.${cleanKey || key}`;
      default:
        return undefined;
    }
  }
}
