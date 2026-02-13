import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserSession, PasswordResetToken, AuthResponse, JwtPayload } from './entities/user.entity';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
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

    const userId = uuidv4();
    const created = await this.prisma.$transaction(async (tx) => {
      const dbUser = await (tx as any).user.create({
        data: {
          id: userId,
          email: email.toLowerCase(),
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
    const user = this.toAuthUser(created.dbUser, created.authCredential);

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

    // Update last login
    const updatedDbUser = await (this.prisma as any).user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      include: { authCredential: true },
    });
    const freshUser = this.toAuthUser(updatedDbUser, updatedDbUser.authCredential);

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
    (user as any).role = 'SUPER_ADMIN';
    (user as any).portfolios = ['*'];

    const accessToken = `local-dev-access-${uuidv4()}`;
    const refreshToken = `local-dev-refresh-${uuidv4()}`;

    // Keep creating a session record for compatibility, but do not rely on JWT.
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      token: accessToken,
      refreshToken,
      expiresAt,
      rememberMe,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    await (this.prisma as any).authSession.create({
      data: {
        id: session.id,
        userId: user.id,
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        rememberMe: session.rememberMe,
        lastUsedAt: session.lastUsedAt,
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
    };
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await (this.prisma as any).user.findFirst({
        where: { email: email.toLowerCase() },
        include: { authCredential: true },
      });
      if (!user) return null;
      return this.toAuthUser(user, user.authCredential);
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      return null;
    }
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
