import { Test, TestingModule } from '@nestjs/testing';
import { DocumentGeneratorService } from './document-generator.service';
import { HandlebarsService } from './handlebars.service';

describe('DocumentGeneratorService - Handlebars Integration', () => {
  let service: DocumentGeneratorService;
  let handlebarsService: HandlebarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentGeneratorService, HandlebarsService],
    }).compile();

    service = module.get<DocumentGeneratorService>(DocumentGeneratorService);
    handlebarsService = module.get<HandlebarsService>(HandlebarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(handlebarsService).toBeDefined();
  });

  describe('populateTemplate - Handlebars syntax', () => {
    it('should process Handlebars template with conditionals', () => {
      const template = 'Dear {{name}}, {{#if isCompany}}Company{{else}}Individual{{/if}}';
      const values = { name: 'John', isCompany: true };
      
      const result = service.populateTemplate(template, values);
      
      expect(result).toBe('Dear John, Company');
    });

    it('should process Handlebars template with loops', () => {
      const template = '{{#each items}}{{this}},{{/each}}';
      const values = { items: ['A', 'B', 'C'] };
      
      const result = service.populateTemplate(template, values);
      
      expect(result).toBe('A,B,C,');
    });

    it('should use formatDate helper', () => {
      // Need to use Handlebars syntax to trigger Handlebars engine
      const template = '{{#if date}}{{formatDate date \'DD/MM/YYYY\'}}{{/if}}';
      const values = { date: '2025-11-25' };
      
      const result = service.populateTemplate(template, values);
      
      expect(result).toBe('25/11/2025');
    });

    it('should use calculateAnnualTotal helper', () => {
      // Need to use Handlebars syntax to trigger Handlebars engine
      const template = '{{#if services}}£{{calculateAnnualTotal services}}{{/if}}';
      const values = {
        services: [
          { annualized: 1000 },
          { annualized: 500 },
        ],
      };
      
      const result = service.populateTemplate(template, values);
      
      expect(result).toBe('£1500.00');
    });

    it('should use comparison helpers', () => {
      const template = '{{#if (lt days 7)}}Urgent{{else}}Normal{{/if}}';
      
      const urgentResult = service.populateTemplate(template, { days: 5 });
      expect(urgentResult).toBe('Urgent');
      
      const normalResult = service.populateTemplate(template, { days: 10 });
      expect(normalResult).toBe('Normal');
    });
  });

  describe('populateTemplate - Legacy syntax', () => {
    it('should process legacy conditional syntax', () => {
      const template = 'Dear {{name}}, {{if:isCompany}}Company{{endif}}';
      const values = { name: 'John', isCompany: true };
      
      const result = service.populateTemplate(template, values);
      
      expect(result).toBe('Dear John, Company');
    });

    it('should process legacy list syntax', () => {
      const template = '{{list:items}}{{item}},{{endlist}}';
      const values = { items: ['A', 'B', 'C'] };
      
      const result = service.populateTemplate(template, values);
      
      // Legacy list processing adds newlines between items
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
    });
  });

  describe('populateTemplate - Simple placeholders', () => {
    it('should work with both engines for simple placeholders', () => {
      const template = 'Hello {{name}}, welcome to {{company}}';
      const values = { name: 'John', company: 'MDJ' };
      
      const result = service.populateTemplate(template, values);
      
      expect(result).toBe('Hello John, welcome to MDJ');
    });
  });

  describe('Template detection', () => {
    it('should detect Handlebars syntax', () => {
      const handlebarsTemplate = '{{#if condition}}yes{{/if}}';
      expect(handlebarsService.isHandlebarsTemplate(handlebarsTemplate)).toBe(true);
    });

    it('should detect legacy syntax', () => {
      const legacyTemplate = '{{if:condition}}yes{{endif}}';
      expect(handlebarsService.isHandlebarsTemplate(legacyTemplate)).toBe(false);
    });

    it('should not detect simple placeholders as Handlebars', () => {
      const simpleTemplate = 'Hello {{name}}';
      expect(handlebarsService.isHandlebarsTemplate(simpleTemplate)).toBe(false);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle client onboarding template pattern', () => {
      const template = `
Dear {{clientName}},

{{#if isCompany}}
Company Number: {{companyNumber}}
{{/if}}

Services:
{{#each services}}
- {{this.kind}}: £{{this.fee}}
{{/each}}

Total: £{{calculateAnnualTotal services}}
      `.trim();

      const values = {
        clientName: 'ABC Ltd',
        isCompany: true,
        companyNumber: '12345678',
        services: [
          { kind: 'Accounts', fee: '1000', annualized: 1000 },
          { kind: 'VAT', fee: '400', annualized: 400 },
        ],
      };

      const result = service.populateTemplate(template, values);

      expect(result).toContain('Dear ABC Ltd');
      expect(result).toContain('Company Number: 12345678');
      expect(result).toContain('Accounts: £1000');
      expect(result).toContain('VAT: £400');
      expect(result).toContain('Total: £1400.00');
    });

    it('should handle deadline reminder pattern', () => {
      const template = `
{{#if (lt daysRemaining 7)}}
⚠️ URGENT - {{daysRemaining}} days remaining
{{else}}
📅 Due: {{formatDate dueDate 'DD/MM/YYYY'}}
{{/if}}
      `.trim();

      const urgentValues = { daysRemaining: 5, dueDate: '2025-12-01' };
      const urgentResult = service.populateTemplate(template, urgentValues);
      expect(urgentResult).toContain('⚠️ URGENT - 5 days remaining');

      const normalValues = { daysRemaining: 20, dueDate: '2025-12-15' };
      const normalResult = service.populateTemplate(template, normalValues);
      expect(normalResult).toContain('📅 Due: 15/12/2025');
    });
  });
});
