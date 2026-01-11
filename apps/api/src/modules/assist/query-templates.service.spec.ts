import { Test, TestingModule } from '@nestjs/testing';
import { QueryTemplatesService, QueryTemplate, QuickAction } from './query-templates.service';

describe('QueryTemplatesService', () => {
  let service: QueryTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryTemplatesService],
    }).compile();

    service = module.get<QueryTemplatesService>(QueryTemplatesService);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have predefined templates', () => {
      const templates = service.getTemplates();
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Template Retrieval', () => {
    it('should get all templates', () => {
      const templates = service.getTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(10);
      
      // Check that all templates have required fields
      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.title).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.prompt).toBeDefined();
      });
    });

    it('should get templates by category', () => {
      const clientTemplates = service.getTemplatesByCategory('client');
      const taskTemplates = service.getTemplatesByCategory('task');
      const businessTemplates = service.getTemplatesByCategory('business');

      expect(clientTemplates.length).toBeGreaterThan(0);
      expect(taskTemplates.length).toBeGreaterThan(0);
      expect(businessTemplates.length).toBeGreaterThan(0);

      // Verify all returned templates are of the correct category
      clientTemplates.forEach(template => {
        expect(template.category).toBe('client');
      });

      taskTemplates.forEach(template => {
        expect(template.category).toBe('task');
      });

      businessTemplates.forEach(template => {
        expect(template.category).toBe('business');
      });
    });

    it('should get template by ID', () => {
      const template = service.getTemplateById('client-summary');
      
      expect(template).toBeDefined();
      expect(template?.id).toBe('client-summary');
      expect(template?.category).toBe('client');
      expect(template?.title).toContain('Client Summary');
    });

    it('should return undefined for invalid template ID', () => {
      const template = service.getTemplateById('invalid-template-id');
      expect(template).toBeUndefined();
    });
  });

  describe('Quick Actions', () => {
    it('should get quick actions', () => {
      const quickActions = service.getQuickActions();
      
      expect(Array.isArray(quickActions)).toBe(true);
      expect(quickActions.length).toBeGreaterThan(0);

      // Check that all quick actions have required fields
      quickActions.forEach(action => {
        expect(action.id).toBeDefined();
        expect(action.label).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.template).toBeDefined();
        expect(action.template.id).toBeDefined();
      });
    });

    it('should have valid template references in quick actions', () => {
      const quickActions = service.getQuickActions();
      const allTemplates = service.getTemplates();
      const templateIds = allTemplates.map(t => t.id);

      quickActions.forEach(action => {
        expect(templateIds).toContain(action.template.id);
      });
    });
  });

  describe('Template Search', () => {
    it('should search templates by title', () => {
      const results = service.searchTemplates('client');
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(template => {
        expect(
          template.title.toLowerCase().includes('client') ||
          template.description.toLowerCase().includes('client') ||
          template.examples?.some(ex => ex.toLowerCase().includes('client'))
        ).toBe(true);
      });
    });

    it('should search templates by description', () => {
      const results = service.searchTemplates('deadline');
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(template => {
        expect(
          template.title.toLowerCase().includes('deadline') ||
          template.description.toLowerCase().includes('deadline') ||
          template.examples?.some(ex => ex.toLowerCase().includes('deadline'))
        ).toBe(true);
      });
    });

    it('should search templates by examples', () => {
      const results = service.searchTemplates('vat');
      
      expect(results.length).toBeGreaterThan(0);
      // At least one result should match VAT-related content
      const hasVatMatch = results.some(template =>
        template.title.toLowerCase().includes('vat') ||
        template.description.toLowerCase().includes('vat') ||
        template.examples?.some(ex => ex.toLowerCase().includes('vat'))
      );
      expect(hasVatMatch).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = service.searchTemplates('nonexistentterm12345');
      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const lowerResults = service.searchTemplates('client');
      const upperResults = service.searchTemplates('CLIENT');
      const mixedResults = service.searchTemplates('Client');

      expect(lowerResults.length).toBe(upperResults.length);
      expect(lowerResults.length).toBe(mixedResults.length);
    });
  });

  describe('Prompt Building', () => {
    it('should build prompt from template without context', () => {
      const template: QueryTemplate = {
        id: 'test-template',
        category: 'general',
        title: 'Test Template',
        description: 'A test template',
        prompt: 'This is a test prompt without placeholders.',
      };

      const result = service.buildPromptFromTemplate(template);
      expect(result).toBe('This is a test prompt without placeholders.');
    });

    it('should build prompt from template with context', () => {
      const template: QueryTemplate = {
        id: 'test-template',
        category: 'client',
        title: 'Test Template',
        description: 'A test template',
        prompt: 'Analyze client {clientRef} with {days} days ahead.',
      };

      const context = {
        clientRef: '1A001',
        days: 30,
      };

      const result = service.buildPromptFromTemplate(template, context);
      expect(result).toBe('Analyze client 1A001 with 30 days ahead.');
    });

    it('should handle missing context values', () => {
      const template: QueryTemplate = {
        id: 'test-template',
        category: 'client',
        title: 'Test Template',
        description: 'A test template',
        prompt: 'Analyze client {clientRef} with {days} days ahead.',
      };

      const context = {
        clientRef: '1A001',
        // days is missing
      };

      const result = service.buildPromptFromTemplate(template, context);
      expect(result).toBe('Analyze client 1A001 with {days} days ahead.');
    });

    it('should handle multiple occurrences of same placeholder', () => {
      const template: QueryTemplate = {
        id: 'test-template',
        category: 'client',
        title: 'Test Template',
        description: 'A test template',
        prompt: 'Client {clientRef} analysis for {clientRef} portfolio.',
      };

      const context = {
        clientRef: '1A001',
      };

      const result = service.buildPromptFromTemplate(template, context);
      expect(result).toBe('Client 1A001 analysis for 1A001 portfolio.');
    });
  });

  describe('Contextual Templates', () => {
    it('should return client-specific templates when clientRef is provided', () => {
      const context = { clientRef: '1A001' };
      const templates = service.getContextualTemplates(context);

      expect(templates.length).toBeGreaterThan(0);
      
      // Should include client-summary template
      const clientSummaryTemplate = templates.find(t => t.id === 'client-summary');
      expect(clientSummaryTemplate).toBeDefined();
    });

    it('should return task management templates when overdue tasks exist', () => {
      const context = { hasOverdueTasks: true };
      const templates = service.getContextualTemplates(context);

      expect(templates.length).toBeGreaterThan(0);
      
      // Should include priority-tasks template
      const priorityTasksTemplate = templates.find(t => t.id === 'priority-tasks');
      expect(priorityTasksTemplate).toBeDefined();
    });

    it('should return deadline templates when upcoming deadlines exist', () => {
      const context = { hasUpcomingDeadlines: true };
      const templates = service.getContextualTemplates(context);

      expect(templates.length).toBeGreaterThan(0);
      
      // Should include deadline-check template
      const deadlineCheckTemplate = templates.find(t => t.id === 'deadline-check');
      expect(deadlineCheckTemplate).toBeDefined();
    });

    it('should always include business insights template', () => {
      const context = {};
      const templates = service.getContextualTemplates(context);

      expect(templates.length).toBeGreaterThan(0);
      
      // Should include business-insights template
      const businessInsightsTemplate = templates.find(t => t.id === 'business-insights');
      expect(businessInsightsTemplate).toBeDefined();
    });

    it('should remove duplicates from contextual templates', () => {
      const context = {
        clientRef: '1A001',
        hasOverdueTasks: true,
        hasUpcomingDeadlines: true,
      };
      const templates = service.getContextualTemplates(context);

      // Check for duplicates
      const templateIds = templates.map(t => t.id);
      const uniqueIds = [...new Set(templateIds)];
      
      expect(templateIds.length).toBe(uniqueIds.length);
    });
  });

  describe('Template Categories', () => {
    it('should have all expected categories', () => {
      const templates = service.getTemplates();
      const categories = [...new Set(templates.map(t => t.category))];

      expect(categories).toContain('client');
      expect(categories).toContain('deadline');
      expect(categories).toContain('task');
      expect(categories).toContain('business');
      expect(categories).toContain('compliance');
      expect(categories).toContain('general');
    });

    it('should have templates in each category', () => {
      const expectedCategories = ['client', 'deadline', 'task', 'business', 'compliance', 'general'];
      
      expectedCategories.forEach(category => {
        const categoryTemplates = service.getTemplatesByCategory(category as any);
        expect(categoryTemplates.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Template Validation', () => {
    it('should have valid template structure', () => {
      const templates = service.getTemplates();

      templates.forEach(template => {
        // Required fields
        expect(typeof template.id).toBe('string');
        expect(template.id.length).toBeGreaterThan(0);
        expect(typeof template.category).toBe('string');
        expect(typeof template.title).toBe('string');
        expect(template.title.length).toBeGreaterThan(0);
        expect(typeof template.description).toBe('string');
        expect(template.description.length).toBeGreaterThan(0);
        expect(typeof template.prompt).toBe('string');
        expect(template.prompt.length).toBeGreaterThan(0);

        // Optional fields
        if (template.icon) {
          expect(typeof template.icon).toBe('string');
        }
        if (template.requiresContext !== undefined) {
          expect(typeof template.requiresContext).toBe('boolean');
        }
        if (template.contextFields) {
          expect(Array.isArray(template.contextFields)).toBe(true);
        }
        if (template.examples) {
          expect(Array.isArray(template.examples)).toBe(true);
          template.examples.forEach(example => {
            expect(typeof example).toBe('string');
          });
        }
      });
    });

    it('should have unique template IDs', () => {
      const templates = service.getTemplates();
      const ids = templates.map(t => t.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have context fields when requiresContext is true', () => {
      const templates = service.getTemplates();
      
      templates.forEach(template => {
        if (template.requiresContext) {
          expect(template.contextFields).toBeDefined();
          expect(Array.isArray(template.contextFields)).toBe(true);
          expect(template.contextFields!.length).toBeGreaterThan(0);
        }
      });
    });
  });
});