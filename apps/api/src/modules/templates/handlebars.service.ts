import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

/**
 * Handlebars Template Service
 * Provides Handlebars template compilation with custom helpers
 * Requirements: Enhanced template variable system with conditionals, loops, and formatting
 */
@Injectable()
export class HandlebarsService {
  private readonly logger = new Logger(HandlebarsService.name);
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Compile and render a Handlebars template
   */
  compile(templateContent: string, data: Record<string, any>): string {
    try {
      const template = this.handlebars.compile(templateContent);
      return template(data);
    } catch (error) {
      this.logger.error('Failed to compile Handlebars template:', error);
      throw error;
    }
  }

  /**
   * Check if content uses Handlebars syntax
   */
  isHandlebarsTemplate(content: string): boolean {
    // Check for Handlebars-specific syntax
    const handlebarsPatterns = [
      /\{\{#if\s+/,
      /\{\{#each\s+/,
      /\{\{#unless\s+/,
      /\{\{#with\s+/,
      /\{\{\/if\}\}/,
      /\{\{\/each\}\}/,
      /\{\{else\}\}/,
    ];

    return handlebarsPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Date formatting helper
    this.handlebars.registerHelper('formatDate', (date: any, format: string) => {
      if (!date) return '';
      
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        // Simple date formatting
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthNamesShort = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        if (format === 'DD/MM/YYYY') {
          return `${day}/${month}/${year}`;
        } else if (format === 'DD MMMM YYYY') {
          return `${day} ${monthNames[d.getMonth()]} ${year}`;
        } else if (format === 'DD MMM YYYY') {
          return `${day} ${monthNamesShort[d.getMonth()]} ${year}`;
        } else if (format === 'YYYY-MM-DD') {
          return `${year}-${month}-${day}`;
        } else if (format === 'YYYY') {
          return `${year}`;
        }
        
        // Default format
        return `${day}/${month}/${year}`;
      } catch (error) {
        this.logger.warn(`Failed to format date: ${date}`, error);
        return '';
      }
    });

    // Calculate annual total from services
    this.handlebars.registerHelper('calculateAnnualTotal', (services: any[]) => {
      if (!Array.isArray(services)) return '0.00';
      
      const total = services.reduce((sum, service) => {
        const annualized = parseFloat(service.annualized || service.fee || 0);
        return sum + annualized;
      }, 0);
      
      return total.toFixed(2);
    });

    // Days until due date
    this.handlebars.registerHelper('daysUntilDue', (dueDate: any) => {
      if (!dueDate) return 0;
      
      try {
        const due = new Date(dueDate);
        const now = new Date();
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      } catch (error) {
        return 0;
      }
    });

    // Currency formatting
    const formatCurrency = (amount: any) => {
      if (amount === null || amount === undefined || amount === '') return '£0';

      const normalized = typeof amount === 'string' ? amount.replace(/,/g, '').trim() : amount;
      const num = typeof normalized === 'number' ? normalized : parseFloat(normalized);
      if (isNaN(num)) return String(amount).replace(/\.00\b/g, '');

      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(num));
    };

    this.handlebars.registerHelper('currency', formatCurrency);
    this.handlebars.registerHelper('formatCurrency', formatCurrency);

    // Comparison helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    this.handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('gte', (a: any, b: any) => a >= b);

    // Logical helpers
    this.handlebars.registerHelper('and', (...args: any[]) => {
      // Remove the options object (last argument)
      const values = args.slice(0, -1);
      return values.every(Boolean);
    });

    this.handlebars.registerHelper('or', (...args: any[]) => {
      // Remove the options object (last argument)
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });

    this.handlebars.registerHelper('not', (value: any) => !value);

    // Today's date
    this.handlebars.registerHelper('today', () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      return `${day}/${month}/${year}`;
    });

    // Uppercase/lowercase helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    // Capitalize first letter
    this.handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Default value helper
    this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    });

    // Math helpers
    this.handlebars.registerHelper('add', (a: number, b: number) => {
      return (parseFloat(String(a)) || 0) + (parseFloat(String(b)) || 0);
    });

    this.handlebars.registerHelper('subtract', (a: number, b: number) => {
      return (parseFloat(String(a)) || 0) - (parseFloat(String(b)) || 0);
    });

    this.handlebars.registerHelper('multiply', (a: number, b: number) => {
      return (parseFloat(String(a)) || 0) * (parseFloat(String(b)) || 0);
    });

    this.handlebars.registerHelper('divide', (a: number, b: number) => {
      const divisor = parseFloat(String(b)) || 1;
      return (parseFloat(String(a)) || 0) / divisor;
    });

    // Array length helper
    this.handlebars.registerHelper('length', (array: any[]) => {
      return Array.isArray(array) ? array.length : 0;
    });

    // Join array helper
    this.handlebars.registerHelper('join', (array: any[], separator: string) => {
      if (!Array.isArray(array)) return '';
      return array.join(separator || ', ');
    });

    this.logger.log('Handlebars helpers registered successfully');
  }
}
