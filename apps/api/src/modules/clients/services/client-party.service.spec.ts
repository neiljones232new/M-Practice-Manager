import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClientPartyService } from './client-party.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { ReferenceGeneratorService } from './reference-generator.service';
import { ClientParty, CreateClientPartyDto, UpdateClientPartyDto } from '../interfaces/client.interface';

describe('ClientPartyService', () => {
  let service: ClientPartyService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let referenceGeneratorService: jest.Mocked<ReferenceGeneratorService>;

  const mockClientParty: ClientParty = {
    id: 'client_party_123',
    clientId: 'client_456',
    personId: 'person_789',
    role: 'DIRECTOR',
    ownershipPercent: 25.5,
    appointedAt: new Date('2024-01-01'),
    primaryContact: true,
    suffixLetter: 'A',
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      searchFiles: jest.fn(),
    };

    const mockReferenceGeneratorService = {
      generateSuffixLetter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPartyService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: ReferenceGeneratorService,
          useValue: mockReferenceGeneratorService,
        },
      ],
    }).compile();

    service = module.get<ClientPartyService>(ClientPartyService);
    fileStorageService = module.get(FileStorageService);
    referenceGeneratorService = module.get(ReferenceGeneratorService);
  });

  describe('create', () => {
    const createClientPartyDto: CreateClientPartyDto = {
      clientId: 'client_456',
      personId: 'person_789',
      role: 'DIRECTOR',
      ownershipPercent: 25.5,
      appointedAt: new Date('2024-01-01'),
      primaryContact: true,
    };

    beforeEach(() => {
      // Mock validation methods
      jest.spyOn(service as any, 'validateClientExists').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'validatePersonExists').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'updateClientParties').mockResolvedValue(undefined);
    });

    it('should create client-party relationship successfully', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]); // No existing relationship
      referenceGeneratorService.generateSuffixLetter.mockResolvedValue('A');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createClientPartyDto);

      expect(result).toMatchObject({
        clientId: 'client_456',
        personId: 'person_789',
        role: 'DIRECTOR',
        ownershipPercent: 25.5,
        primaryContact: true,
        suffixLetter: 'A',
      });
      expect(result.id).toBeDefined();
      expect(result.appointedAt).toBeDefined();
      expect(referenceGeneratorService.generateSuffixLetter).toHaveBeenCalledWith('client_456', 'person_789');
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('client-parties', expect.any(String), expect.any(Object));
    });

    it('should set default appointment date if not provided', async () => {
      const dtoWithoutDate = { ...createClientPartyDto };
      delete dtoWithoutDate.appointedAt;

      fileStorageService.searchFiles.mockResolvedValue([]);
      referenceGeneratorService.generateSuffixLetter.mockResolvedValue('A');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(dtoWithoutDate);

      expect(result.appointedAt).toBeInstanceOf(Date);
    });

    it('should set default primary contact to false if not provided', async () => {
      const dtoWithoutPrimary = { ...createClientPartyDto };
      delete dtoWithoutPrimary.primaryContact;

      fileStorageService.searchFiles.mockResolvedValue([]);
      referenceGeneratorService.generateSuffixLetter.mockResolvedValue('A');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(dtoWithoutPrimary);

      expect(result.primaryContact).toBe(false);
    });

    it('should prevent duplicate relationships', async () => {
      const existingRelationship = { ...mockClientParty };
      fileStorageService.searchFiles.mockResolvedValue([existingRelationship]);

      await expect(service.create(createClientPartyDto)).rejects.toThrow(BadRequestException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should handle suffix letter generation failure', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);
      referenceGeneratorService.generateSuffixLetter.mockRejectedValue(new Error('Suffix generation failed'));

      await expect(service.create(createClientPartyDto)).rejects.toThrow('Suffix generation failed');
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all client-party relationships', async () => {
      const relationships = [mockClientParty];
      fileStorageService.searchFiles.mockResolvedValue(relationships);

      const result = await service.findAll();

      expect(result).toEqual(relationships);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('client-parties', expect.any(Function));
    });
  });

  describe('findOne', () => {
    it('should find client-party relationship by ID', async () => {
      fileStorageService.readJson.mockResolvedValue(mockClientParty);

      const result = await service.findOne('client_party_123');

      expect(result).toEqual(mockClientParty);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('client-parties', 'client_party_123');
    });

    it('should return null if relationship not found', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByClient', () => {
    it('should find all relationships for a client', async () => {
      const relationships = [mockClientParty];
      fileStorageService.searchFiles.mockResolvedValue(relationships);

      const result = await service.findByClient('client_456');

      expect(result).toEqual(relationships);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('client-parties', expect.any(Function));
    });
  });

  describe('findByPerson', () => {
    it('should find all relationships for a person', async () => {
      const relationships = [mockClientParty];
      fileStorageService.searchFiles.mockResolvedValue(relationships);

      const result = await service.findByPerson('person_789');

      expect(result).toEqual(relationships);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('client-parties', expect.any(Function));
    });
  });

  describe('findByClientAndPerson', () => {
    it('should find relationship by client and person', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockClientParty]);

      const result = await service.findByClientAndPerson('client_456', 'person_789');

      expect(result).toEqual(mockClientParty);
    });

    it('should find relationship by client, person, and role', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockClientParty]);

      const result = await service.findByClientAndPerson('client_456', 'person_789', 'DIRECTOR');

      expect(result).toEqual(mockClientParty);
    });

    it('should return null if no relationship found', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.findByClientAndPerson('client_456', 'person_789');

      expect(result).toBeNull();
    });
  });

  describe('findPrimaryContact', () => {
    it('should find primary contact for a client', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockClientParty]);

      const result = await service.findPrimaryContact('client_456');

      expect(result).toEqual(mockClientParty);
    });

    it('should return null if no primary contact found', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.findPrimaryContact('client_456');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateClientPartyDto: UpdateClientPartyDto = {
      role: 'SHAREHOLDER',
      ownershipPercent: 50.0,
      primaryContact: false,
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'clearPrimaryContact').mockResolvedValue(undefined);
    });

    it('should update client-party relationship successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockClientParty);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('client_party_123', updateClientPartyDto);

      expect(result.role).toBe('SHAREHOLDER');
      expect(result.ownershipPercent).toBe(50.0);
      expect(result.primaryContact).toBe(false);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('client-parties', 'client_party_123', expect.any(Object));
    });

    it('should clear other primary contacts when setting primary contact', async () => {
      fileStorageService.readJson.mockResolvedValue(mockClientParty);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service.update('client_party_123', { primaryContact: true });

      expect(service['clearPrimaryContact']).toHaveBeenCalledWith('client_456', 'client_party_123');
    });

    it('should throw NotFoundException if relationship not found', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      await expect(service.update('non-existent', updateClientPartyDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should preserve immutable fields', async () => {
      fileStorageService.readJson.mockResolvedValue(mockClientParty);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const maliciousUpdate = {
        ...updateClientPartyDto,
        id: 'hacked_id',
        clientId: 'hacked_client',
        personId: 'hacked_person',
      } as any;

      const result = await service.update('client_party_123', maliciousUpdate);

      expect(result.id).toBe(mockClientParty.id);
      expect(result.clientId).toBe(mockClientParty.clientId);
      expect(result.personId).toBe(mockClientParty.personId);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'updateClientParties').mockResolvedValue(undefined);
    });

    it('should delete client-party relationship successfully', async () => {
      fileStorageService.readJson.mockResolvedValue(mockClientParty);
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      const result = await service.delete('client_party_123');

      expect(result).toBe(true);
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('client-parties', 'client_party_123');
      expect(service['updateClientParties']).toHaveBeenCalledWith('client_456', 'client_party_123', 'remove');
    });

    it('should return false if relationship not found', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.delete('non-existent');

      expect(result).toBe(false);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });
  });

  describe('resign', () => {
    it('should resign client-party relationship with provided date', async () => {
      const resignationDate = new Date('2024-06-01');
      fileStorageService.readJson.mockResolvedValue(mockClientParty);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.resign('client_party_123', resignationDate);

      expect(result.resignedAt).toEqual(resignationDate);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('client-parties', 'client_party_123', expect.any(Object));
    });

    it('should resign client-party relationship with current date if not provided', async () => {
      fileStorageService.readJson.mockResolvedValue(mockClientParty);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.resign('client_party_123');

      expect(result.resignedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if relationship not found', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      await expect(service.resign('non-existent')).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('getOwnershipSummary', () => {
    it('should calculate ownership summary correctly', async () => {
      const relationships = [
        { ...mockClientParty, ownershipPercent: 25.5, role: 'SHAREHOLDER', suffixLetter: 'A' },
        { ...mockClientParty, id: 'party_2', ownershipPercent: 30.0, role: 'SHAREHOLDER', suffixLetter: 'B' },
        { ...mockClientParty, id: 'party_3', ownershipPercent: undefined, role: 'DIRECTOR', suffixLetter: 'C' },
      ];
      fileStorageService.searchFiles.mockResolvedValue(relationships);

      const result = await service.getOwnershipSummary('client_456');

      expect(result.totalOwnership).toBe(55.5);
      expect(result.parties).toHaveLength(2);
      expect(result.parties[0]).toMatchObject({
        personId: 'person_789',
        role: 'SHAREHOLDER',
        ownershipPercent: 25.5,
        suffixLetter: 'A',
      });
    });

    it('should handle no ownership parties', async () => {
      const relationships = [
        { ...mockClientParty, ownershipPercent: undefined, role: 'DIRECTOR' },
      ];
      fileStorageService.searchFiles.mockResolvedValue(relationships);

      const result = await service.getOwnershipSummary('client_456');

      expect(result.totalOwnership).toBe(0);
      expect(result.parties).toHaveLength(0);
    });
  });

  describe('clearPrimaryContact', () => {
    it('should clear existing primary contacts', async () => {
      const existingPrimary = { ...mockClientParty, id: 'other_party', primaryContact: true };
      fileStorageService.searchFiles.mockResolvedValue([existingPrimary]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service['clearPrimaryContact']('client_456', 'client_party_123');

      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'client-parties',
        'other_party',
        expect.objectContaining({ primaryContact: false })
      );
    });

    it('should not affect the excluded relationship', async () => {
      const currentPrimary = { ...mockClientParty, primaryContact: true };
      const otherPrimary = { ...mockClientParty, id: 'other_party', primaryContact: true };
      fileStorageService.searchFiles.mockResolvedValue([currentPrimary, otherPrimary]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      await service['clearPrimaryContact']('client_456', 'client_party_123');

      // Should only update the other party, not the excluded one
      expect(fileStorageService.writeJson).toHaveBeenCalledWith(
        'client-parties',
        'other_party',
        expect.objectContaining({ primaryContact: false })
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle file storage errors during creation', async () => {
      jest.spyOn(service as any, 'validateClientExists').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'validatePersonExists').mockResolvedValue(undefined);
      fileStorageService.searchFiles.mockResolvedValue([]);
      referenceGeneratorService.generateSuffixLetter.mockResolvedValue('A');
      fileStorageService.writeJson.mockRejectedValue(new Error('Storage error'));

      const createDto: CreateClientPartyDto = {
        clientId: 'client_456',
        personId: 'person_789',
        role: 'DIRECTOR',
      };

      await expect(service.create(createDto)).rejects.toThrow('Storage error');
    });

    it('should handle search errors gracefully', async () => {
      fileStorageService.searchFiles.mockRejectedValue(new Error('Search error'));

      await expect(service.findByClient('client_456')).rejects.toThrow('Search error');
    });

    it('should handle zero ownership percentage', async () => {
      const createDto: CreateClientPartyDto = {
        clientId: 'client_456',
        personId: 'person_789',
        role: 'SHAREHOLDER',
        ownershipPercent: 0,
      };

      jest.spyOn(service as any, 'validateClientExists').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'validatePersonExists').mockResolvedValue(undefined);
      fileStorageService.searchFiles.mockResolvedValue([]);
      referenceGeneratorService.generateSuffixLetter.mockResolvedValue('A');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.ownershipPercent).toBe(0);
    });

    it('should handle zero ownership percentage in summary', async () => {
      const relationships = [
        { ...mockClientParty, ownershipPercent: 0, role: 'SHAREHOLDER' },
      ];
      fileStorageService.searchFiles.mockResolvedValue(relationships);

      const result = await service.getOwnershipSummary('client_456');

      expect(result.totalOwnership).toBe(0);
      expect(result.parties).toHaveLength(1); // Zero ownership is still included
    });
  });
});