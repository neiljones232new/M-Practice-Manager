import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StandaloneTaskTemplatesService } from './standalone-task-templates.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { 
  StandaloneTaskTemplate, 
  CreateStandaloneTaskTemplateDto,
  UpdateStandaloneTaskTemplateDto
} from './interfaces/task.interface';

describe('StandaloneTaskTemplatesService', () => {
  let service: StandaloneTaskTemplatesService;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const mockTemplate: StandaloneTaskTemplate = {
    id: 'task_template_1234567890_abc123',
    title: 'Test Template',
    description: 'Test template description',
    category: 'Client Communication',
    priority: 'MEDIUM',
    tags: ['test', 'template'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      searchFiles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandaloneTaskTemplatesService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    // Disable onModuleInit to prevent default template creation during tests
    service = module.get<StandaloneTaskTemplatesService>(StandaloneTaskTemplatesService);
    service.onModuleInit = jest.fn();

    fileStorageService = module.get(FileStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateStandaloneTaskTemplateDto = {
      title: 'New Template',
      description: 'New template description',
      category: 'Billing & Credit Control',
      priority: 'HIGH',
      tags: ['billing', 'invoice'],
    };

    it('should create a template successfully', async () => {
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result).toMatchObject({
        title: createDto.title,
        description: createDto.description,
        category: createDto.category,
        priority: createDto.priority,
        tags: createDto.tags,
      });
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^task_template_\d+_[a-z0-9]+$/);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'task-templates',
        result.id,
        result
      );
    });

    it('should create template with default priority when not provided', async () => {
      const dtoWithoutPriority = {
        title: 'Template Without Priority',
        description: 'Test description',
        category: 'Practice Administration',
      };
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(dtoWithoutPriority);

      expect(result.priority).toBe('MEDIUM');
    });

    it('should create template with empty tags when not provided', async () => {
      const dtoWithoutTags = {
        title: 'Template Without Tags',
        description: 'Test description',
        category: 'Email & Correspondence',
        priority: 'LOW' as const,
      };
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(dtoWithoutTags);

      expect(result.tags).toEqual([]);
    });

    it('should set createdAt and updatedAt to the same time on creation', async () => {
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.createdAt).toEqual(result.updatedAt);
    });
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      const mockTemplates = [
        mockTemplate,
        { ...mockTemplate, id: 'template_2', title: 'Another Template' },
      ];
      fileStorageService.searchFiles.mockResolvedValue(mockTemplates);

      const result = await service.findAll();

      expect(result).toEqual(mockTemplates);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith(
        'task-templates',
        expect.any(Function)
      );
    });

    it('should return empty array when no templates exist', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByCategory', () => {
    it('should return templates filtered by category', async () => {
      const category = 'Client Communication';
      const mockTemplates = [
        { ...mockTemplate, category },
        { ...mockTemplate, id: 'template_2', category },
      ];
      fileStorageService.searchFiles.mockResolvedValue(mockTemplates);

      const result = await service.findByCategory(category);

      expect(result).toEqual(mockTemplates);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith(
        'task-templates',
        expect.any(Function)
      );
    });

    it('should return empty array when no templates match category', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.findByCategory('Nonexistent Category');

      expect(result).toEqual([]);
    });

    it('should filter correctly by different categories', async () => {
      const billingTemplate = { ...mockTemplate, category: 'Billing & Credit Control' };
      fileStorageService.searchFiles.mockResolvedValue([billingTemplate]);

      const result = await service.findByCategory('Billing & Credit Control');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Billing & Credit Control');
    });
  });

  describe('findOne', () => {
    it('should return a template by ID', async () => {
      fileStorageService.readJson.mockResolvedValue(mockTemplate);

      const result = await service.findOne(mockTemplate.id);

      expect(result).toEqual(mockTemplate);
      expect(fileStorageService.readJson).toHaveBeenCalledWith(
        'task-templates',
        mockTemplate.id
      );
    });

    it('should return null when template does not exist', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('File not found'));

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should handle read errors gracefully', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('Read error'));

      const result = await service.findOne('error-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateStandaloneTaskTemplateDto = {
      title: 'Updated Template',
      priority: 'URGENT',
      tags: ['updated', 'test'],
    };

    it('should update a template successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockTemplate);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update(mockTemplate.id, updateDto);

      expect(result).toMatchObject({
        ...mockTemplate,
        ...updateDto,
        updatedAt: expect.any(Date),
      });
      expect(result.id).toBe(mockTemplate.id);
      expect(result.createdAt).toEqual(mockTemplate.createdAt);
      expect(result.updatedAt).not.toEqual(mockTemplate.updatedAt);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'task-templates',
        mockTemplate.id,
        result
      );
    });

    it('should throw NotFoundException when template does not exist', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent-id', updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should preserve ID when updating', async () => {
      const updateWithId = { ...updateDto, id: 'different-id' } as any;
      fileStorageService.readJson.mockResolvedValue(mockTemplate);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update(mockTemplate.id, updateWithId);

      expect(result.id).toBe(mockTemplate.id);
    });

    it('should preserve createdAt when updating', async () => {
      fileStorageService.readJson.mockResolvedValue(mockTemplate);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update(mockTemplate.id, updateDto);

      expect(result.createdAt).toEqual(mockTemplate.createdAt);
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { title: 'Partially Updated' };
      fileStorageService.readJson.mockResolvedValue(mockTemplate);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update(mockTemplate.id, partialUpdate);

      expect(result.title).toBe('Partially Updated');
      expect(result.description).toBe(mockTemplate.description);
      expect(result.category).toBe(mockTemplate.category);
      expect(result.priority).toBe(mockTemplate.priority);
      expect(result.tags).toEqual(mockTemplate.tags);
    });
  });

  describe('delete', () => {
    it('should delete a template successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockTemplate);
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      const result = await service.delete(mockTemplate.id);

      expect(result).toBe(true);
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith(
        'task-templates',
        mockTemplate.id
      );
    });

    it('should return false when template does not exist', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('Not found'));

      const result = await service.delete('nonexistent-id');

      expect(result).toBe(false);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockTemplate);
      fileStorageService.deleteJson.mockRejectedValue(new Error('Delete error'));

      await expect(service.delete(mockTemplate.id)).rejects.toThrow('Delete error');
    });
  });

  describe('initializeDefaultTemplates', () => {
    beforeEach(() => {
      // Re-enable onModuleInit for these tests
      service.onModuleInit = StandaloneTaskTemplatesService.prototype.onModuleInit;
    });

    it('should create default templates on initialization', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      // Should have created 40+ default templates
      expect(fileStorageService.writeJson).toHaveBeenCalled();
      const callCount = fileStorageService.writeJson.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(40);
    });

    it('should not create duplicate templates', async () => {
      const existingTemplate = {
        ...mockTemplate,
        title: 'Respond to client email',
      };
      
      // First call returns existing template, subsequent calls return empty
      fileStorageService.searchFiles
        .mockResolvedValueOnce([existingTemplate])
        .mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      // Should not have created the existing template
      const writeCalls = fileStorageService.writeJson.mock.calls;
      const duplicateCall = writeCalls.find(
        call => (call[2] as StandaloneTaskTemplate).title === 'Respond to client email'
      );
      expect(duplicateCall).toBeUndefined();
    });

    it('should create templates across all categories', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      const writeCalls = fileStorageService.writeJson.mock.calls;
      const categories = new Set(writeCalls.map(call => (call[2] as StandaloneTaskTemplate).category));

      expect(categories).toContain('Client Communication');
      expect(categories).toContain('Billing & Credit Control');
      expect(categories).toContain('Practice Administration');
      expect(categories).toContain('Email & Correspondence');
      expect(categories).toContain('Client Job Workflow');
      expect(categories).toContain('Internal Operations');
      expect(categories).toContain('Marketing & Growth');
    });

    it('should create templates with appropriate priorities', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      const writeCalls = fileStorageService.writeJson.mock.calls;
      const templates = writeCalls.map(call => call[2] as StandaloneTaskTemplate);

      // Check that urgent priority is used for critical tasks
      const urgentTemplate = templates.find(t => t.title === 'Chase overdue payment');
      expect(urgentTemplate?.priority).toBe('URGENT');

      // Check that high priority is used for important tasks
      const highTemplate = templates.find(t => t.title === 'Make follow-up call');
      expect(highTemplate?.priority).toBe('HIGH');

      // Check that medium priority is used for routine tasks
      const mediumTemplate = templates.find(t => t.title === 'Respond to client email');
      expect(mediumTemplate?.priority).toBe('MEDIUM');

      // Check that low priority is used for non-urgent tasks
      const lowTemplate = templates.find(t => t.title === 'Update client contact info');
      expect(lowTemplate?.priority).toBe('LOW');
    });

    it('should create templates with relevant tags', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      const writeCalls = fileStorageService.writeJson.mock.calls;
      const templates = writeCalls.map(call => call[2] as StandaloneTaskTemplate);

      // Check that templates have appropriate tags
      const emailTemplate = templates.find(t => t.title === 'Respond to client email');
      expect(emailTemplate?.tags).toContain('email');
      expect(emailTemplate?.tags).toContain('client-contact');

      const billingTemplate = templates.find(t => t.title === 'Issue invoice');
      expect(billingTemplate?.tags).toContain('billing');
      expect(billingTemplate?.tags).toContain('invoice');
    });

    it('should handle errors during template creation gracefully', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      fileStorageService.writeJson
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Write error'))
        .mockResolvedValue(undefined);

      // Should not throw, but continue creating other templates
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should create specific Client Communication templates', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      const writeCalls = fileStorageService.writeJson.mock.calls;
      const templates = writeCalls.map(call => call[2] as StandaloneTaskTemplate);
      const clientCommTemplates = templates.filter(
        t => t.category === 'Client Communication'
      );

      expect(clientCommTemplates.length).toBeGreaterThanOrEqual(7);
      
      const titles = clientCommTemplates.map(t => t.title);
      expect(titles).toContain('Respond to client email');
      expect(titles).toContain('Make follow-up call');
      expect(titles).toContain('Chase missing records');
      expect(titles).toContain('Send deadline reminder');
    });

    it('should create specific Billing & Credit Control templates', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      const writeCalls = fileStorageService.writeJson.mock.calls;
      const templates = writeCalls.map(call => call[2] as StandaloneTaskTemplate);
      const billingTemplates = templates.filter(
        t => t.category === 'Billing & Credit Control'
      );

      expect(billingTemplates.length).toBeGreaterThanOrEqual(6);
      
      const titles = billingTemplates.map(t => t.title);
      expect(titles).toContain('Issue invoice');
      expect(titles).toContain('Chase overdue payment');
      expect(titles).toContain('Record payment received');
    });
  });

  describe('duplicate prevention', () => {
    it('should prevent creating templates with duplicate titles during initialization', async () => {
      // Re-enable onModuleInit for this test
      service.onModuleInit = StandaloneTaskTemplatesService.prototype.onModuleInit;

      const existingTemplates = [
        { ...mockTemplate, title: 'Respond to client email' },
        { ...mockTemplate, title: 'Issue invoice' },
      ];

      let searchCallCount = 0;
      fileStorageService.searchFiles.mockImplementation((category, predicate) => {
        searchCallCount++;
        // Return existing template for specific titles
        const allTemplates = [
          { ...mockTemplate, title: 'Respond to client email' },
          { ...mockTemplate, title: 'Issue invoice' },
        ];
        return Promise.resolve(allTemplates.filter(predicate));
      });
      
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.onModuleInit();

      // Verify that searchFiles was called to check for duplicates
      expect(searchCallCount).toBeGreaterThan(0);

      // Verify that existing templates were not recreated
      const writeCalls = fileStorageService.writeJson.mock.calls;
      const createdTitles = writeCalls.map(call => (call[2] as StandaloneTaskTemplate).title);
      
      // Count how many times each existing template title appears
      const respondEmailCount = createdTitles.filter(
        t => t === 'Respond to client email'
      ).length;
      const issueInvoiceCount = createdTitles.filter(
        t => t === 'Issue invoice'
      ).length;

      // These templates should not be created since they already exist
      expect(respondEmailCount).toBe(0);
      expect(issueInvoiceCount).toBe(0);
    });

    it('should allow creating templates with same title via create method', async () => {
      // This tests that the duplicate prevention only applies during initialization
      const createDto: CreateStandaloneTaskTemplateDto = {
        title: 'Duplicate Title',
        description: 'First template',
        category: 'Client Communication',
      };

      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result1 = await service.create(createDto);
      const result2 = await service.create(createDto);

      expect(result1.id).not.toBe(result2.id);
      expect(fileStorageService.writeJson).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle templates with empty descriptions', async () => {
      const createDto: CreateStandaloneTaskTemplateDto = {
        title: 'Template with empty description',
        description: '',
        category: 'Practice Administration',
      };
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.description).toBe('');
    });

    it('should handle templates with very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const createDto: CreateStandaloneTaskTemplateDto = {
        title: 'Template with long description',
        description: longDescription,
        category: 'Internal Operations',
      };
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.description).toBe(longDescription);
    });

    it('should handle templates with many tags', async () => {
      const manyTags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
      const createDto: CreateStandaloneTaskTemplateDto = {
        title: 'Template with many tags',
        description: 'Test',
        category: 'Marketing & Growth',
        tags: manyTags,
      };
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.tags).toEqual(manyTags);
      expect(result.tags).toHaveLength(20);
    });

    it('should handle special characters in template data', async () => {
      const createDto: CreateStandaloneTaskTemplateDto = {
        title: 'Template with "quotes" and \'apostrophes\'',
        description: 'Special chars: àáâãäåæçèéêë ñòóôõö ùúûü 🚀',
        category: 'Email & Correspondence',
        tags: ['special-chars', 'unicode-✓'],
      };
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.title).toBe(createDto.title);
      expect(result.description).toBe(createDto.description);
      expect(result.tags).toEqual(createDto.tags);
    });
  });
});
