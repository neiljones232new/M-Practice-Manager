import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionSecurityService } from './session-security.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { EncryptionService } from './encryption.service';

describe('SessionSecurityService', () => {
  let service: SessionSecurityService;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockFileStorageService = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    };

    const mockEncryptionService = {
      generateSecureToken: jest.fn(),
      hash: jest.fn(),
      verifyHash: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionSecurityService,
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SessionSecurityService>(SessionSecurityService);
    fileStorageService = module.get(FileStorageService);
    encryptionService = module.get(EncryptionService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const mockRefreshToken = 'mock-refresh-token';
      const mockHashedToken = 'hashed-token';

      fileStorageService.readFile.mockResolvedValue({});
      fileStorageService.writeFile.mockResolvedValue(undefined);
      encryptionService.generateSecureToken.mockReturnValue(mockRefreshToken);
      encryptionService.hash.mockReturnValue(mockHashedToken);

      const session = await service.createSession(
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
        { loginMethod: 'password' }
      );

      expect(session.userId).toBe('user123');
      expect(session.ipAddress).toBe('192.168.1.1');
      expect(session.userAgent).toBe('Mozilla/5.0');
      expect(session.isActive).toBe(true);
      expect(session.refreshToken).toBe(mockRefreshToken);
      expect(session.metadata).toEqual({ loginMethod: 'password' });
      expect(fileStorageService.writeFile).toHaveBeenCalled();
    });

    it('should cleanup old sessions when creating new one', async () => {
      const existingSessions = {
        'session1': { userId: 'user123', isActive: true, lastAccessedAt: new Date('2024-01-01') },
        'session2': { userId: 'user123', isActive: true, lastAccessedAt: new Date('2024-01-02') },
        'session3': { userId: 'user123', isActive: true, lastAccessedAt: new Date('2024-01-03') },
        'session4': { userId: 'user123', isActive: true, lastAccessedAt: new Date('2024-01-04') },
        'session5': { userId: 'user123', isActive: true, lastAccessedAt: new Date('2024-01-05') },
      };

      fileStorageService.readFile
        .mockResolvedValueOnce(existingSessions) // getSessions call
        .mockResolvedValueOnce(existingSessions) // cleanupUserSessions call
        .mockResolvedValue([]); // blacklist calls

      fileStorageService.writeFile.mockResolvedValue(undefined);
      encryptionService.generateSecureToken.mockReturnValue('token');
      encryptionService.hash.mockReturnValue('hashed');

      await service.createSession('user123', '192.168.1.1', 'Mozilla/5.0');

      expect(fileStorageService.writeFile).toHaveBeenCalledTimes(3); // sessions + blacklist + new session
    });
  });

  describe('validateSession', () => {
    it('should validate active session successfully', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        ipAddress: '192.168.1.1',
        lastAccessedAt: new Date(),
      };

      fileStorageService.readFile.mockResolvedValue({
        'session123': mockSession,
      });
      fileStorageService.writeFile.mockResolvedValue(undefined);

      const result = await service.validateSession('session123', '192.168.1.1');

      expect(result.isValid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.userId).toBe('user123');
    });

    it('should reject expired session', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        isActive: true,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        ipAddress: '192.168.1.1',
      };

      fileStorageService.readFile.mockResolvedValue({
        'session123': mockSession,
      });
      fileStorageService.writeFile.mockResolvedValue(undefined);

      const result = await service.validateSession('session123');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });

    it('should reject inactive session', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        isActive: false,
        expiresAt: new Date(Date.now() + 3600000),
        ipAddress: '192.168.1.1',
      };

      fileStorageService.readFile.mockResolvedValue({
        'session123': mockSession,
      });

      const result = await service.validateSession('session123');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session is inactive');
    });

    it('should reject non-existent session', async () => {
      fileStorageService.readFile.mockResolvedValue({});

      const result = await service.validateSession('nonexistent');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session not found');
    });

    it('should reject session with IP mismatch when enforcement is enabled', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000),
        ipAddress: '192.168.1.1',
      };

      fileStorageService.readFile.mockResolvedValue({
        'session123': mockSession,
      });
      fileStorageService.writeFile.mockResolvedValue(undefined);
      configService.get.mockReturnValue(true); // ENFORCE_IP_VALIDATION = true

      const result = await service.validateSession('session123', '192.168.1.2');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('IP address mismatch');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session with valid refresh token', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        isActive: true,
        createdAt: new Date(),
        refreshToken: 'hashed-token',
      };

      fileStorageService.readFile.mockResolvedValue({
        'session123': mockSession,
      });
      fileStorageService.writeFile.mockResolvedValue(undefined);
      encryptionService.verifyHash.mockReturnValue(true);
      encryptionService.generateSecureToken.mockReturnValue('new-token');
      encryptionService.hash.mockReturnValue('new-hashed-token');

      const refreshedSession = await service.refreshSession('session123', 'refresh-token');

      expect(refreshedSession).toBeDefined();
      expect(refreshedSession?.refreshToken).toBe('new-token');
      expect(fileStorageService.writeFile).toHaveBeenCalled();
    });

    it('should reject refresh with invalid token', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        refreshToken: 'hashed-token',
      };

      fileStorageService.readFile.mockResolvedValue({
        'session123': mockSession,
      });
      fileStorageService.writeFile.mockResolvedValue(undefined);
      encryptionService.verifyHash.mockReturnValue(false);

      const result = await service.refreshSession('session123', 'wrong-token');

      expect(result).toBeNull();
    });

    it('should reject refresh for expired refresh token', async () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        createdAt: oldDate,
        refreshToken: 'hashed-token',
      };

      fileStorageService.readFile.mockResolvedValue({
        'session123': mockSession,
      });
      fileStorageService.writeFile.mockResolvedValue(undefined);
      encryptionService.verifyHash.mockReturnValue(true);

      const result = await service.refreshSession('session123', 'refresh-token');

      expect(result).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session successfully', async () => {
      const mockSession = {
        sessionId: 'session123',
        userId: 'user123',
        isActive: true,
      };

      fileStorageService.readFile
        .mockResolvedValueOnce({ 'session123': mockSession }) // getSessions
        .mockResolvedValueOnce([]); // getBlacklist
      fileStorageService.writeFile.mockResolvedValue(undefined);

      await service.invalidateSession('session123');

      expect(fileStorageService.writeFile).toHaveBeenCalledTimes(2); // session + blacklist
    });
  });

  describe('getUserSessions', () => {
    it('should return active sessions for user', async () => {
      const mockSessions = {
        'session1': {
          sessionId: 'session1',
          userId: 'user123',
          isActive: true,
          lastAccessedAt: new Date('2024-01-02'),
        },
        'session2': {
          sessionId: 'session2',
          userId: 'user123',
          isActive: false,
          lastAccessedAt: new Date('2024-01-01'),
        },
        'session3': {
          sessionId: 'session3',
          userId: 'user456',
          isActive: true,
          lastAccessedAt: new Date('2024-01-03'),
        },
      };

      fileStorageService.readFile.mockResolvedValue(mockSessions);

      const sessions = await service.getUserSessions('user123');

      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe('session1');
      expect(sessions[0].isActive).toBe(true);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      fileStorageService.readFile.mockResolvedValue(['token1', 'token2', 'token3']);

      const result = await service.isTokenBlacklisted('token2');

      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      fileStorageService.readFile.mockResolvedValue(['token1', 'token2', 'token3']);

      const result = await service.isTokenBlacklisted('token4');

      expect(result).toBe(false);
    });

    it('should handle empty blacklist', async () => {
      fileStorageService.readFile.mockResolvedValue([]);

      const result = await service.isTokenBlacklisted('token1');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', async () => {
      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
      const validDate = new Date(Date.now() + 3600000); // 1 hour from now

      const mockSessions = {
        'expired1': {
          sessionId: 'expired1',
          expiresAt: expiredDate,
        },
        'expired2': {
          sessionId: 'expired2',
          expiresAt: expiredDate,
        },
        'valid1': {
          sessionId: 'valid1',
          expiresAt: validDate,
        },
      };

      fileStorageService.readFile
        .mockResolvedValueOnce(mockSessions) // getSessions
        .mockResolvedValue([]); // getBlacklist calls
      fileStorageService.writeFile.mockResolvedValue(undefined);

      await service.cleanupExpiredSessions();

      expect(fileStorageService.writeFile).toHaveBeenCalledWith(
        'security/sessions.json',
        { 'valid1': mockSessions.valid1 }
      );
    });
  });
});