import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ClientsService } from '../clients/clients.service';
import { ComplianceItem, CreateComplianceItemDto } from '../companies-house/interfaces/companies-house.interface';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const mockComplianceItem: ComplianceItem = {
    id: 'C123456789abc',
    clientId: 'client_123',
    type: 'ANNUAL_ACCOUNTS',
    description: 'Annual Accounts Filing',
    dueDate: new Date('2024-12-31'),
    status: 'PENDING',
    source: 'COMPANIES_HOUSE',
    reference: '12345678',
    period: '2024-03-31',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const createComplianceItemDto: CreateComplianceItemDto = {
    clientId: 'client_123',
    type: 'ANNUAL_ACCOUNTS',
    description: 'Annual Accounts Filing',
    dueDate: new Date('2024-12-31'),
    source: 'COMPANIES_HOUSE',
    reference: '12345678',
    period: '2024-03-31',
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      listFiles: jest.fn(),
    };

    const mockClientsService = {
      getClientByRef: jest.fn(),
      getClients: jest.fn(),
      findByPortfolio: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    fileStorageService = module.get(FileStorageService);
  });

  describe('createComplianceItem', () => {
    it('should create a compliance item successfully', async () => {
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.createComplianceItem(createComplianceItemDto);

      expect(result).toMatchObject({
        clientId: 'client_123',
        type: 'ANNUAL_ACCOUNTS',
        description: 'Annual Accounts Filing',
        status: 'PENDING',
        source: 'COMPANIES_HOUSE',
      });
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^C\d+[a-z0-9]+$/);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'compliance',
        result.id,
        result
      );
    });

    it('should set default status to PENDING', async () => {
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const dtoWithoutStatus = { ...createComplianceItemDto };
      delete (dtoWithoutStatus as any).status;

      const result = await service.createComplianceItem(dtoWithoutStatus);

      expect(result.status).toBe('PENDING');
    });

    it('should preserve provided status', async () => {
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const dtoWithStatus = { ...createComplianceItemDto, status: 'OVERDUE' as const };

      const result = await service.createComplianceItem(dtoWithStatus);

      expect(result.status).toBe('OVERDUE');
    });
  });

  describe('getComplianceItem', () => {
    it('should get compliance item successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockComplianceItem);

      const result = await service.getComplianceItem('C123456789abc');

      expect(result).toEqual(mockComplianceItem);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('compliance', 'C123456789abc');
    });

    it('should throw NotFoundException when item not found', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('File not found'));

      await expect(service.getComplianceItem('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateComplianceItem', () => {
    it('should update compliance item successfully', async () => {
      const updateData = {
        status: 'FILED' as const,
        description: 'Updated description',
      };

      fileStorageService.readJson.mockResolvedValue(mockComplianceItem);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.updateComplianceItem('C123456789abc', updateData);

      expect(result).toMatchObject({
        ...mockComplianceItem,
        ...updateData,
      });
      expect(result.updatedAt).not.toEqual(mockComplianceItem.updatedAt);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'compliance',
        'C123456789abc',
        result
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      fileStorageService.readJson.mockRejectedValue(new Error('File not found'));

      await expect(
        service.updateComplianceItem('nonexistent', { status: 'FILED' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteComplianceItem', () => {
    it('should delete compliance item successfully', async () => {
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      await service.deleteComplianceItem('C123456789abc');

      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('compliance', 'C123456789abc');
    });

    it('should throw NotFoundException when item not found', async () => {
      fileStorageService.deleteJson.mockRejectedValue(new Error('File not found'));

      await expect(service.deleteComplianceItem('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getComplianceItemsByClient', () => {
    it('should get compliance items for client successfully', async () => {
      const complianceItems = [
        mockComplianceItem,
        {
          ...mockComplianceItem,
          id: 'C987654321def',
          type: 'CONFIRMATION_STATEMENT',
          dueDate: new Date('2024-06-30'),
        },
      ];

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(complianceItems[0])
        .mockResolvedValueOnce(complianceItems[1]);

      const result = await service.getComplianceItemsByClient('client_123');

      expect(result).toHaveLength(2);
      expect(result[0].dueDate).toEqual(new Date('2024-06-30')); // Should be sorted by due date
      expect(result[1].dueDate).toEqual(new Date('2024-12-31'));
    });

    it('should filter items by client ID', async () => {
      const otherClientItem = {
        ...mockComplianceItem,
        id: 'C987654321def',
        clientId: 'client_456',
      };

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(mockComplianceItem)
        .mockResolvedValueOnce(otherClientItem);

      const result = await service.getComplianceItemsByClient('client_123');

      expect(result).toHaveLength(1);
      expect(result[0].clientId).toBe('client_123');
    });

    it('should handle empty results', async () => {
      fileStorageService.listFiles.mockResolvedValue([]);

      const result = await service.getComplianceItemsByClient('client_123');

      expect(result).toEqual([]);
    });

    it('should handle file system errors gracefully', async () => {
      fileStorageService.listFiles.mockRejectedValue(new Error('File system error'));

      const result = await service.getComplianceItemsByClient('client_123');

      expect(result).toEqual([]);
    });

    it('should sort items with no due date last', async () => {
      const itemWithoutDueDate = {
        ...mockComplianceItem,
        id: 'C987654321def',
        dueDate: undefined,
      };

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(mockComplianceItem)
        .mockResolvedValueOnce(itemWithoutDueDate);

      const result = await service.getComplianceItemsByClient('client_123');

      expect(result).toHaveLength(2);
      expect(result[0].dueDate).toBeDefined();
      expect(result[1].dueDate).toBeUndefined();
    });
  });

  describe('getAllComplianceItems', () => {
    it('should get all compliance items successfully', async () => {
      const complianceItems = [
        mockComplianceItem,
        {
          ...mockComplianceItem,
          id: 'C987654321def',
          clientId: 'client_456',
          dueDate: new Date('2024-06-30'),
        },
      ];

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(complianceItems[0])
        .mockResolvedValueOnce(complianceItems[1]);

      const result = await service.getAllComplianceItems();

      expect(result).toHaveLength(2);
      expect(result[0].dueDate).toEqual(new Date('2024-06-30')); // Should be sorted by due date
      expect(result[1].dueDate).toEqual(new Date('2024-12-31'));
    });
  });

  describe('getOverdueComplianceItems', () => {
    it('should get overdue compliance items', async () => {
      const overdueItem = {
        ...mockComplianceItem,
        id: 'C987654321def',
        dueDate: new Date('2023-12-31'), // Past date
        status: 'PENDING' as const,
      };

      const futureItem = {
        ...mockComplianceItem,
        id: 'C111222333ghi',
        dueDate: new Date('2025-12-31'), // Future date
        status: 'PENDING' as const,
      };

      const filedItem = {
        ...mockComplianceItem,
        id: 'C444555666jkl',
        dueDate: new Date('2023-06-30'), // Past date but filed
        status: 'FILED' as const,
      };

      fileStorageService.listFiles.mockResolvedValue([
        'C123456789abc.json',
        'C987654321def.json',
        'C111222333ghi.json',
        'C444555666jkl.json',
      ]);
      fileStorageService.readJson
        .mockResolvedValueOnce(mockComplianceItem)
        .mockResolvedValueOnce(overdueItem)
        .mockResolvedValueOnce(futureItem)
        .mockResolvedValueOnce(filedItem);

      const result = await service.getOverdueComplianceItems();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('C987654321def');
      expect(result[0].status).toBe('PENDING');
      expect(result[0].dueDate!.getTime()).toBeLessThan(new Date().getTime());
    });

    it('should exclude items without due dates', async () => {
      const itemWithoutDueDate = {
        ...mockComplianceItem,
        id: 'C987654321def',
        dueDate: undefined,
        status: 'PENDING' as const,
      };

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(mockComplianceItem)
        .mockResolvedValueOnce(itemWithoutDueDate);

      const result = await service.getOverdueComplianceItems();

      expect(result).toHaveLength(0);
    });
  });

  describe('getUpcomingComplianceItems', () => {
    it('should get upcoming compliance items within default 30 days', async () => {
      const now = new Date();
      const upcomingDate = new Date();
      upcomingDate.setDate(now.getDate() + 15); // 15 days from now

      const farFutureDate = new Date();
      farFutureDate.setDate(now.getDate() + 45); // 45 days from now

      const upcomingItem = {
        ...mockComplianceItem,
        id: 'C987654321def',
        dueDate: upcomingDate,
        status: 'PENDING' as const,
      };

      const farFutureItem = {
        ...mockComplianceItem,
        id: 'C111222333ghi',
        dueDate: farFutureDate,
        status: 'PENDING' as const,
      };

      fileStorageService.listFiles.mockResolvedValue([
        'C123456789abc.json',
        'C987654321def.json',
        'C111222333ghi.json',
      ]);
      fileStorageService.readJson
        .mockResolvedValueOnce(mockComplianceItem)
        .mockResolvedValueOnce(upcomingItem)
        .mockResolvedValueOnce(farFutureItem);

      const result = await service.getUpcomingComplianceItems();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('C987654321def');
    });

    it('should get upcoming compliance items within custom days', async () => {
      const now = new Date();
      const upcomingDate = new Date();
      upcomingDate.setDate(now.getDate() + 5); // 5 days from now

      const upcomingItem = {
        ...mockComplianceItem,
        id: 'C987654321def',
        dueDate: upcomingDate,
        status: 'PENDING' as const,
      };

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(mockComplianceItem)
        .mockResolvedValueOnce(upcomingItem);

      const result = await service.getUpcomingComplianceItems(7);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('C987654321def');
    });
  });

  describe('markComplianceItemFiled', () => {
    it('should mark compliance item as filed', async () => {
      fileStorageService.readJson.mockResolvedValue(mockComplianceItem);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.markComplianceItemFiled('C123456789abc');

      expect(result.status).toBe('FILED');
      expect(result.updatedAt).not.toEqual(mockComplianceItem.updatedAt);
    });

    it('should mark compliance item as filed with custom date', async () => {
      const filedDate = new Date('2024-06-15');
      fileStorageService.readJson.mockResolvedValue(mockComplianceItem);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.markComplianceItemFiled('C123456789abc', filedDate);

      expect(result.status).toBe('FILED');
      expect(result.updatedAt).toEqual(filedDate);
    });
  });

  describe('markComplianceItemOverdue', () => {
    it('should mark compliance item as overdue', async () => {
      fileStorageService.readJson.mockResolvedValue(mockComplianceItem);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.markComplianceItemOverdue('C123456789abc');

      expect(result.status).toBe('OVERDUE');
      expect(result.updatedAt).not.toEqual(mockComplianceItem.updatedAt);
    });
  });

  describe('findByService', () => {
    it('should get compliance items for a specific service', async () => {
      const serviceId = 'service_123';
      const complianceItemWithService = {
        ...mockComplianceItem,
        serviceId,
      };
      const complianceItemWithDifferentService = {
        ...mockComplianceItem,
        id: 'C987654321def',
        serviceId: 'service_456',
      };
      const complianceItemWithoutService = {
        ...mockComplianceItem,
        id: 'C111222333ghi',
      };

      fileStorageService.listFiles.mockResolvedValue([
        'C123456789abc.json',
        'C987654321def.json',
        'C111222333ghi.json',
      ]);
      fileStorageService.readJson
        .mockResolvedValueOnce(complianceItemWithService)
        .mockResolvedValueOnce(complianceItemWithDifferentService)
        .mockResolvedValueOnce(complianceItemWithoutService);

      const result = await service.findByService(serviceId);

      expect(result).toHaveLength(1);
      expect(result[0].serviceId).toBe(serviceId);
      expect(result[0].id).toBe('C123456789abc');
    });

    it('should return empty array when no compliance items match service', async () => {
      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json']);
      fileStorageService.readJson.mockResolvedValue(mockComplianceItem);

      const result = await service.findByService('nonexistent_service');

      expect(result).toEqual([]);
    });

    it('should sort results by due date', async () => {
      const serviceId = 'service_123';
      const item1 = {
        ...mockComplianceItem,
        id: 'C123456789abc',
        serviceId,
        dueDate: new Date('2024-12-31'),
      };
      const item2 = {
        ...mockComplianceItem,
        id: 'C987654321def',
        serviceId,
        dueDate: new Date('2024-06-30'),
      };

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(item1)
        .mockResolvedValueOnce(item2);

      const result = await service.findByService(serviceId);

      expect(result).toHaveLength(2);
      expect(result[0].dueDate).toEqual(new Date('2024-06-30'));
      expect(result[1].dueDate).toEqual(new Date('2024-12-31'));
    });

    it('should handle file system errors gracefully', async () => {
      fileStorageService.listFiles.mockRejectedValue(new Error('File system error'));

      const result = await service.findByService('service_123');

      expect(result).toEqual([]);
    });
  });

  describe('findAll with serviceId filter', () => {
    it('should filter compliance items by serviceId', async () => {
      const serviceId = 'service_123';
      const complianceItemWithService = {
        ...mockComplianceItem,
        serviceId,
      };
      const complianceItemWithDifferentService = {
        ...mockComplianceItem,
        id: 'C987654321def',
        serviceId: 'service_456',
      };

      fileStorageService.listFiles.mockResolvedValue(['C123456789abc.json', 'C987654321def.json']);
      fileStorageService.readJson
        .mockResolvedValueOnce(complianceItemWithService)
        .mockResolvedValueOnce(complianceItemWithDifferentService);

      const result = await service.findAll({ serviceId });

      expect(result).toHaveLength(1);
      expect(result[0].serviceId).toBe(serviceId);
    });

    it('should combine serviceId filter with other filters', async () => {
      const serviceId = 'service_123';
      const clientId = 'client_123';
      const complianceItem = {
        ...mockComplianceItem,
        serviceId,
        clientId,
        status: 'PENDING' as const,
      };
      const wrongClientItem = {
        ...mockComplianceItem,
        id: 'C987654321def',
        serviceId,
        clientId: 'client_456',
      };
      const wrongServiceItem = {
        ...mockComplianceItem,
        id: 'C111222333ghi',
        serviceId: 'service_456',
        clientId,
      };

      fileStorageService.listFiles.mockResolvedValue([
        'C123456789abc.json',
        'C987654321def.json',
        'C111222333ghi.json',
      ]);
      fileStorageService.readJson
        .mockResolvedValueOnce(complianceItem)
        .mockResolvedValueOnce(wrongClientItem)
        .mockResolvedValueOnce(wrongServiceItem);

      const result = await service.findAll({ serviceId, clientId, status: 'PENDING' });

      expect(result).toHaveLength(1);
      expect(result[0].serviceId).toBe(serviceId);
      expect(result[0].clientId).toBe(clientId);
      expect(result[0].status).toBe('PENDING');
    });
  });
});