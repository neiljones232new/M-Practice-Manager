import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
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
}