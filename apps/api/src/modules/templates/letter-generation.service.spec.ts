import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LetterGenerationService } from './letter-generation.service';
import { TemplatesService } from './templates.service';
import { PlaceholderService } from './placeholder.service';
import { TemplateParserService } from './template-parser.service';
import { DocumentGeneratorService } from './document-generator.service';
import { TemplateErrorHandlerService } from './template-error-handler.service';
import { DocumentsService } from '../documents/documents.service';
import { ClientsService } from '../clients/clients.service';
import { ServicesService } from '../services/services.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { AuditService } from '../audit/audit.service';
import {
  Template,
  TemplateCategory,
  PlaceholderType,
  PlaceholderSource,
  GenerateLetterDto,
  LetterStatus,
} from './interfaces';

describe('LetterGenerationService', () => {
  let service: LetterGenerationService;
  let templatesService: jest.Mocked<TemplatesService>;
  let placeholderService: jest.Mocked<PlaceholderService>;
  let documentGeneratorService: jest.Mocked<DocumentGeneratorService>;
  let documentsService: jest.Mocked<DocumentsService>;
  let clientsService: jest.Mocked<ClientsService>;
  let servicesService: jest.Mocked<ServicesService>;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let auditService: jest.Mocked<AuditService>;
  let errorHandler: jest.Mocked<TemplateErrorHandlerService>;

  const mockTemplate: Template = {
    id: 'template-1',
    name: 'Test Letter Template',
    description: 'A test letter template',
    category: TemplateCategory.GENERAL,
    fileName: 'test-letter.md',
    filePath: 'templates/files/test-letter.md',
    fileFormat: 'MD',
    placeholders: [
      {
        key: 'clientName',
        label: 'Client Name',
        type: PlaceholderType.TEXT,
        required: true,
        source: PlaceholderSource.CLIENT,
      },
      {
        key: 'currentDate',
        label: 'Current Date',
        type: PlaceholderType.DATE,
        required: true,
        source: PlaceholderSource.SYSTEM,
      },
    ],
    version: 1,
    isActive: true,
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClient = {
    id: 'client-1',
    name: 'Test Client Ltd',
    ref: 'TC001',
    type: 'COMPANY' as const,
    portfolioCode: 1,
    status: 'ACTIVE' as const,
    mainEmail: 'test@client.com',
    mainPhone: '01234567890',
    address: {
      line1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'UK',
    },
    parties: [],
    services: [],
    tasks: [],
    documents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    id: 'service-1',
    clientId: 'client-1',
    kind: 'Annual Accounts',
    status: 'ACTIVE',
    frequency: 'ANNUAL',
    fee: 1500,
    annualized: 1500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument = {
    success: true,
    document: {
      id: 'doc-1',
      filename: 'test-letter.pdf',
      originalName: 'test-letter.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      category: 'REPORTS' as const,
      clientId: 'client-1',
      uploadedById: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const mockTemplatesService = {
      getTemplate: jest.fn(),
      getTemplateContent: jest.fn(),
    };

    const mockPlaceholderService = {
      resolvePlaceholders: jest.fn(),
    };

    const mockDocumentGeneratorService = {
      populateTemplate: jest.fn(),
      generatePDF: jest.fn(),
      generateDOCX: jest.fn(),
    };

    const mockDocumentsService = {
      uploadDocument: jest.fn(),
      getDocumentFile: jest.fn(),
    };

    const mockClientsService = {
      findOne: jest.fn(),
      getClientWithParties: jest.fn(),
    };

    const mockServicesService = {
      findOne: jest.fn(),
    };

    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      searchFiles: jest.fn(),
    };

    const mockAuditService = {
      logEvent: jest.fn(),
    };

    const mockErrorHandler = {
      handleTemplateInactive: jest.fn(),
      handleMissingRequiredFields: jest.fn(),
      handleValidationErrors: jest.fn(),
      handleClientNotFound: jest.fn(),
      handleServiceNotFound: jest.fn(),
      handleDocumentGenerationError: jest.fn(),
      handleLetterNotFound: jest.fn(),
      handleGenericError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LetterGenerationService,
        { provide: TemplatesService, useValue: mockTemplatesService },
        { provide: PlaceholderService, useValue: mockPlaceholderService },
        { provide: TemplateParserService, useValue: {} },
        { provide: DocumentGeneratorService, useValue: mockDocumentGeneratorService },
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ServicesService, useValue: mockServicesService },
        { provide: FileStorageService, useValue: mockFileStorageService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: TemplateErrorHandlerService, useValue: mockErrorHandler },
      ],
    }).compile();

    service = module.get<LetterGenerationService>(LetterGenerationService);
    templatesService = module.get(TemplatesService);
    placeholderService = module.get(PlaceholderService);
    documentGeneratorService = module.get(DocumentGeneratorService);
    documentsService = module.get(DocumentsService);
    clientsService = module.get(ClientsService);
    servicesService = module.get(ServicesService);
    fileStorageService = module.get(FileStorageService);
    auditService = module.get(AuditService);
    errorHandler = module.get(TemplateErrorHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateLetter - Single Letter Generation', () => {
    const generateDto: GenerateLetterDto = {
      templateId: 'template-1',
      clientId: 'client-1',
      outputFormats: ['PDF'],
      autoSave: true,
    };

    beforeEach(() => {
      templatesService.getTemplate.mockResolvedValue(mockTemplate);
      templatesService.getTemplateContent.mockResolvedValue('Dear {{clientName}},\n\nDate: {{currentDate}}');
      placeholderService.resolvePlaceholders.mockResolvedValue({
        placeholders: {
          clientName: {
            key: 'clientName',
            value: 'Test Client Ltd',
            formattedValue: 'Test Client Ltd',
            source: PlaceholderSource.CLIENT,
            type: PlaceholderType.TEXT,
          },
          currentDate: {
            key: 'currentDate',
            value: new Date('2025-11-12'),
            formattedValue: '12/11/2025',
            source: PlaceholderSource.SYSTEM,
            type: PlaceholderType.DATE,
          },
        },
        missingRequired: [],
        errors: [],
      });
      documentGeneratorService.populateTemplate.mockReturnValue('Dear Test Client Ltd,\n\nDate: 12/11/2025');
      documentGeneratorService.generatePDF.mockResolvedValue(Buffer.from('PDF content'));
      clientsService.findOne.mockResolvedValue(mockClient as any);
      clientsService.getClientWithParties.mockResolvedValue({ ...mockClient, partiesDetails: [] } as any);
      documentsService.uploadDocument.mockResolvedValue(mockDocument as any);
      fileStorageService.writeJson.mockResolvedValue(undefined);
      auditService.logEvent.mockResolvedValue(undefined);
    });

    it('should generate a letter successfully', async () => {
      const result = await service.generateLetter(generateDto, 'test-user');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.templateId).toBe('template-1');
      expect(result.clientId).toBe('client-1');
      expect(result.clientName).toBe('Test Client Ltd');
      expect(result.status).toBe(LetterStatus.GENERATED);
      expect(result.generatedBy).toBe('test-user');
      expect(result.downloadCount).toBe(0);
    });

    it('should retrieve template and content', async () => {
      await service.generateLetter(generateDto, 'test-user');

      expect(templatesService.getTemplate).toHaveBeenCalledWith('template-1');
      expect(templatesService.getTemplateContent).toHaveBeenCalledWith('template-1');
    });

    it('should resolve placeholders with correct context', async () => {
      await service.generateLetter(generateDto, 'test-user');

      expect(placeholderService.resolvePlaceholders).toHaveBeenCalledWith(
        mockTemplate.placeholders,
        expect.objectContaining({
          clientId: 'client-1',
          userId: 'test-user',
        })
      );
    });

    it('should populate template with resolved values', async () => {
      await service.generateLetter(generateDto, 'test-user');

      expect(documentGeneratorService.populateTemplate).toHaveBeenCalledWith(
        'Dear {{clientName}},\n\nDate: {{currentDate}}',
        expect.objectContaining({
          clientName: 'Test Client Ltd',
          currentDate: '12/11/2025',
        })
      );
    });

    it('should generate PDF document', async () => {
      await service.generateLetter(generateDto, 'test-user');

      expect(documentGeneratorService.generatePDF).toHaveBeenCalledWith(
        'Dear Test Client Ltd,\n\nDate: 12/11/2025',
        mockTemplate
      );
    });

    it('should save document when autoSave is true', async () => {
      await service.generateLetter(generateDto, 'test-user');

      expect(documentsService.uploadDocument).toHaveBeenCalled();
    });

    it('should not save document when autoSave is false', async () => {
      const dtoWithoutSave = { ...generateDto, autoSave: false };
      
      await service.generateLetter(dtoWithoutSave, 'test-user');

      expect(documentsService.uploadDocument).not.toHaveBeenCalled();
    });

    it('should generate both PDF and DOCX when requested', async () => {
      const dtoWithBothFormats = { ...generateDto, outputFormats: ['PDF', 'DOCX'] as ('PDF' | 'DOCX')[] };
      documentGeneratorService.generateDOCX.mockResolvedValue(Buffer.from('DOCX content'));

      await service.generateLetter(dtoWithBothFormats, 'test-user');

      expect(documentGeneratorService.generatePDF).toHaveBeenCalled();
      expect(documentGeneratorService.generateDOCX).toHaveBeenCalled();
    });

    it('should create audit log entry', async () => {
      await service.generateLetter(generateDto, 'test-user');

      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'test-user',
          action: 'GENERATE_LETTER',
          entity: 'LETTER',
        })
      );
    });

    it('should include service data when serviceId is provided', async () => {
      const dtoWithService = { ...generateDto, serviceId: 'service-1' };
      servicesService.findOne.mockResolvedValue(mockService as any);

      const result = await service.generateLetter(dtoWithService, 'test-user');

      expect(servicesService.findOne).toHaveBeenCalledWith('service-1');
      expect(result.serviceId).toBe('service-1');
      expect(result.serviceName).toBe('Annual Accounts');
    });
  });

  describe('generateLetter - Error Scenarios', () => {
    const generateDto: GenerateLetterDto = {
      templateId: 'template-1',
      clientId: 'client-1',
      outputFormats: ['PDF'],
    };

    it('should handle inactive template', async () => {
      const inactiveTemplate = { ...mockTemplate, isActive: false };
      templatesService.getTemplate.mockResolvedValue(inactiveTemplate);
      errorHandler.handleTemplateInactive.mockImplementation(() => {
        throw new BadRequestException('Template is inactive');
      });

      await expect(service.generateLetter(generateDto, 'test-user')).rejects.toThrow(BadRequestException);
      expect(errorHandler.handleTemplateInactive).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      templatesService.getTemplate.mockResolvedValue(mockTemplate);
      templatesService.getTemplateContent.mockResolvedValue('Dear {{clientName}}');
      placeholderService.resolvePlaceholders.mockResolvedValue({
        placeholders: {},
        missingRequired: ['clientName'],
        errors: [],
      });
      errorHandler.handleMissingRequiredFields.mockImplementation(() => {
        throw new BadRequestException('Missing required fields');
      });

      await expect(service.generateLetter(generateDto, 'test-user')).rejects.toThrow(BadRequestException);
      expect(errorHandler.handleMissingRequiredFields).toHaveBeenCalledWith(['clientName']);
    });

    it('should handle validation errors', async () => {
      templatesService.getTemplate.mockResolvedValue(mockTemplate);
      templatesService.getTemplateContent.mockResolvedValue('Dear {{clientName}}');
      placeholderService.resolvePlaceholders.mockResolvedValue({
        placeholders: {},
        missingRequired: [],
        errors: [
          {
            key: 'email',
            message: 'Invalid email format',
            code: 'INVALID_EMAIL',
          },
        ],
      });
      errorHandler.handleValidationErrors.mockImplementation(() => {
        throw new BadRequestException('Validation errors');
      });

      await expect(service.generateLetter(generateDto, 'test-user')).rejects.toThrow(BadRequestException);
      expect(errorHandler.handleValidationErrors).toHaveBeenCalled();
    });

    it('should handle client not found', async () => {
      templatesService.getTemplate.mockResolvedValue(mockTemplate);
      templatesService.getTemplateContent.mockResolvedValue('Dear {{clientName}}');
      placeholderService.resolvePlaceholders.mockResolvedValue({
        placeholders: {
          clientName: {
            key: 'clientName',
            value: 'Test',
            formattedValue: 'Test',
            source: PlaceholderSource.CLIENT,
            type: PlaceholderType.TEXT,
          },
        },
        missingRequired: [],
        errors: [],
      });
      documentGeneratorService.populateTemplate.mockReturnValue('Dear Test');
      documentGeneratorService.generatePDF.mockResolvedValue(Buffer.from('PDF'));
      clientsService.findOne.mockResolvedValue(null);
      errorHandler.handleClientNotFound.mockImplementation(() => {
        throw new NotFoundException('Client not found');
      });

      await expect(service.generateLetter(generateDto, 'test-user')).rejects.toThrow(NotFoundException);
      expect(errorHandler.handleClientNotFound).toHaveBeenCalledWith('client-1');
    });
  });

  describe('previewLetter', () => {
    const previewDto: GenerateLetterDto = {
      templateId: 'template-1',
      clientId: 'client-1',
    };

    beforeEach(() => {
      templatesService.getTemplate.mockResolvedValue(mockTemplate);
      templatesService.getTemplateContent.mockResolvedValue('Dear {{clientName}},\n\nDate: {{currentDate}}');
      placeholderService.resolvePlaceholders.mockResolvedValue({
        placeholders: {
          clientName: {
            key: 'clientName',
            value: 'Test Client Ltd',
            formattedValue: 'Test Client Ltd',
            source: PlaceholderSource.CLIENT,
            type: PlaceholderType.TEXT,
          },
          currentDate: {
            key: 'currentDate',
            value: new Date('2025-11-12'),
            formattedValue: '12/11/2025',
            source: PlaceholderSource.SYSTEM,
            type: PlaceholderType.DATE,
          },
        },
        missingRequired: [],
        errors: [],
      });
      documentGeneratorService.populateTemplate.mockReturnValue('Dear Test Client Ltd,\n\nDate: 12/11/2025');
    });

    it('should generate HTML preview', async () => {
      const result = await service.previewLetter(previewDto, 'test-user');

      expect(result).toBeDefined();
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test Client Ltd');
      expect(result).toContain('12/11/2025');
    });

    it('should not save document for preview', async () => {
      await service.previewLetter(previewDto, 'test-user');

      expect(documentsService.uploadDocument).not.toHaveBeenCalled();
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should show placeholders for missing values', async () => {
      placeholderService.resolvePlaceholders.mockResolvedValue({
        placeholders: {
          clientName: {
            key: 'clientName',
            value: null,
            formattedValue: null,
            source: PlaceholderSource.CLIENT,
            type: PlaceholderType.TEXT,
          },
        },
        missingRequired: ['clientName'],
        errors: [],
      });
      documentGeneratorService.populateTemplate.mockReturnValue('Dear [clientName]');

      const result = await service.previewLetter(previewDto, 'test-user');

      expect(result).toContain('[clientName]');
    });
  });

  describe('getGeneratedLetters', () => {
    const mockLetters = [
      {
        id: 'letter-1',
        templateId: 'template-1',
        templateName: 'Test Template',
        templateVersion: 1,
        clientId: 'client-1',
        clientName: 'Client 1',
        documentId: 'doc-1',
        placeholderValues: {},
        generatedBy: 'user-1',
        generatedAt: new Date('2025-11-01'),
        status: LetterStatus.GENERATED,
        downloadCount: 0,
      },
      {
        id: 'letter-2',
        templateId: 'template-1',
        templateName: 'Test Template',
        templateVersion: 1,
        clientId: 'client-2',
        clientName: 'Client 2',
        documentId: 'doc-2',
        placeholderValues: {},
        generatedBy: 'user-1',
        generatedAt: new Date('2025-11-02'),
        status: LetterStatus.DOWNLOADED,
        downloadCount: 1,
      },
    ];

    beforeEach(() => {
      fileStorageService.searchFiles.mockResolvedValue(mockLetters);
    });

    it('should return all letters without filters', async () => {
      const result = await service.getGeneratedLetters();

      expect(result).toHaveLength(2);
      expect(fileStorageService.searchFiles).toHaveBeenCalled();
    });

    it('should filter by clientId', async () => {
      const result = await service.getGeneratedLetters({ clientId: 'client-1' });

      expect(result).toHaveLength(1);
      expect(result[0].clientId).toBe('client-1');
    });

    it('should filter by templateId', async () => {
      const result = await service.getGeneratedLetters({ templateId: 'template-1' });

      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const result = await service.getGeneratedLetters({ status: LetterStatus.DOWNLOADED });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LetterStatus.DOWNLOADED);
    });
  });

  describe('downloadLetter', () => {
    let mockLetter: any;

    beforeEach(() => {
      // Create a fresh mock letter for each test
      mockLetter = {
        id: 'letter-1',
        templateId: 'template-1',
        templateName: 'Test Template',
        templateVersion: 1,
        clientId: 'client-1',
        clientName: 'Test Client Ltd',
        documentId: 'doc-1',
        placeholderValues: {},
        generatedBy: 'user-1',
        generatedAt: new Date(),
        status: LetterStatus.GENERATED,
        downloadCount: 0,
      };

      fileStorageService.readJson.mockResolvedValue(mockLetter);
      documentsService.getDocumentFile.mockResolvedValue({ 
        buffer: Buffer.from('PDF content'),
        document: mockDocument.document,
      } as any);
      fileStorageService.writeJson.mockResolvedValue(undefined);
      auditService.logEvent.mockResolvedValue(undefined);
    });

    it('should download letter and return buffer', async () => {
      const result = await service.downloadLetter('letter-1', 'PDF', 'test-user');

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('Test Template');
      expect(result.filename).toContain('Test Client Ltd');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should increment download count', async () => {
      await service.downloadLetter('letter-1', 'PDF', 'test-user');

      const savedLetter = fileStorageService.writeJson.mock.calls[0][2] as any;
      expect(savedLetter.downloadCount).toBe(1);
      expect(savedLetter.status).toBe(LetterStatus.DOWNLOADED);
    });

    it('should update lastDownloadedAt timestamp', async () => {
      await service.downloadLetter('letter-1', 'PDF', 'test-user');

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'generated-letters',
        'letter-1',
        expect.objectContaining({
          lastDownloadedAt: expect.any(Date),
        })
      );
    });

    it('should create audit log for download', async () => {
      await service.downloadLetter('letter-1', 'PDF', 'test-user');

      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'test-user',
          action: 'DOWNLOAD_LETTER',
          entity: 'LETTER',
          entityId: 'letter-1',
        })
      );
    });

    it('should handle DOCX format', async () => {
      const result = await service.downloadLetter('letter-1', 'DOCX', 'test-user');

      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(result.filename).toContain('.docx');
    });

    it('should throw error if letter not found', async () => {
      fileStorageService.readJson.mockResolvedValue(null);
      errorHandler.handleLetterNotFound.mockImplementation(() => {
        throw new NotFoundException('Letter not found');
      });

      await expect(service.downloadLetter('invalid-id', 'PDF', 'test-user')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if document not found', async () => {
      const letterWithoutDoc = { ...mockLetter, documentId: '' };
      fileStorageService.readJson.mockResolvedValue(letterWithoutDoc);

      await expect(service.downloadLetter('letter-1', 'PDF', 'test-user')).rejects.toThrow(BadRequestException);
    });
  });
});
