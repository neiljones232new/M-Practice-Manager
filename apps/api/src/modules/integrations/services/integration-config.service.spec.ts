import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IntegrationConfigService } from './integration-config.service';
import { EncryptionService } from './encryption.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { IntegrationConfig, CreateIntegrationConfigDto } from '../interfaces/integration.interface';

describe('IntegrationConfigService', () => {
  let service: IntegrationConfigService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let encryptionService: jest.Mocked<EncryptionService>;

  const mockIntegrations: IntegrationConfig[] = [
    {
      id: 'test-id-1',
      name: 'Test OpenAI',
      type: 'OPENAI',
      enabled: true,
      apiKey: 'encrypted-api-key',
      settings: { model: 'gpt-4' },
      status: 'CONNECTED',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'test-id-2',
      name: 'Test Companies House',
      type: 'COMPANIES_HOUSE',
      enabled: false,
      baseUrl: 'https://api.company-information.service.gov.uk',
      settings: {},
      status: 'DISCONNECTED',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  beforeEach(async () => {
    const mockFileStorageService = {
      readJson: jest.fn(),
      writeJson: jest.fn(),
    };

    const mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateSecureToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationConfigService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<IntegrationConfigService>(IntegrationConfigService);
    fileStorageService = module.get(FileStorageService);
    encryptionService = module.get(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getIntegrations', () => {
    it('should return integrations with masked API keys', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      const result = await service.getIntegrations();

      expect(result).toHaveLength(2);
      expect(result[0].apiKey).toBe('[ENCRYPTED]');
      expect(result[1].apiKey).toBeUndefined();
    });

    it('should initialize default integrations if file not found', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('File not found'));
      fileStorageService.writeJson.mockResolvedValue(undefined);
      encryptionService.generateSecureToken.mockReturnValue('generated-token');

      const result = await service.getIntegrations();

      expect(result).toHaveLength(4); // Default integrations
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });
  });

  describe('getIntegrationById', () => {
    it('should return integration by ID with masked API key', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      const result = await service.getIntegrationById('test-id-1');

      expect(result.id).toBe('test-id-1');
      expect(result.apiKey).toBe('[ENCRYPTED]');
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      await expect(service.getIntegrationById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getIntegrationByType', () => {
    it('should return integration by type', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      const result = await service.getIntegrationByType('OPENAI');

      expect(result?.type).toBe('OPENAI');
      expect(result?.id).toBe('test-id-1');
    });

    it('should return null for non-existent type', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      const result = await service.getIntegrationByType('NON_EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('createIntegration', () => {
    it('should create new integration with encrypted API key', async () => {
      fileStorageService.readJson.mockResolvedValue([]);
      fileStorageService.writeJson.mockResolvedValue(undefined);
      encryptionService.generateSecureToken.mockReturnValue('new-token');
      encryptionService.encrypt.mockReturnValue('encrypted-key');

      const dto: CreateIntegrationConfigDto = {
        name: 'New Integration',
        type: 'HMRC',
        apiKey: 'test-api-key',
        settings: { environment: 'sandbox' },
      };

      const result = await service.createIntegration(dto);

      expect(result.name).toBe(dto.name);
      expect(result.type).toBe(dto.type);
      expect(result.apiKey).toBe('[ENCRYPTED]');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('test-api-key');
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });

    it('should throw error if integration type already exists', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      const dto: CreateIntegrationConfigDto = {
        name: 'Duplicate OpenAI',
        type: 'OPENAI',
      };

      await expect(service.createIntegration(dto)).rejects.toThrow('Integration of type OPENAI already exists');
    });
  });

  describe('updateIntegration', () => {
    it('should update existing integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);
      fileStorageService.writeJson.mockResolvedValue(undefined);
      encryptionService.encrypt.mockReturnValue('new-encrypted-key');

      const result = await service.updateIntegration('test-id-1', {
        name: 'Updated OpenAI',
        apiKey: 'new-api-key',
      });

      expect(result.name).toBe('Updated OpenAI');
      expect(result.apiKey).toBe('[ENCRYPTED]');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('new-api-key');
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      await expect(service.updateIntegration('non-existent', { name: 'Updated' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteIntegration', () => {
    it('should delete existing integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.deleteIntegration('test-id-1');

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'config',
        'integrations',
        expect.arrayContaining([
          expect.objectContaining({ id: 'test-id-2' })
        ])
      );
    });

    it('should throw NotFoundException for non-existent integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      await expect(service.deleteIntegration('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should return decrypted API key for enabled integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);
      encryptionService.decrypt.mockReturnValue('decrypted-api-key');

      const result = await service.getDecryptedApiKey('OPENAI');

      expect(result).toBe('decrypted-api-key');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-api-key');
    });

    it('should return null for disabled integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      const result = await service.getDecryptedApiKey('COMPANIES_HOUSE');

      expect(result).toBeNull();
    });

    it('should return null for non-existent integration', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);

      const result = await service.getDecryptedApiKey('NON_EXISTENT');

      expect(result).toBeNull();
    });

    it('should return null if decryption fails', async () => {
      fileStorageService.readJson.mockResolvedValue(mockIntegrations);
      encryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getDecryptedApiKey('OPENAI');

      expect(result).toBeNull();
    });
  });

  describe('updateIntegrationStatus', () => {
    it('should update integration status and last tested time', async () => {
      // Use the internal method that returns unmasked data
      jest.spyOn(service as any, 'getIntegrationsInternal').mockResolvedValue(mockIntegrations);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.updateIntegrationStatus('test-id-1', 'ERROR', 'Connection failed');

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'config',
        'integrations',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'test-id-1',
            status: 'ERROR',
            lastError: 'Connection failed',
            lastTested: expect.any(Date),
          })
        ])
      );
    });
  });

  describe('getPracticeSettings', () => {
    it('should return practice settings', async () => {
      const mockSettings = {
        id: 'practice-1',
        practiceName: 'Test Practice',
        portfolios: [],
        systemSettings: {
          backupRetentionDays: 30,
          autoBackupEnabled: true,
          auditLogRetentionDays: 365,
          defaultServiceFrequency: 'ANNUAL' as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      fileStorageService.readJson.mockResolvedValue(mockSettings);

      const result = await service.getPracticeSettings();

      expect(result).toEqual(mockSettings);
    });

    it('should initialize default settings if file not found', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('File not found'));
      fileStorageService.writeJson.mockResolvedValue(undefined);
      encryptionService.generateSecureToken.mockReturnValue('practice-token');

      const result = await service.getPracticeSettings();

      expect(result.practiceName).toBe('MDJ Practice');
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });
  });

  describe('updatePracticeSettings', () => {
    it('should update practice settings', async () => {
      const mockSettings = {
        id: 'practice-1',
        practiceName: 'Test Practice',
        portfolios: [],
        systemSettings: {
          backupRetentionDays: 30,
          autoBackupEnabled: true,
          auditLogRetentionDays: 365,
          defaultServiceFrequency: 'ANNUAL' as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      fileStorageService.readJson.mockResolvedValue(mockSettings);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.updatePracticeSettings({
        practiceName: 'Updated Practice',
        practiceEmail: 'test@example.com',
      });

      expect(result.practiceName).toBe('Updated Practice');
      expect(result.practiceEmail).toBe('test@example.com');
      expect(fileStorageService.writeJson).toHaveBeenCalled();
    });
  });
});