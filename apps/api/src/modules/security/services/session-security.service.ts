import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';

export interface SecureSession {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  refreshToken?: string;
  metadata?: Record<string, any>;
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: SecureSession;
  reason?: string;
}

@Injectable()
export class SessionSecurityService {
  private readonly logger = new Logger(SessionSecurityService.name);
  private readonly sessionsPath = 'security/sessions.json';
  private readonly blacklistPath = 'security/token-blacklist.json';
  private readonly maxSessionsPerUser = 5;
  private readonly sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private readonly refreshTokenTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly configService: ConfigService,
    private readonly fileStorage: FileStorageService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Create a new secure session
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<SecureSession> {
    try {
      const sessionId = this.generateSessionId();
      const refreshToken = this.encryption.generateSecureToken(64);
      const now = new Date();
      
      const session: SecureSession = {
        sessionId,
        userId,
        createdAt: now,
        lastAccessedAt: now,
        expiresAt: new Date(now.getTime() + this.sessionTimeout),
        ipAddress,
        userAgent,
        isActive: true,
        refreshToken: this.encryption.hash(refreshToken),
        metadata,
      };

      // Clean up old sessions for this user
      await this.cleanupUserSessions(userId);

      // Store the session
      await this.storeSession(session);

      this.logger.log(`Session created for user ${userId}: ${sessionId}`);

      // Return session with plain refresh token (only time it's available)
      return {
        ...session,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Failed to create session:', error);
      throw new Error('Failed to create secure session');
    }
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId: string, ipAddress?: string): Promise<SessionValidationResult> {
    try {
      const sessions = await this.getSessions();
      const session = sessions[sessionId];

      if (!session) {
        return { isValid: false, reason: 'Session not found' };
      }

      if (!session.isActive) {
        return { isValid: false, reason: 'Session is inactive' };
      }

      if (new Date() > new Date(session.expiresAt)) {
        await this.invalidateSession(sessionId);
        return { isValid: false, reason: 'Session expired' };
      }

      // Optional IP validation (can be disabled for mobile users)
      const enforceIpValidation = this.configService.get<boolean>('ENFORCE_IP_VALIDATION', false);
      if (enforceIpValidation && ipAddress && session.ipAddress !== ipAddress) {
        await this.invalidateSession(sessionId);
        return { isValid: false, reason: 'IP address mismatch' };
      }

      // Update last accessed time
      session.lastAccessedAt = new Date();
      await this.updateSession(session);

      return { isValid: true, session };
    } catch (error) {
      this.logger.error('Session validation failed:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * Refresh a session using refresh token
   */
  async refreshSession(sessionId: string, refreshToken: string): Promise<SecureSession | null> {
    try {
      const sessions = await this.getSessions();
      const session = sessions[sessionId];

      if (!session || !session.refreshToken) {
        return null;
      }

      if (!this.encryption.verifyHash(refreshToken, session.refreshToken)) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Check if refresh token is expired
      const refreshExpiry = new Date(session.createdAt.getTime() + this.refreshTokenTimeout);
      if (new Date() > refreshExpiry) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Create new session with extended expiry
      const now = new Date();
      const newRefreshToken = this.encryption.generateSecureToken(64);
      
      session.lastAccessedAt = now;
      session.expiresAt = new Date(now.getTime() + this.sessionTimeout);
      session.refreshToken = this.encryption.hash(newRefreshToken);

      await this.updateSession(session);

      this.logger.log(`Session refreshed for user ${session.userId}: ${sessionId}`);

      return {
        ...session,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error('Session refresh failed:', error);
      return null;
    }
  }

  /**
   * Invalidate a session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const session = sessions[sessionId];

      if (session) {
        session.isActive = false;
        await this.updateSession(session);
        
        // Add to blacklist
        await this.addToBlacklist(sessionId);
        
        this.logger.log(`Session invalidated: ${sessionId}`);
      }
    } catch (error) {
      this.logger.error('Failed to invalidate session:', error);
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const userSessions = Object.values(sessions).filter(s => s.userId === userId);

      for (const session of userSessions) {
        session.isActive = false;
        await this.updateSession(session);
        await this.addToBlacklist(session.sessionId);
      }

      this.logger.log(`All sessions invalidated for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to invalidate user sessions:', error);
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SecureSession[]> {
    try {
      const sessions = await this.getSessions();
      return Object.values(sessions)
        .filter(s => s.userId === userId && s.isActive)
        .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());
    } catch (error) {
      this.logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklist = await this.getBlacklist();
      return blacklist.includes(token);
    } catch (error) {
      this.logger.error('Failed to check token blacklist:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const now = new Date();
      let cleanedCount = 0;

      for (const [sessionId, session] of Object.entries(sessions)) {
        if (new Date(session.expiresAt) < now) {
          delete sessions[sessionId];
          await this.addToBlacklist(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.fileStorage.writeFile(this.sessionsPath, sessions);
        this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
      }

      // Also cleanup old blacklist entries
      await this.cleanupBlacklist();
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async getSessions(): Promise<Record<string, SecureSession>> {
    try {
      return await this.fileStorage.readFile(this.sessionsPath) || {};
    } catch (error) {
      return {};
    }
  }

  private async storeSession(session: SecureSession): Promise<void> {
    const sessions = await this.getSessions();
    sessions[session.sessionId] = session;
    await this.fileStorage.writeFile(this.sessionsPath, sessions);
  }

  private async updateSession(session: SecureSession): Promise<void> {
    const sessions = await this.getSessions();
    sessions[session.sessionId] = session;
    await this.fileStorage.writeFile(this.sessionsPath, sessions);
  }

  private async cleanupUserSessions(userId: string): Promise<void> {
    const sessions = await this.getSessions();
    const userSessions = Object.values(sessions)
      .filter(s => s.userId === userId && s.isActive)
      .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());

    // Keep only the most recent sessions
    if (userSessions.length >= this.maxSessionsPerUser) {
      const sessionsToRemove = userSessions.slice(this.maxSessionsPerUser - 1);
      for (const session of sessionsToRemove) {
        await this.invalidateSession(session.sessionId);
      }
    }
  }

  private async getBlacklist(): Promise<string[]> {
    try {
      return await this.fileStorage.readFile(this.blacklistPath) || [];
    } catch (error) {
      return [];
    }
  }

  private async addToBlacklist(token: string): Promise<void> {
    const blacklist = await this.getBlacklist();
    if (!blacklist.includes(token)) {
      blacklist.push(token);
      await this.fileStorage.writeFile(this.blacklistPath, blacklist);
    }
  }

  private async cleanupBlacklist(): Promise<void> {
    try {
      const blacklist = await this.getBlacklist();
      const cutoffDate = new Date(Date.now() - this.refreshTokenTimeout);
      
      // For simplicity, we'll keep the blacklist for the refresh token timeout period
      // In a production system, you might want to store timestamps with blacklisted tokens
      
      // For now, just limit the blacklist size
      if (blacklist.length > 10000) {
        const trimmedBlacklist = blacklist.slice(-5000); // Keep last 5000 entries
        await this.fileStorage.writeFile(this.blacklistPath, trimmedBlacklist);
        this.logger.log('Trimmed blacklist to prevent excessive growth');
      }
    } catch (error) {
      this.logger.error('Failed to cleanup blacklist:', error);
    }
  }
}