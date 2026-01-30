import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PersonService } from './person.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { ReferenceGeneratorService } from './reference-generator.service';
import { Person, CreatePersonDto, UpdatePersonDto } from '../interfaces/client.interface';

describe('PersonService', () => {
  let service: PersonService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let referenceGeneratorService: jest.Mocked<ReferenceGeneratorService>;

  const mockPerson: Person = {
    id: '1M001A',
    ref: '1M001A',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+44 20 1234 5678',
    dateOfBirth: new Date('1980-01-01'),
    nationality: 'United Kingdom',
    address: {
      line1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockFileStorageService = {
      writeJson: jest.fn(),
      readJson: jest.fn(),
      deleteJson: jest.fn(),
      searchFiles: jest.fn(),
    };

    const mockReferenceGeneratorService = {
      generateConnectedPersonRef: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonService,
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

    service = module.get<PersonService>(PersonService);
    fileStorageService = module.get(FileStorageService);
    referenceGeneratorService = module.get(ReferenceGeneratorService);
  });

  describe('create', () => {
    const clientRef = '1M001';
    const createPersonDto: CreatePersonDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+44 20 1234 5678',
      dateOfBirth: new Date('1980-01-01'),
      nationality: 'United Kingdom',
    };

    it('should create a person successfully', async () => {
      referenceGeneratorService.generateConnectedPersonRef.mockResolvedValue('1M001A');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(clientRef, createPersonDto);

      expect(result).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        ref: '1M001A',
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(referenceGeneratorService.generateConnectedPersonRef).toHaveBeenCalledWith(clientRef);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('people', '1M001A', expect.any(Object), undefined, clientRef);
    });

    it('should generate full name correctly', async () => {
      referenceGeneratorService.generateConnectedPersonRef.mockResolvedValue('1M001A');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(clientRef, createPersonDto);

      expect(result.fullName).toBe('John Doe');
    });

    it('should handle optional fields', async () => {
      const minimalDto: CreatePersonDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      referenceGeneratorService.generateConnectedPersonRef.mockResolvedValue('1M001B');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create(clientRef, minimalDto);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.fullName).toBe('Jane Smith');
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it('should handle reference generation failure', async () => {
      referenceGeneratorService.generateConnectedPersonRef.mockRejectedValue(new Error('Reference generation failed'));

      await expect(service.create(clientRef, createPersonDto)).rejects.toThrow('Reference generation failed');
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all people', async () => {
      const people = [mockPerson];
      fileStorageService.searchFiles.mockResolvedValue(people);

      const result = await service.findAll();

      expect(result).toEqual(people);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('people', expect.any(Function));
    });

    it('should return empty array when no people exist', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find person by ID', async () => {
      fileStorageService.readJson.mockResolvedValue(mockPerson);

      const result = await service.findOne('person_123');

      expect(result).toEqual(mockPerson);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('people', 'person_123');
    });

    it('should fallback to search if not found by ID', async () => {
      fileStorageService.readJson.mockResolvedValue(null);
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);

      const result = await service.findOne('person_123');

      expect(result).toEqual(mockPerson);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('people', expect.any(Function));
    });

    it('should return null if person not found', async () => {
      fileStorageService.readJson.mockResolvedValue(null);
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByRef', () => {
    it('should find person by reference', async () => {
      fileStorageService.readJson.mockResolvedValue(mockPerson);

      const result = await service.findByRef('1M001A');

      expect(result).toEqual(mockPerson);
      expect(fileStorageService.readJson).toHaveBeenCalledWith('people', '1M001A');
    });

    it('should return null if person not found by reference', async () => {
      fileStorageService.readJson.mockResolvedValue(null);

      const result = await service.findByRef('1M001Z');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find person by email', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);

      const result = await service.findByEmail('john.doe@example.com');

      expect(result).toEqual(mockPerson);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('people', expect.any(Function));
    });

    it('should return null if person not found by email', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should search people by query', async () => {
      const people = [mockPerson];
      fileStorageService.searchFiles.mockResolvedValue(people);

      const result = await service.search('John Doe');

      expect(result).toEqual(people);
      expect(fileStorageService.searchFiles).toHaveBeenCalledWith('people', expect.any(Function));
    });

    it('should search by email', async () => {
      const people = [mockPerson];
      fileStorageService.searchFiles.mockResolvedValue(people);

      const result = await service.search('john.doe@example.com');

      expect(result).toEqual(people);
    });

    it('should search by reference', async () => {
      const people = [mockPerson];
      fileStorageService.searchFiles.mockResolvedValue(people);

      const result = await service.search('1M001A');

      expect(result).toEqual(people);
    });

    it('should be case insensitive', async () => {
      const people = [mockPerson];
      fileStorageService.searchFiles.mockResolvedValue(people);

      const result = await service.search('JOHN DOE');

      expect(result).toEqual(people);
    });
  });

  describe('update', () => {
    const updatePersonDto: UpdatePersonDto = {
      firstName: 'Jane',
      email: 'jane.doe@example.com',
    };

    it('should update person successfully', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('person_123', updatePersonDto);

      expect(result.firstName).toBe('Jane');
      expect(result.fullName).toBe('Jane Doe');
      expect(result.email).toBe('jane.doe@example.com');
      expect(result.updatedAt).not.toEqual(mockPerson.updatedAt);
      expect(fileStorageService.writeJson).toHaveBeenCalledWith('people', '1M001A', expect.any(Object));
    });

    it('should update full name when first or last name changes', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('person_123', { lastName: 'Smith' });

      expect(result.fullName).toBe('John Smith');
    });

    it('should preserve full name when neither first nor last name changes', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('person_123', { email: 'new@example.com' });

      expect(result.fullName).toBe('John Doe');
    });

    it('should throw NotFoundException if person not found', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      await expect(service.update('non-existent', updatePersonDto)).rejects.toThrow(NotFoundException);
      expect(fileStorageService.writeJson).not.toHaveBeenCalled();
    });

    it('should preserve immutable fields', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const maliciousUpdate = {
        ...updatePersonDto,
        id: 'hacked_id',
        ref: 'HACKED',
      };

      const result = await service.update('person_123', maliciousUpdate);

      expect(result.id).toBe(mockPerson.id);
      expect(result.ref).toBe(mockPerson.ref);
    });
  });

  describe('delete', () => {
    it('should delete person successfully', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);
      jest.spyOn(service, 'findAssociatedClients').mockResolvedValue([]);
      fileStorageService.deleteJson.mockResolvedValue(undefined);

      const result = await service.delete('person_123');

      expect(result).toBe(true);
      expect(fileStorageService.deleteJson).toHaveBeenCalledWith('people', '1M001A');
    });

    it('should return false if person not found', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.delete('non-existent');

      expect(result).toBe(false);
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });

    it('should prevent deletion if person has associated clients', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);
      jest.spyOn(service, 'findAssociatedClients').mockResolvedValue(['client_1', 'client_2']);

      await expect(service.delete('person_123')).rejects.toThrow(
        'Cannot delete person John Doe - associated with 2 client(s)'
      );
      expect(fileStorageService.deleteJson).not.toHaveBeenCalled();
    });
  });

  describe('findAssociatedClients', () => {
    it('should return empty array for now', async () => {
      // This is a placeholder implementation
      const result = await service.findAssociatedClients('person_123');

      expect(result).toEqual([]);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle file storage errors during creation', async () => {
      referenceGeneratorService.generateConnectedPersonRef.mockResolvedValue('1M001A');
      fileStorageService.writeJson.mockRejectedValue(new Error('Storage error'));

      const createPersonDto: CreatePersonDto = {
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(service.create('1M001', createPersonDto)).rejects.toThrow('Storage error');
    });

    it('should handle file storage errors during search', async () => {
      fileStorageService.searchFiles.mockRejectedValue(new Error('Search error'));

      await expect(service.search('John')).rejects.toThrow('Search error');
    });

    it('should handle special characters in names', async () => {
      const specialDto: CreatePersonDto = {
        firstName: 'José',
        lastName: 'García-López',
      };

      referenceGeneratorService.generateConnectedPersonRef.mockResolvedValue('1M001A');
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.create('1M001', specialDto);

      expect(result.firstName).toBe('José');
      expect(result.lastName).toBe('García-López');
      expect(result.fullName).toBe('José García-López');
    });

    it('should handle empty search query', async () => {
      fileStorageService.searchFiles.mockResolvedValue([]);

      const result = await service.search('');

      expect(result).toEqual([]);
    });

    it('should handle whitespace in names during update', async () => {
      fileStorageService.searchFiles.mockResolvedValue([mockPerson]);
      fileStorageService.writeJson.mockResolvedValue(undefined);

      const result = await service.update('person_123', {
        firstName: '  Jane  ',
        lastName: '  Smith  ',
      });

      expect(result.firstName).toBe('  Jane  ');
      expect(result.lastName).toBe('  Smith  ');
      expect(result.fullName).toBe('  Jane     Smith  ');
    });
  });
});
