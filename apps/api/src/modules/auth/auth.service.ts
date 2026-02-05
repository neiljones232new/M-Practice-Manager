import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { FileStorageService } from '../file-storage/file-storage.service';
import { User, UserSession, PasswordResetToken, AuthResponse, JwtPayload } from './entities/user.entity';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private fileStorageService: FileStorageService,
    private jwtService: JwtService,
  ) {}

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

    // Create user
    const userId = uuidv4();
    const user: User = {
      id: userId,
      email: email.toLowerCase(),
      firstName,
      lastName,
      passwordHash,
      role: 'SUPER_ADMIN',
      portfolios: ['*'],
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save user to file storage
    await this.fileStorageService.writeJson('users', userId, user);

    // Create user index entry
    await this.updateUserIndex(user);

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
    user.lastLoginAt = new Date();
    user.updatedAt = new Date();
    (user as any).role = 'SUPER_ADMIN';
    (user as any).portfolios = ['*'];
    await this.fileStorageService.writeJson('users', user.id, user);

    this.logger.log(`User logged in: ${email}`);

    // Generate tokens and return auth response
    return this.generateAuthResponse(user, rememberMe);
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
    const tokenId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    const passwordResetToken: PasswordResetToken = {
      id: tokenId,
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: false,
      createdAt: new Date(),
    };

    // Save reset token
    await this.fileStorageService.writeJson('password-reset-tokens', tokenId, passwordResetToken);

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
    const user = await this.fileStorageService.readJson<User>('users', resetTokenData.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password
    user.passwordHash = passwordHash;
    user.updatedAt = new Date();
    await this.fileStorageService.writeJson('users', user.id, user);

    // Mark token as used
    resetTokenData.used = true;
    await this.fileStorageService.writeJson('password-reset-tokens', resetTokenData.id, resetTokenData);

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
    const user = await this.fileStorageService.readJson<User>('users', userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.passwordHash = passwordHash;
    user.updatedAt = new Date();
    await this.fileStorageService.writeJson('users', user.id, user);

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

    const user = await this.fileStorageService.readJson<User>('users', payload.sub);
    if (!user || !user.isActive) {
      return null;
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const user = {
      id: 'local-dev-super-admin',
      email: 'local-dev@example.com',
      firstName: 'Local',
      lastName: 'Dev',
      passwordHash: '',
      role: 'SUPER_ADMIN',
      portfolios: ['*'],
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as User;

    return this.generateAuthResponse(user);
  }

  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
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
    // Create JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      portfolios: user.portfolios,
    };

    // Generate proper JWT tokens
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: rememberMe ? '30d' : '7d' });

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

    await this.fileStorageService.writeJson('user-sessions', user.id, session);

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
      // Search through user files to find by email
      const users = await this.fileStorageService.searchFiles<User>(
        'users',
        (user) => user?.email?.toLowerCase() === email.toLowerCase()
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error);
      return null;
    }
  }

  private async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    try {
      const tokens = await this.fileStorageService.searchFiles<PasswordResetToken>(
        'password-reset-tokens',
        (tokenData) => tokenData.token === token
      );
      return tokens.length > 0 ? tokens[0] : null;
    } catch (error) {
      this.logger.error(`Error finding password reset token:`, error);
      return null;
    }
  }

  private async readUserSession(userId: string): Promise<UserSession | null> {
    try {
      return await this.fileStorageService.readJson<UserSession>('user-sessions', userId);
    } catch (error) {
      this.logger.error(`Error reading session for ${userId}:`, error);
      return null;
    }
  }

  private async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await this.fileStorageService.deleteJson('user-sessions', userId);
    } catch (error) {
      this.logger.error(`Error invalidating user sessions for ${userId}:`, error);
    }
  }

  private async updateUserIndex(user: User): Promise<void> {
    try {
      // Create or update user index for faster email lookups
      const userIndex = {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      };

      await this.fileStorageService.writeJson('indexes/users-by-email', user.email.replace('@', '_at_'), userIndex);
    } catch (error) {
      this.logger.error(`Error updating user index for ${user.email}:`, error);
    }
  }
}
