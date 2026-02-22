import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserSession, PasswordResetToken, AuthResponse, JwtPayload } from './entities/user.entity';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';
import { FileStorageService } from '../file-storage/file-storage.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  private splitName(fullName?: string | null): { firstName: string; lastName: string } {
    const trimmed = String(fullName || '').trim();
    if (!trimmed) return { firstName: 'User', lastName: '' };
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private mapDbRoleToAuthRole(role?: string): User['role'] {
    if (role === 'ADMIN') return 'SUPER_ADMIN';
    if (role === 'MANAGER') return 'MANAGER';
    if (role === 'READONLY') return 'READ_ONLY';
    return 'STAFF';
  }

  private mapAuthRoleToDbRole(role?: User['role']): 'ADMIN' | 'MANAGER' | 'STAFF' | 'READONLY' {
    if (role === 'SUPER_ADMIN') return 'ADMIN';
    if (role === 'MANAGER') return 'MANAGER';
    if (role === 'READ_ONLY') return 'READONLY';
    return 'STAFF';
  }

  private toAuthUser(user: any, credential?: any): User {
    const { firstName, lastName } = this.splitName(user?.name);
    return {
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      passwordHash: credential?.passwordHash || '',
      role: this.mapDbRoleToAuthRole(user.role),
      portfolios: ['*'],
      isActive: Boolean(user.isActive),
      emailVerified: Boolean(credential?.emailVerified),
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { firstName, lastName, email, password, confirmPassword, agreeToTerms } = registerDto;

    // Validate passwords match
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate terms agreement
    if (!agreeToTerms) {
      throw new BadRequestException('You must agree to the terms and conditions');
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const normalizedEmail = email.toLowerCase();
    const userId = uuidv4();
    let user: User;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const dbUser = await (tx as any).user.create({
          data: {
            id: userId,
            email: normalizedEmail,
            name: `${firstName} ${lastName}`.trim(),
            role: 'ADMIN',
            isActive: true,
          },
        });
        const authCredential = await (tx as any).authCredential.create({
          data: {
            userId: dbUser.id,
            passwordHash,
            emailVerified: false,
          },
        });
        return { dbUser, authCredential };
      });
      user = this.toAuthUser(created.dbUser, created.authCredential);
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) {
        throw error;
      }

      this.logger.warn(`Database unavailable during register for ${normalizedEmail}; falling back to file storage`);
      const now = new Date();
      user = {
        id: userId,
        email: normalizedEmail,
        firstName,
        lastName,
        passwordHash,
        role: 'SUPER_ADMIN',
        portfolios: ['*'],
        isActive: true,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      };
      await this.fileStorageService.writeJson('users', user.id, user);
    }

    this.logger.log(`User registered: ${email}`);

    // Generate tokens and return auth response
    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password, rememberMe = false } = loginDto;

    // Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let freshUser = user;
    try {
      const updatedDbUser = await (this.prisma as any).user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { authCredential: true },
      });
      freshUser = this.toAuthUser(updatedDbUser, updatedDbUser.authCredential);
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn('Database unavailable during login; continuing in offline auth mode');
      } else if (this.isPrismaRecordMissingError(error)) {
        this.logger.warn(`User ${user.email} not found in database during login; syncing from file storage`);
        freshUser = await this.ensureUserPersisted(user);
      } else {
        throw error;
      }
    }

    this.logger.log(`User logged in: ${email}`);

    // Generate tokens and return auth response
    return this.generateAuthResponse(freshUser, rememberMe);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.findUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return { message: 'If an account with that email exists, we have sent a password reset link.' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await (this.prisma as any).authPasswordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
        used: false,
      },
    });

    // TODO: Send email with reset link
    // For now, just log the token (in production, this would be sent via email)
    this.logger.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If an account with that email exists, we have sent a password reset link.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password, confirmPassword } = resetPasswordDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Find reset token
    const resetTokenData = await this.findPasswordResetToken(token);
    if (!resetTokenData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (new Date() > resetTokenData.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Check if token is already used
    if (resetTokenData.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Find user
    const user = await (this.prisma as any).user.findUnique({
      where: { id: resetTokenData.userId },
      include: { authCredential: true },
    });
    if (!user || !user.authCredential) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password
    await (this.prisma as any).authCredential.update({
      where: { userId: user.id },
      data: { passwordHash },
    });

    // Mark token as used
    await (this.prisma as any).authPasswordResetToken.update({
      where: { id: resetTokenData.id },
      data: { used: true },
    });

    // Invalidate all user sessions
    await this.invalidateAllUserSessions(user.id);

    this.logger.log(`Password reset for user: ${user.email}`);

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Find user
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: { authCredential: true },
    });
    if (!user || !user.authCredential) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.authCredential.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await (this.prisma as any).authCredential.update({
      where: { userId: user.id },
      data: { passwordHash },
    });

    // Invalidate all other user sessions (keep current session)
    await this.invalidateAllUserSessions(user.id);

    this.logger.log(`Password changed for user: ${user.email}`);

    return { message: 'Password has been changed successfully' };
  }

  async validateUser(payload: JwtPayload): Promise<Omit<User, 'passwordHash'> | null> {
    // Handle demo user specially (not stored in file system)
    if (payload.sub === 'demo-user') {
      return {
        id: 'demo-user',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'MANAGER',
        portfolios: [1, 2],
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const user = await (this.prisma as any).user.findUnique({
      where: { id: payload.sub },
      include: { authCredential: true },
    });
    if (!user || !user.isActive) {
      return null;
    }

    const authUser = this.toAuthUser(user, user.authCredential);
    const { passwordHash, ...userWithoutPassword } = authUser;
    return userWithoutPassword;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const session = await (this.prisma as any).authSession.findUnique({
      where: { refreshToken },
      include: { user: { include: { authCredential: true } } },
    });
    if (!session || !session.user || !session.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (new Date() > new Date(session.expiresAt)) {
      throw new UnauthorizedException('Refresh token expired');
    }
    const user = this.toAuthUser(session.user, session.user.authCredential);
    return this.generateAuthResponse(user, session.rememberMe);
  }

  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      await (this.prisma as any).authSession.deleteMany({ where: { userId, refreshToken } });
    } else {
      await (this.prisma as any).authSession.deleteMany({ where: { userId } });
    }
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async getDemoUser(): Promise<AuthResponse> {
    // Create a demo user object (not persisted to storage)
    const demoUser: User = {
      id: 'demo-user',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      passwordHash: '', // Not needed for demo
      role: 'SUPER_ADMIN',
      portfolios: ['*'],
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log('Demo user session created');
    return this.generateAuthResponse(demoUser);
  }

  private async generateAuthResponse(user: User, rememberMe = false): Promise<AuthResponse> {
    let authUser: User = {
      ...user,
      role: 'SUPER_ADMIN',
      portfolios: ['*'],
    };
    authUser = await this.ensureUserPersisted(authUser);

    const accessToken = `local-dev-access-${uuidv4()}`;
    const refreshToken = `local-dev-refresh-${uuidv4()}`;

    // Keep creating a session record for compatibility, but do not rely on JWT.
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    const session: UserSession = {
      id: sessionId,
      userId: authUser.id,
      token: accessToken,
      refreshToken,
      expiresAt,
      rememberMe,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    try {
      await (this.prisma as any).authSession.create({
        data: {
          id: session.id,
          userId: authUser.id,
          token: session.token,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          rememberMe: session.rememberMe,
          lastUsedAt: session.lastUsedAt,
        },
      });
    } catch (error) {
      if (this.isRecoverableSessionPersistenceError(error)) {
        this.logger.warn('Database unavailable while creating auth session; token issued without persisted session');
      } else {
        throw error;
      }
    }

    const { passwordHash, ...userWithoutPassword } = authUser;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
    };
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = String(email || '').toLowerCase();
    try {
      const user = await (this.prisma as any).user.findFirst({
        where: { email: normalizedEmail },
        include: { authCredential: true },
      });
      if (!user) {
        return this.findUserByEmailFromStorage(normalizedEmail);
      }
      return this.toAuthUser(user, user.authCredential);
    } catch (error) {
      if (this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Database unavailable while looking up ${normalizedEmail}; trying file storage`);
        return this.findUserByEmailFromStorage(normalizedEmail);
      }
      this.logger.error(`Error finding user by email ${normalizedEmail}:`, error);
      return this.findUserByEmailFromStorage(normalizedEmail);
    }
  }

  private isDatabaseUnavailableError(error: unknown): boolean {
    const message = String((error as any)?.message || error || '').toLowerCase();
    return (
      message.includes("can't reach database server")
      || message.includes('prismaclientinitializationerror')
      || message.includes('connection refused')
      || message.includes('timed out')
      || message.includes('database connection failed')
      || message.includes('denied access on the database')
      || message.includes('authentication failed')
      || message.includes('p1010')
    );
  }

  private isPrismaRecordMissingError(error: unknown): boolean {
    const message = String((error as any)?.message || error || '').toLowerCase();
    return message.includes('record to update not found') || message.includes('p2025');
  }

  private isForeignKeyConstraintError(error: unknown): boolean {
    const message = String((error as any)?.message || error || '').toLowerCase();
    return message.includes('foreign key constraint violated') || message.includes('p2003');
  }

  private isRecoverableSessionPersistenceError(error: unknown): boolean {
    return this.isDatabaseUnavailableError(error) || this.isForeignKeyConstraintError(error);
  }

  private async ensureUserPersisted(user: User): Promise<User> {
    const normalizedEmail = String(user.email || '').trim().toLowerCase();
    if (!normalizedEmail) return user;

    try {
      let dbUser = await (this.prisma as any).user.findUnique({
        where: { id: user.id },
        include: { authCredential: true },
      });

      if (!dbUser) {
        dbUser = await (this.prisma as any).user.findFirst({
          where: { email: normalizedEmail },
          include: { authCredential: true },
        });
      }

      if (!dbUser) {
        try {
          dbUser = await (this.prisma as any).user.create({
            data: {
              id: user.id,
              email: normalizedEmail,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
              role: this.mapAuthRoleToDbRole(user.role),
              isActive: user.isActive !== false,
              lastLoginAt: user.lastLoginAt || null,
            },
            include: { authCredential: true },
          });
        } catch (createError) {
          // Handle race/uniqueness on email by loading the existing row.
          dbUser = await (this.prisma as any).user.findFirst({
            where: { email: normalizedEmail },
            include: { authCredential: true },
          });
          if (!dbUser) throw createError;
        }
      }

      if (user.passwordHash) {
        if (dbUser.authCredential) {
          if (!dbUser.authCredential.passwordHash) {
            await (this.prisma as any).authCredential.update({
              where: { userId: dbUser.id },
              data: {
                passwordHash: user.passwordHash,
                emailVerified: user.emailVerified !== false,
              },
            });
          }
        } else {
          await (this.prisma as any).authCredential.create({
            data: {
              userId: dbUser.id,
              passwordHash: user.passwordHash,
              emailVerified: user.emailVerified !== false,
            },
          });
        }
      }

      const refreshed = await (this.prisma as any).user.findUnique({
        where: { id: dbUser.id },
        include: { authCredential: true },
      });
      if (!refreshed) return user;
      return this.toAuthUser(refreshed, refreshed.authCredential);
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) {
        this.logger.warn(`Failed to persist auth user ${normalizedEmail}; using in-memory auth user`);
      }
      return user;
    }
  }

  private mapStoredUserToAuthUser(record: any): User | null {
    if (!record || typeof record !== 'object') return null;
    const role = String(record.role || '').toUpperCase();
    const safeRole: User['role'] = (
      role === 'ADMIN'
      || role === 'MANAGER'
      || role === 'STAFF'
      || role === 'READ_ONLY'
      || role === 'SUPER_ADMIN'
    ) ? (role as User['role']) : 'STAFF';

    const email = String(record.email || '').trim().toLowerCase();
    if (!email) return null;
    const passwordHash = String(record.passwordHash || '').trim();
    if (!passwordHash) return null;

    const createdAt = record.createdAt ? new Date(record.createdAt) : new Date();
    const updatedAt = record.updatedAt ? new Date(record.updatedAt) : createdAt;
    return {
      id: String(record.id || ''),
      email,
      firstName: String(record.firstName || 'User'),
      lastName: String(record.lastName || ''),
      passwordHash,
      role: safeRole,
      portfolios: Array.isArray(record.portfolios) && record.portfolios.length ? record.portfolios : ['*'],
      isActive: record.isActive !== false,
      emailVerified: record.emailVerified !== false,
      lastLoginAt: record.lastLoginAt ? new Date(record.lastLoginAt) : undefined,
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
    };
  }

  private async findUserByEmailFromStorage(email: string): Promise<User | null> {
    try {
      const ids = await this.fileStorageService.listFiles('users');
      for (const id of ids) {
        const record = await this.fileStorageService.readJson<any>('users', id);
        const user = this.mapStoredUserToAuthUser(record);
        if (user && user.email.toLowerCase() === email.toLowerCase()) {
          return user;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed file-storage user lookup for ${email}`);
    }
    return null;
  }

  private async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    try {
      const tokenData = await (this.prisma as any).authPasswordResetToken.findFirst({
        where: { token },
      });
      if (!tokenData) return null;
      return {
        id: tokenData.id,
        userId: tokenData.userId,
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
        used: tokenData.used,
        createdAt: tokenData.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error finding password reset token:`, error);
      return null;
    }
  }

  private async readUserSession(userId: string): Promise<UserSession | null> {
    try {
      const session = await (this.prisma as any).authSession.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (!session) return null;
      return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        rememberMe: session.rememberMe,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
      };
    } catch (error) {
      this.logger.error(`Error reading session for ${userId}:`, error);
      return null;
    }
  }

  private async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await (this.prisma as any).authSession.deleteMany({ where: { userId } });
    } catch (error) {
      this.logger.error(`Error invalidating user sessions for ${userId}:`, error);
    }
  }
}
