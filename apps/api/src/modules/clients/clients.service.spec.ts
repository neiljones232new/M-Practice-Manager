import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { ReferenceGeneratorService } from './services/reference-generator.service';
import { PersonService } from './services/person.service';
import { ClientPartyService } from './services/client-party.service';
import { Client, CreateClientDto, UpdateClientDto } from './interfaces/client.interface';

describe('ClientsService', () => {
  let service: ClientsService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let referenceGeneratorService: jest.Mocked<ReferenceGeneratorService>;
  let personService: jest.Mocked<PersonService>;
  let clientPartyService: jest.Mocked<ClientPartyService>;

  const mockClient: Client = {
    id: 'client_123',
    ref: '1A001',
    name: 'Test Client Ltd',
    type: 'COMPANY',
    portfolioCode: 1,
    status: 'ACTIVE',
    mainEmail: 'test@client.com',
    mainPhone: '+44 20 1234 5678',
    registeredNumber: '12345678',
    address: {
      line1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    parties: [],
    services: [],
    tasks: [],
    documents: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      searchFiles: jest.fn(),
      listFiles: jest.fn(),
    };

    const mockReferenceGeneratorService = {
      generateClientRef: jest.fn(),
      validateClientRef: jest.fn(),
      extractPortfolioCode: jest.fn(),
    };

    const mockPersonService = {
      findOne: jest.fn(),
    };

    const mockClientPartyService = {
      findByClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: ReferenceGeneratorService,
          useValue: mockReferenceGeneratorService,
        },
        {
          provide: PersonService,
          useValue: mockPersonService,
        },
        {
          provide: ClientPartyService,
          useValue: mockClientPartyService,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    fileStorageService = module.get(FileStorageService);
    referenceGeneratorService = module.get(ReferenceGeneratorService);
    personService = module.get(PersonService);
    clientPartyService = module.get(ClientPartyService);
  });

  describe('create', () => {
    const createClientDto: CreateClientDto = {
      name: 'Test Client Ltd',
      type: 'COMPANY',
      portfolioCode: 1,
      mainEmail: 'test@client.com',
      mainPhone: '+44 20 1234 5678',
      registeredNumber: '12345678',
    };

    it('should create a client successfully', async () => {
      referenceGeneratorService.generateClientRef.mockResolvedValue('1A001');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createClientDto);

      expect(result).toMatchObject({
        name: createClientDto.name,
        type: createClientDto.type,
        portfolioCode: createClientDto.portfolioCode,
        ref: '1A001',
        status: 'ACTIVE',
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(referenceGeneratorService.generateClientRef).toHaveBeenCalledWith(1, 'Test Client Ltd');
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('clients', '1A001', expect.any(Object), 1);
    });

    it('should validate portfolio code', async () => {
      const invalidDto = { ...createClientDto, portfolioCode: 11 };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      expect(referenceGeneratorService.generateClientRef).not.toHaveBeenCalled();
    });

    it('should set default status to ACTIVE', async () => {
      referenceGeneratorService.generateClientRef.mockResolvedValue('1A001');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createClientDto);

      expect(result.status).toBe('ACTIVE');
    });

    it('should handle reference generation failure', async () => {
      referenceGeneratorService.generateClientRef.mockRejectedValue(new Error('Reference generation failed'));

      await expect(service.create(createClientDto)).rejects.toThrow('Reference generation failed');
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all clients without filters', async () => {
      const clients = [mockClient];
      fileStorageService.searchFiles.mockResolvedValue(clients);

      const result = await service.findAll();

      expect(result).toEqual(clients);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('clients', expect.any(Function));
    });

    it('should filter clients by portfolio', async () => {
      const clients = [mockClient];
      fileStorageService.searchFiles.mockResolvedValue(clients);

      const result = await service.findAll({ portfolioCode: 1 });

      expect(result).toEqual(clients);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('clients', expect.any(Function), 1);
    });

    it('should apply status filter', async () => {
      const activeClient = { ...mockClient, status: 'ACTIVE' as const };
      const inactiveClient = { ...mockClient, id: 'client_456', status: 'INACTIVE' as const };
      fileStorageService.searchFiles.mockResolvedValue([activeClient, inactiveClient]);

      const result = await service.findAll({ status: 'ACTIVE' });

      expect(result).toEqual([activeClient]);
    });

    it('should apply type filter', async () => {
      const companyClient = { ...mockClient, type: 'COMPANY' as const };
      const individualClient = { ...mockClient, id: 'client_456', type: 'INDIVIDUAL' as const };
      fileStorageService.searchFiles.mockResolvedValue([companyClient, individualClient]);

      const result = await service.findAll({ type: 'COMPANY' });

      expect(result).toEqual([companyClient]);
    });

    it('should apply search filter', async () => {
      const clients = [mockClient];
      fileStorageService.searchFiles.mockResolvedValue(clients);

      const result = await service.findAll({ search: 'Test Client' });

      expect(result).toEqual(clients);
    });

    it('should apply pagination', async () => {
      const clients = Array.from({ length: 100 }, (_, i) => ({
        ...mockClient,
        id: `client_${i}`,
        name: `Client ${i}`,
      }));
      fileStorageService.searchFiles.mockResolvedValue(clients);

      const result = await service.findAll({ limit: 10, offset: 20 });

      expect(result).toHaveLength(10);
      expect(result[0].name).toBe('Client 20');
    });
  });

  describe('findOne', () => {
    it('should find client by valid reference', async () => {
      referenceGeneratorService.validateClientRef.mockReturnValue(true);
      referenceGeneratorService.extractPortfolioCode.mockReturnValue(1);
      fileStorageService.readJson.mockResolvedValue(mockClient);

      const result = await service.findOne('1A001');

      expect(result).toEqual(mockClient);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('clients', '1A001', 1);
    });

    it('should fallback to search by ID', async () => {
      referenceGeneratorService.validateClientRef.mockReturnValue(false);
      fileStorageService.searchFiles.mockResolvedValue([mockClient]);

      const result = await service.findOne('client_123');

      expect(result).toEqual(mockClient);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('clients', expect.any(Function));
    });

    it('should return null if client not found', async () => {
      referenceGeneratorService.validateClientRef.mockReturnValue(true);
      referenceGeneratorService.extractPortfolioCode.mockReturnValue(1);
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.findOne('1A999');

      expect(result).toBeNull();
    });
  });

  describe('findByRef', () => {
    it('should find client by reference', async () => {
      referenceGeneratorService.extractPortfolioCode.mockReturnValue(1);
      fileStorageService.readJson.mockResolvedValue(mockClient);

      const result = await service.findByRef('1A001');

      expect(result).toEqual(mockClient);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('clients', '1A001', 1);
    });

    it('should return null for invalid reference', async () => {
      referenceGeneratorService.extractPortfolioCode.mockReturnValue(null);

      const result = await service.findByRef('invalid-ref');

      expect(result).toBeNull();
      expect(fileStorageService.readJson).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateClientDto: UpdateClientDto = {
      name: 'Updated Client Ltd',
      mainEmail: 'updated@client.com',
    };

    it('should update client successfully', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockClient]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('client_123', updateClientDto);

      expect(result.name).toBe('Updated Client Ltd');
      expect(result.mainEmail).toBe('updated@client.com');
      expect(result.updatedAt).not.toEqual(mockClient.updatedAt);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('clients', '1A001', expect.any(Object), 1);
    });

    it('should throw NotFoundException if client not found', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      await expect(service.update('non-existent', updateClientDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should preserve immutable fields', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockClient]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const maliciousUpdate = {
        ...updateClientDto,
        id: 'hacked_id',
        ref: 'HACKED',
        portfolioCode: 999,
      };

      const result = await service.update('client_123', maliciousUpdate);

      expect(result.id).toBe(mockClient.id);
      expect(result.ref).toBe(mockClient.ref);
      expect(result.portfolioCode).toBe(mockClient.portfolioCode);
    });
  });

  describe('delete', () => {
    it('should delete client successfully', async () => {
      const clientWithoutAssociations = { ...mockClient, parties: [], services: [], tasks: [], documents: [] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithoutAssociations]);
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      const result = await service.delete('client_123');

      expect(result).toBe(true);
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('clients', '1A001', 1);
    });

    it('should return false if client not found', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.delete('non-existent');

      expect(result).toBe(false);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });

    it('should prevent deletion if client has parties', async () => {
      const clientWithParties = { ...mockClient, parties: ['party_1'] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithParties]);

      await expect(service.delete('client_123')).rejects.toThrow(BadRequestException);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });

    it('should prevent deletion if client has services', async () => {
      const clientWithServices = { ...mockClient, services: ['service_1'] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithServices]);

      await expect(service.delete('client_123')).rejects.toThrow(BadRequestException);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });

    it('should prevent deletion if client has tasks', async () => {
      const clientWithTasks = { ...mockClient, tasks: ['task_1'] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithTasks]);

      await expect(service.delete('client_123')).rejects.toThrow(BadRequestException);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });

    it('should prevent deletion if client has documents', async () => {
      const clientWithDocuments = { ...mockClient, documents: ['doc_1'] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithDocuments]);

      await expect(service.delete('client_123')).rejects.toThrow(BadRequestException);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search clients by query', async () => {
      const clients = [mockClient];
      fileStorageService.searchFiles.mockResolvedValue(clients);

      const result = await service.search('Test Client');

      expect(result).toEqual(clients);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('clients', expect.any(Function));
    });

    it('should search within specific portfolio', async () => {
      const clients = [mockClient];
      fileStorageService.searchFiles.mockResolvedValue(clients);

      const result = await service.search('Test Client', 1);

      expect(result).toEqual(clients);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('clients', expect.any(Function), 1);
    });
  });

  describe('addParty and removeParty', () => {
    it('should add party to client', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockClient]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.addParty('client_123', 'party_1');

      expect(result.parties).toContain('party_1');
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('clients', '1A001', expect.any(Object), 1);
    });

    it('should not add duplicate party', async () => {
      const clientWithParty = { ...mockClient, parties: ['party_1'] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithParty]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.addParty('client_123', 'party_1');

      expect(result.parties).toEqual(['party_1']);
      // Should not call writeJson if no change is made
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should remove party from client', async () => {
      const clientWithParty = { ...mockClient, parties: ['party_1', 'party_2'] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithParty]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.removeParty('client_123', 'party_1');

      expect(result.parties).toEqual(['party_2']);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('clients', '1A001', expect.any(Object), 1);
    });

    it('should handle removing non-existent party', async () => {
      const clientWithParty = { ...mockClient, parties: ['party_1'] };
      fileStorageService.searchFiles.mockResolvedValue([clientWithParty]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.removeParty('client_123', 'non-existent');

      expect(result.parties).toEqual(['party_1']); // Should remain unchanged
      // Should not call writeJson if no change is made
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('getClientWithParties', () => {
    it('should return client with party details', async () => {
      const mockParties = [
        {
          id: 'party_1',
          clientId: 'client_123',
          personId: 'person_1',
          role: 'DIRECTOR' as const,
          primaryContact: true,
          suffixLetter: 'A',
        },
      ];

      fileStorageService.searchFiles.mockResolvedValue([mockClient]);
      clientPartyService.findByClient.mockResolvedValue(mockParties);

      const result = await service.getClientWithParties('client_123');

      expect(result).toEqual({
        ...mockClient,
        partiesDetails: mockParties,
      });
      expect(clientPartyService.findByClient).toHaveBeenCalledWith('client_123');
    });

    it('should throw NotFoundException if client not found', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      await expect(service.getClientWithParties('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPortfolioStats', () => {
    it('should return portfolio statistics', async () => {
      const portfolioClients = [
        { ...mockClient, status: 'ACTIVE' as const },
        { ...mockClient, id: 'client_456', status: 'INACTIVE' as const },
      ];

      fileStorageService.searchFiles.mockResolvedValue(portfolioClients);

      const result = await service.getPortfolioStats();

      expect(result).toEqual({
        1: { count: 2, active: 1, inactive: 1 },
        2: { count: 2, active: 1, inactive: 1 },
        3: { count: 2, active: 1, inactive: 1 },
        4: { count: 2, active: 1, inactive: 1 },
        5: { count: 2, active: 1, inactive: 1 },
        6: { count: 2, active: 1, inactive: 1 },
        7: { count: 2, active: 1, inactive: 1 },
        8: { count: 2, active: 1, inactive: 1 },
        9: { count: 2, active: 1, inactive: 1 },
        10: { count: 2, active: 1, inactive: 1 },
      });
      expect(fileStorageService.searchFiles).toHaveBeenCalledTimes(10);
    });
  });
});
