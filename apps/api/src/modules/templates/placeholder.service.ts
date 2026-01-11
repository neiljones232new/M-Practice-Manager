import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { TemplateErrorHandlerService } from './template-error-handler.service';
import {
  TemplatePlaceholder,
  PlaceholderContext,
  ClientPlaceholderData,
  ServicePlaceholderData,
  SystemPlaceholderData,
  ResolvedPlaceholder,
  PlaceholderResolutionResult,
  PlaceholderType,
  PlaceholderSource,
  ValidationResult,
  PlaceholderError,
} from './interfaces';

@Injectable()
export class PlaceholderService {
  private readonly logger = new Logger(PlaceholderService.name);

  constructor(
    private readonly clientsService: ClientsService,
    private readonly servicesService: ServicesService,
    private readonly errorHandler: TemplateErrorHandlerService,
  ) {}

  /**
   * Resolve all placeholders for a given context
   * Requirements: 2.2, 11.2
   */
  async resolvePlaceholders(
    placeholders: TemplatePlaceholder[],
    context: PlaceholderContext,
  ): Promise<PlaceholderResolutionResult> {
    const resolved: Record<string, ResolvedPlaceholder> = {};
    const missingRequired: string[] = [];
    const errors: PlaceholderError[] = [];

    // Fetch data sources
    let clientData: ClientPlaceholderData | null = null;
    let serviceData: ServicePlaceholderData | null = null;
    const systemData = this.getSystemData(context.userId);

    try {
      clientData = await this.getClientData(context.clientId);
    } catch (error) {
      this.logger.error(`Failed to fetch client data: ${error.message}`);
      errors.push({
        key: 'client',
        message: `Failed to fetch client data: ${error.message}`,
        code: 'CLIENT_DATA_ERROR',
      });
    }

    if (context.serviceId) {
      try {
        serviceData = await this.getServiceData(context.serviceId);
      } catch (error) {
        this.logger.error(`Failed to fetch service data: ${error.message}`);
        errors.push({
          key: 'service',
          message: `Failed to fetch service data: ${error.message}`,
          code: 'SERVICE_DATA_ERROR',
        });
      }
    }

    // Resolve each placeholder
    for (const placeholder of placeholders) {
      let value: any = null;
      let source: PlaceholderSource = PlaceholderSource.MANUAL;

      // Check manual values first
      if (context.manualValues && context.manualValues[placeholder.key] !== undefined) {
        value = context.manualValues[placeholder.key];
        source = PlaceholderSource.MANUAL;
      } else {
        // Auto-resolve based on source
        const resolvedValue = this.resolveFromSource(
          placeholder,
          clientData,
          serviceData,
          systemData,
        );
        value = resolvedValue.value;
        source = resolvedValue.source;
      }

      // Check if required field is missing
      if (placeholder.required && (value === null || value === undefined || value === '')) {
        missingRequired.push(placeholder.key);
        errors.push({
          key: placeholder.key,
          message: `Required field '${placeholder.label}' is missing`,
          code: 'REQUIRED_FIELD_MISSING',
        });
      }

      // Validate the value
      if (value !== null && value !== undefined && value !== '') {
        const validation = this.validatePlaceholderValue(value, placeholder);
        if (!validation.isValid) {
          errors.push({
            key: placeholder.key,
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_ERROR',
          });
        }
      }

      // Format the value
      const formattedValue = this.formatValue(value, placeholder.type, placeholder.format);

      resolved[placeholder.key] = {
        key: placeholder.key,
        value,
        formattedValue,
        source,
        type: placeholder.type,
      };
    }

    return {
      placeholders: resolved,
      missingRequired,
      errors,
    };
  }

  /**
   * Get client data for placeholder resolution
   * Requirements: 2.2
   */
  async getClientData(clientId: string): Promise<ClientPlaceholderData> {
    try {
      const client = await this.clientsService.findOne(clientId);
      
      if (!client) {
        this.errorHandler.handleClientNotFound(clientId);
      }

    // Get client with party details for primary contact
    const clientWithParties = await this.clientsService.getClientWithParties(clientId);
    const primaryContact = clientWithParties.partiesDetails?.find(p => p.primaryContact);

    const data: ClientPlaceholderData = {
      // Basic info
      clientName: client.name,
      clientReference: client.ref,
      clientType: client.type,
      
      // Company specific
      companyName: client.type === 'COMPANY' ? client.name : undefined,
      companyNumber: client.registeredNumber,
      incorporationDate: client.incorporationDate,
      registeredOffice: this.formatAddress(client.address),
      
      // Individual specific (if applicable)
      firstName: client.type === 'INDIVIDUAL' ? client.name.split(' ')[0] : undefined,
      lastName: client.type === 'INDIVIDUAL' ? client.name.split(' ').slice(1).join(' ') : undefined,
      
      // Contact information
      email: client.mainEmail || primaryContact?.['email'],
      phone: client.mainPhone || primaryContact?.['phone'],
      mobile: primaryContact?.['phone'],
      
      // Address
      addressLine1: client.address?.line1,
      addressLine2: client.address?.line2,
      city: client.address?.city,
      county: client.address?.county,
      postcode: client.address?.postcode,
      country: client.address?.country,
      
      // Tax information
      utrNumber: client.utrNumber,
      vatNumber: (client as any).vatNumber,
      payeReference: (client as any).payeReference,
      
      // Additional
      accountingPeriodEnd: client.accountsLastMadeUpTo,
      yearEnd: client.accountsLastMadeUpTo 
        ? this.formatDate(client.accountsLastMadeUpTo, 'DD/MM')
        : undefined,
      portfolio: `Portfolio ${client.portfolioCode}`,
    };

    return data;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get client data for ${clientId}:`, error);
      this.errorHandler.handleDataFetchError('client', clientId, error as Error);
    }
  }

  /**
   * Get service data for placeholder resolution
   * Requirements: 11.2
   */
  async getServiceData(serviceId: string): Promise<ServicePlaceholderData> {
    try {
      const service = await this.servicesService.findOne(serviceId);
      
      if (!service) {
        this.errorHandler.handleServiceNotFound(serviceId);
      }

    const data: ServicePlaceholderData = {
      serviceName: service.kind,
      serviceType: service.kind,
      serviceKind: service.kind,
      startDate: service.createdAt,
      endDate: undefined,
      dueDate: service.nextDue,
      status: service.status,
      frequency: service.frequency,
      fee: service.fee,
      currency: 'GBP',
      description: service.description,
    };

    return data;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get service data for ${serviceId}:`, error);
      this.errorHandler.handleDataFetchError('service', serviceId, error as Error);
    }
  }

  /**
   * Get system data for placeholder resolution
   * Requirements: 2.2
   */
  private getSystemData(userId: string): SystemPlaceholderData {
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return {
      currentDate: now,
      currentYear: now.getFullYear(),
      currentMonth: monthNames[now.getMonth()],
      userName: userId, // In a real system, fetch user details
      userEmail: undefined,
      practiceName: 'MDJ Consultants',
      practiceAddress: undefined,
      practicePhone: undefined,
      practiceEmail: undefined,
    };
  }

  /**
   * Resolve a placeholder value from data sources
   */
  private resolveFromSource(
    placeholder: TemplatePlaceholder,
    clientData: ClientPlaceholderData | null,
    serviceData: ServicePlaceholderData | null,
    systemData: SystemPlaceholderData,
  ): { value: any; source: PlaceholderSource } {
    // If source is explicitly defined, use it
    if (placeholder.source) {
      switch (placeholder.source) {
        case PlaceholderSource.CLIENT:
          if (clientData && placeholder.sourcePath) {
            return {
              value: this.getNestedValue(clientData, placeholder.sourcePath),
              source: PlaceholderSource.CLIENT,
            };
          }
          break;
        case PlaceholderSource.SERVICE:
          if (serviceData && placeholder.sourcePath) {
            return {
              value: this.getNestedValue(serviceData, placeholder.sourcePath),
              source: PlaceholderSource.SERVICE,
            };
          }
          break;
        case PlaceholderSource.SYSTEM:
          if (placeholder.sourcePath) {
            return {
              value: this.getNestedValue(systemData, placeholder.sourcePath),
              source: PlaceholderSource.SYSTEM,
            };
          }
          break;
      }
    }

    // Try to auto-resolve based on key name
    const key = placeholder.key.toLowerCase();

    // Try client data first
    if (clientData) {
      const clientValue = clientData[placeholder.key] || clientData[key];
      if (clientValue !== undefined && clientValue !== null) {
        return { value: clientValue, source: PlaceholderSource.CLIENT };
      }
    }

    // Try service data
    if (serviceData) {
      const serviceValue = serviceData[placeholder.key] || serviceData[key];
      if (serviceValue !== undefined && serviceValue !== null) {
        return { value: serviceValue, source: PlaceholderSource.SERVICE };
      }
    }

    // Try system data
    const systemValue = systemData[placeholder.key] || systemData[key];
    if (systemValue !== undefined && systemValue !== null) {
      return { value: systemValue, source: PlaceholderSource.SYSTEM };
    }

    // Use default value if available
    if (placeholder.defaultValue) {
      return { value: placeholder.defaultValue, source: PlaceholderSource.MANUAL };
    }

    return { value: null, source: PlaceholderSource.MANUAL };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Format a value based on its type and format string
   * Requirements: 9.1, 9.2, 9.3
   */
  formatValue(value: any, type: PlaceholderType, format?: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case PlaceholderType.DATE:
        return this.formatDate(value, format || 'DD/MM/YYYY');
      
      case PlaceholderType.CURRENCY:
        return this.formatCurrency(value);
      
      case PlaceholderType.NUMBER:
        return this.formatNumber(value, format);
      
      case PlaceholderType.PHONE:
        return this.formatPhone(value);
      
      case PlaceholderType.EMAIL:
        return String(value).toLowerCase();
      
      case PlaceholderType.ADDRESS:
        return this.formatAddressValue(value);
      
      case PlaceholderType.TEXT:
      default:
        return String(value);
    }
  }

  /**
   * Format date according to UK standards
   * Requirements: 9.1
   */
  private formatDate(value: any, format: string): string {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else {
      return String(value);
    }

    if (isNaN(date.getTime())) {
      return String(value);
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const shortYear = year.toString().slice(-2);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[date.getMonth()];
    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const shortMonthName = shortMonthNames[date.getMonth()];

    // Replace format tokens
    return format
      .replace('YYYY', year.toString())
      .replace('YY', shortYear)
      .replace('MMMM', monthName)
      .replace('MMM', shortMonthName)
      .replace('MM', month)
      .replace('DD', day);
  }

  /**
   * Format currency with £ symbol and no decimal places
   * Requirements: 9.2
   */
  private formatCurrency(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '£0';
    }

    const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
    const num = typeof normalized === 'number' ? normalized : parseFloat(normalized);

    if (isNaN(num)) {
      return String(value).replace(/\.00\b/g, '');
    }

    return `£${Math.abs(num).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  /**
   * Format number with optional decimal places
   */
  private formatNumber(value: any, format?: string): string {
    const num = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(num)) {
      return String(value);
    }

    // Parse format for decimal places (e.g., "0.00" means 2 decimal places)
    if (format) {
      const decimalMatch = format.match(/\.(\d+)/);
      if (decimalMatch) {
        const decimals = decimalMatch[1].length;
        return num.toFixed(decimals);
      }
    }

    return num.toString();
  }

  /**
   * Format phone number
   */
  private formatPhone(value: any): string {
    const phone = String(value).replace(/\D/g, '');
    
    // UK phone number formatting
    if (phone.startsWith('44')) {
      // International format
      return `+${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`;
    } else if (phone.startsWith('0')) {
      // National format
      if (phone.length === 11) {
        return `${phone.slice(0, 5)} ${phone.slice(5)}`;
      }
    }

    return String(value);
  }

  /**
   * Format address as multi-line text
   * Requirements: 9.3
   */
  private formatAddress(address: any): string {
    if (!address) {
      return '';
    }

    const parts: string[] = [];
    
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.city) parts.push(address.city);
    if (address.county) parts.push(address.county);
    if (address.postcode) parts.push(address.postcode);
    if (address.country) parts.push(address.country);

    return parts.join('\n');
  }

  /**
   * Format address value (could be string or object)
   */
  private formatAddressValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'object') {
      return this.formatAddress(value);
    }

    return String(value);
  }

  /**
   * Validate placeholder value
   * Requirements: 3.3, 2.4
   */
  validatePlaceholderValue(value: any, placeholder: TemplatePlaceholder): ValidationResult {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    // Check required
    if (placeholder.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: placeholder.key,
        message: `${placeholder.label} is required`,
        code: 'REQUIRED',
      });
      return { isValid: false, errors };
    }

    // Skip validation if value is empty and not required
    if (!value && !placeholder.required) {
      return { isValid: true, errors: [] };
    }

    // Type-specific validation
    switch (placeholder.type) {
      case PlaceholderType.EMAIL:
        if (!this.isValidEmail(value)) {
          errors.push({
            field: placeholder.key,
            message: `${placeholder.label} must be a valid email address`,
            code: 'INVALID_EMAIL',
          });
        }
        break;

      case PlaceholderType.PHONE:
        if (!this.isValidPhone(value)) {
          errors.push({
            field: placeholder.key,
            message: `${placeholder.label} must be a valid phone number`,
            code: 'INVALID_PHONE',
          });
        }
        break;

      case PlaceholderType.DATE:
        if (!this.isValidDate(value)) {
          errors.push({
            field: placeholder.key,
            message: `${placeholder.label} must be a valid date`,
            code: 'INVALID_DATE',
          });
        }
        break;

      case PlaceholderType.NUMBER:
      case PlaceholderType.CURRENCY:
        if (!this.isValidNumber(value)) {
          errors.push({
            field: placeholder.key,
            message: `${placeholder.label} must be a valid number`,
            code: 'INVALID_NUMBER',
          });
        }
        break;
    }

    // Validation rules
    if (placeholder.validation) {
      const val = placeholder.validation;
      const strValue = String(value);

      // String length validation
      if (val.minLength !== undefined && strValue.length < val.minLength) {
        errors.push({
          field: placeholder.key,
          message: `${placeholder.label} must be at least ${val.minLength} characters`,
          code: 'MIN_LENGTH',
        });
      }

      if (val.maxLength !== undefined && strValue.length > val.maxLength) {
        errors.push({
          field: placeholder.key,
          message: `${placeholder.label} must be at most ${val.maxLength} characters`,
          code: 'MAX_LENGTH',
        });
      }

      // Pattern validation
      if (val.pattern) {
        const regex = new RegExp(val.pattern);
        if (!regex.test(strValue)) {
          errors.push({
            field: placeholder.key,
            message: `${placeholder.label} does not match the required format`,
            code: 'PATTERN_MISMATCH',
          });
        }
      }

      // Numeric range validation
      if (placeholder.type === PlaceholderType.NUMBER || placeholder.type === PlaceholderType.CURRENCY) {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        
        if (!isNaN(numValue)) {
          if (val.min !== undefined && numValue < val.min) {
            errors.push({
              field: placeholder.key,
              message: `${placeholder.label} must be at least ${val.min}`,
              code: 'MIN_VALUE',
            });
          }

          if (val.max !== undefined && numValue > val.max) {
            errors.push({
              field: placeholder.key,
              message: `${placeholder.label} must be at most ${val.max}`,
              code: 'MAX_VALUE',
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(value: any): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value));
  }

  /**
   * Validate phone format
   */
  private isValidPhone(value: any): boolean {
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    const str = String(value);
    return phoneRegex.test(str) && str.replace(/\D/g, '').length >= 10;
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
      return !isNaN(value);
    }
    
    return !isNaN(parseFloat(value));
  }
}
