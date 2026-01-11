import { Test, TestingModule } from '@nestjs/testing';
import { HandlebarsService } from './handlebars.service';

describe('HandlebarsService', () => {
  let service: HandlebarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HandlebarsService],
    }).compile();

    service = module.get<HandlebarsService>(HandlebarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isHandlebarsTemplate', () => {
    it('should detect Handlebars if syntax', () => {
      const template = '{{#if client.isCompany}}Company{{/if}}';
      expect(service.isHandlebarsTemplate(template)).toBe(true);
    });

    it('should detect Handlebars each syntax', () => {
      const template = '{{#each services}}{{this.name}}{{/each}}';
      expect(service.isHandlebarsTemplate(template)).toBe(true);
    });

    it('should not detect legacy syntax as Handlebars', () => {
      const template = '{{if:isCompany}}Company{{endif}}';
      expect(service.isHandlebarsTemplate(template)).toBe(false);
    });

    it('should not detect simple placeholders as Handlebars', () => {
      const template = 'Hello {{clientName}}';
      expect(service.isHandlebarsTemplate(template)).toBe(false);
    });
  });

  describe('compile', () => {
    it('should compile simple template', () => {
      const template = 'Hello {{name}}';
      const data = { name: 'John' };
      const result = service.compile(template, data);
      expect(result).toBe('Hello John');
    });

    it('should handle if conditionals', () => {
      const template = '{{#if isActive}}Active{{else}}Inactive{{/if}}';
      expect(service.compile(template, { isActive: true })).toBe('Active');
      expect(service.compile(template, { isActive: false })).toBe('Inactive');
    });

    it('should handle each loops', () => {
      const template = '{{#each items}}{{this}},{{/each}}';
      const data = { items: ['A', 'B', 'C'] };
      const result = service.compile(template, data);
      expect(result).toBe('A,B,C,');
    });

    it('should use formatDate helper', () => {
      const template = '{{formatDate date "DD/MM/YYYY"}}';
      const data = { date: '2025-11-25' };
      const result = service.compile(template, data);
      expect(result).toBe('25/11/2025');
    });

    it('should use today helper', () => {
      const template = '{{today}}';
      const result = service.compile(template, {});
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should use currency helper', () => {
      const template = '{{currency amount}}';
      const data = { amount: 1234.56 };
      const result = service.compile(template, data);
      expect(result).toBe('£1234.56');
    });

    it('should use calculateAnnualTotal helper', () => {
      const template = '{{calculateAnnualTotal services}}';
      const data = {
        services: [
          { annualized: 1000 },
          { annualized: 2000 },
          { annualized: 500 },
        ],
      };
      const result = service.compile(template, data);
      expect(result).toBe('3500.00');
    });

    it('should use comparison helpers', () => {
      const template = '{{#if (eq status "ACTIVE")}}Yes{{else}}No{{/if}}';
      expect(service.compile(template, { status: 'ACTIVE' })).toBe('Yes');
      expect(service.compile(template, { status: 'INACTIVE' })).toBe('No');
    });

    it('should use logical helpers', () => {
      const template = '{{#if (and isActive isCompany)}}Yes{{else}}No{{/if}}';
      expect(service.compile(template, { isActive: true, isCompany: true })).toBe('Yes');
      expect(service.compile(template, { isActive: true, isCompany: false })).toBe('No');
    });

    it('should use math helpers', () => {
      const template = '{{add a b}}';
      const data = { a: 10, b: 5 };
      const result = service.compile(template, data);
      expect(result).toBe('15');
    });

    it('should use string helpers', () => {
      const template = '{{uppercase name}}';
      const data = { name: 'john' };
      const result = service.compile(template, data);
      expect(result).toBe('JOHN');
    });
  });
});
