export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'READ_ONLY';
  portfolios: number[];
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  rememberMe: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  portfolios: number[];
  iat?: number;
  exp?: number;
}