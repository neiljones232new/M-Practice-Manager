import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
    const url = process.env.DATABASE_URL || '';
    if (url.startsWith('prisma+postgres')) {
      return this.$extends(withAccelerate()) as this;
    }
    return this;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to database');
    } catch (error) {
      this.logger.warn('Database connection failed - using file-based storage only');
      this.logger.warn('Ensure DATABASE_URL is set and reachable to enable database features.');
      // Don't throw error - allow app to run with file-based storage
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
