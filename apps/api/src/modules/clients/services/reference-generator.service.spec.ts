import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceGeneratorService } from './reference-generator.service';
import { FileStorageService } from '../../file-storage/file-storage.service';

describe('ReferenceGeneratorService', () => {
  let service: ReferenceGeneratorService;
  let fileStorageService: jest.Mocked<FileStorageService>;

  beforeEach(async () => {
    const mockFileStorageService = {
      listFiles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceGeneratorService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<ReferenceGeneratorService>(ReferenceGeneratorService);
    fileStorageService = module.get(FileStorageService);
  });

  describe('generateClientRef', () => {
    it('should generate first reference for empty portfolio', async () => {
      fileStorageService.listFiles.mockResolvedValue([]);

      const result = await service.generateClientRef(1, 'Test Client');

      expect(result).toBe('1T001');
      expect(fileStorageService.listFiles).toHaveBeenCalledWith('clients', 1);
    });

    it('should generate next numeric reference in same alpha group', async () => {
      fileStorageService.listFiles.mockResolvedValue(['1A001', '1A002']);

      const result = await service.generateClientRef(1, 'Another Client');

      expect(result).toBe('1A003');
    });

    it('should move to next alpha group when numeric limit reached', async () => {
      const existingRefs = Array.from({ length: 999 }, (_, i) => `1A${(i + 1).toString().padStart(3, '0')}`);
      fileStorageService.listFiles.mockResolvedValue(existingRefs);

      const result = await service.generateClientRef(1, 'New Client');

      expect(result).toBe('1N001');
    });

    it('should handle multiple alpha groups', async () => {
      fileStorageService.listFiles.mockResolvedValue(['1A001', '1A002', '1B001', '1B002']);

      const result = await service.generateClientRef(1, 'Test Client');

      expect(result).toBe('1T001');
    });

    it('should work with different portfolio codes', async () => {
      fileStorageService.listFiles.mockResolvedValue([]);

      const result = await service.generateClientRef(5, 'Test Client');

      expect(result).toBe('5T001');
      expect(fileStorageService.listFiles).toHaveBeenCalledWith('clients', 5);
    });

    it('should handle portfolio code 10', async () => {
      fileStorageService.listFiles.mockResolvedValue([]);

      const result = await service.generateClientRef(10, 'Test Client');

      expect(result).toBe('10T001');
    });

    it('should sort references correctly', async () => {
      // Unsorted list to test sorting logic
      fileStorageService.listFiles.mockResolvedValue(['1A003', '1A001', '1B001', '1A002']);

      const result = await service.generateClientRef(1, 'Test Client');

      expect(result).toBe('1T001');
    });
  });

  describe('generatePersonRef', () => {
    it('should generate first person reference', async () => {
      fileStorageService.listFiles.mockResolvedValue([]);

      const result = await service.generatePersonRef();

      expect(result).toBe('P001');
      expect(fileStorageService.listFiles).toHaveBeenCalledWith('people');
    });

    it('should generate next person reference', async () => {
      fileStorageService.listFiles.mockResolvedValue(['P001', 'P002', 'P003']);

      const result = await service.generatePersonRef();

      expect(result).toBe('P004');
    });

    it('should handle gaps in person references', async () => {
      fileStorageService.listFiles.mockResolvedValue(['P001', 'P003', 'P005']);

      const result = await service.generatePersonRef();

      expect(result).toBe('P002');
    });

    it('should handle non-sequential person references', async () => {
      fileStorageService.listFiles.mockResolvedValue(['P010', 'P005', 'P001']);

      const result = await service.generatePersonRef();

      expect(result).toBe('P002');
    });
  });

  describe('generateSuffixLetter', () => {
    it('should generate first suffix letter', async () => {
      // Mock empty existing parties
      jest.spyOn(service as unknown as { getExistingClientParties: jest.Mock }, 'getExistingClientParties').mockResolvedValue([]);

      const result = await service.generateSuffixLetter('client_1', 'person_1');

      expect(result).toBe('A');
    });

    it('should generate next suffix letter', async () => {
      // Mock existing parties with suffix A
      jest.spyOn(service as unknown as { getExistingClientParties: jest.Mock }, 'getExistingClientParties').mockResolvedValue([
        { suffixLetter: 'A' }
      ]);

      const result = await service.generateSuffixLetter('client_1', 'person_1');

      expect(result).toBe('B');
    });

    it('should handle multiple existing suffix letters', async () => {
      jest.spyOn(service as unknown as { getExistingClientParties: jest.Mock }, 'getExistingClientParties').mockResolvedValue([
        { suffixLetter: 'A' },
        { suffixLetter: 'C' },
        { suffixLetter: 'B' }
      ]);

      const result = await service.generateSuffixLetter('client_1', 'person_1');

      expect(result).toBe('D');
    });

    it('should handle all letters used', async () => {
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => ({ suffixLetter: letter }));
      jest.spyOn(service as unknown as { getExistingClientParties: jest.Mock }, 'getExistingClientParties').mockResolvedValue(allLetters);

      const result = await service.generateSuffixLetter('client_1', 'person_1');

      expect(result).toBe('AA');
    });
  });

  describe('validateClientRef', () => {
    it('should validate correct client references', () => {
      expect(service.validateClientRef('1A001')).toBe(true);
      expect(service.validateClientRef('10Z999')).toBe(true);
      expect(service.validateClientRef('5B123')).toBe(true);
    });

    it('should reject invalid client references', () => {
      expect(service.validateClientRef('1A')).toBe(false);
      expect(service.validateClientRef('A001')).toBe(false);
      expect(service.validateClientRef('1A0001')).toBe(false);
      expect(service.validateClientRef('1a001')).toBe(false);
      expect(service.validateClientRef('11AA001')).toBe(false);
      expect(service.validateClientRef('')).toBe(false);
      expect(service.validateClientRef('invalid')).toBe(false);
    });
  });

  describe('validatePersonRef', () => {
    it('should validate correct person references', () => {
      expect(service.validatePersonRef('P001')).toBe(true);
      expect(service.validatePersonRef('P999')).toBe(true);
      expect(service.validatePersonRef('P123')).toBe(true);
    });

    it('should reject invalid person references', () => {
      expect(service.validatePersonRef('P1')).toBe(false);
      expect(service.validatePersonRef('P0001')).toBe(false);
      expect(service.validatePersonRef('p001')).toBe(false);
      expect(service.validatePersonRef('001')).toBe(false);
      expect(service.validatePersonRef('')).toBe(false);
      expect(service.validatePersonRef('invalid')).toBe(false);
    });
  });

  describe('extractPortfolioCode', () => {
    it('should extract portfolio code from valid references', () => {
      expect(service.extractPortfolioCode('1A001')).toBe(1);
      expect(service.extractPortfolioCode('10Z999')).toBe(10);
      expect(service.extractPortfolioCode('5B123')).toBe(5);
    });

    it('should return null for invalid references', () => {
      expect(service.extractPortfolioCode('invalid')).toBe(null);
      expect(service.extractPortfolioCode('1A')).toBe(null);
      expect(service.extractPortfolioCode('')).toBe(null);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle file storage errors gracefully', async () => {
      fileStorageService.listFiles.mockRejectedValue(new Error('Storage error'));

      await expect(service.generateClientRef(1, 'Test Client')).rejects.toThrow('Storage error');
    });

    it('should handle malformed existing references', async () => {
      // Mix of valid and invalid references
      fileStorageService.listFiles.mockResolvedValue(['1A001', 'invalid', '1A002', '', '1B001']);

      const result = await service.generateClientRef(1, 'Test Client');

      // Should ignore invalid references and work with valid ones
      expect(result).toBe('1T001');
    });

    it('should handle empty reference list for person generation', async () => {
      fileStorageService.listFiles.mockResolvedValue([]);

      const result = await service.generatePersonRef();

      expect(result).toBe('P001');
    });

    it('should handle malformed person references', async () => {
      fileStorageService.listFiles.mockResolvedValue(['P001', 'invalid', 'P003', '']);

      const result = await service.generatePersonRef();

      expect(result).toBe('P002');
    });
  });

  describe('deterministic behavior', () => {
    it('should generate same reference for same input conditions', async () => {
      fileStorageService.listFiles.mockResolvedValue(['1A001', '1A002']);

      const result1 = await service.generateClientRef(1, 'Test Client');
      const result2 = await service.generateClientRef(1, 'Test Client');

      expect(result1).toBe('1T001');
      expect(result2).toBe('1T001');
    });

    it('should be independent of client name', async () => {
      fileStorageService.listFiles.mockResolvedValue(['1A001']);

      const result1 = await service.generateClientRef(1, 'Short');
      const result2 = await service.generateClientRef(1, 'Very Long Client Name Ltd');

      expect(result1).toBe('1S001');
      expect(result2).toBe('1V001');
    });
  });
});
