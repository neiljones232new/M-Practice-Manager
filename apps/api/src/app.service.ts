import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
      message: 'MDJ Practice Manager API is running',
      timestamp: new Date().toISOString(),
    };
  }

  getStatus() {
    return {
      application: 'MDJ Practice Manager API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return {
        status: 'not_ready',
        database: 'disconnected',
        reason: message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
