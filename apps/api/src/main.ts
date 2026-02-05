import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as bcrypt from 'bcryptjs';
import { FileStorageService } from './modules/file-storage/file-storage.service';
import { User } from './modules/auth/entities/user.entity';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log(`ENV LOADED FROM: ${process.cwd()}`);
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  try {
    const fileStorageService = app.get(FileStorageService);
    const existing = await fileStorageService.readJson<User>('users', 'local-dev-super-admin');
    if (!existing && process.env.NODE_ENV === 'development') {
      const defaultPassword = process.env.DEFAULT_DEV_PASSWORD || 'change-me-in-production';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      const user: User = {
        id: 'local-dev-super-admin',
        email: process.env.DEFAULT_DEV_EMAIL || 'dev@example.com',
        firstName: 'Development',
        lastName: 'User',
        passwordHash,
        role: 'SUPER_ADMIN',
        portfolios: ['*'],
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await fileStorageService.writeJson('users', user.id, user);
      logger.log('Created development user - please change the default password');
    }
  } catch (error) {
    logger.warn('Failed to initialize local dev user');
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // Strict validation - reject extra properties
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    ],
    credentials: true,
  });

  // API prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('M Practice Manager API')
    .setDescription('Modern client CRM for professional practices with AI-powered assistance')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer(`http://localhost:${configService.get<number>('PORT', 3001)}`)
    .addServer(`http://127.0.0.1:${configService.get<number>('PORT', 3001)}`)
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Clients', 'Client management with Companies House integration')
    .addTag('Companies House', 'Companies House API integration')
    .addTag('Tax Calculations', 'M Powered™ Tax Engine for salary optimization')
    .addTag('Services', 'Service and fee management')
    .addTag('Tasks', 'Task and deadline management')
    .addTag('Documents', 'Document management and storage')
    .addTag('Reports', 'Report generation and templates')
    .addTag('Calendar', 'Calendar and event management')
    .addTag('Compliance', 'Compliance tracking and monitoring')
    .addTag('Templates', 'Template management')
    .addTag('Audit', 'Audit logging and file system management')
    .addTag('Portfolios', 'Portfolio management')
    .addTag('Dashboard', 'Dashboard metrics and summaries')
    .addTag('Integrations', 'External integration configuration and health')
    .addTag('People', 'People records')
    .addTag('Letters', 'Letter generation and management')
    .addTag('Accounts Production', 'Accounts production workflows')
    .addTag('User Management', 'User roles and permissions')
    .addTag('M Assist', 'Assistant and automation endpoints')
    .addTag('Performance', 'File system performance and cleanup tools')
    .addTag('File System Audit', 'Storage audit and cleanup utilities')
    .addTag('Migration', 'Database migration utilities')
    .addTag('Health', 'Service health checks')
    .addTag('Internal', 'Internal control endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: false,
  });

  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  logger.log(`🚀 M Practice Manager API is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 API Documentation available at: http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`🏢 Companies House integration: ${configService.get('COMPANIES_HOUSE_API_KEY') ? 'Enabled' : 'Disabled'}`);
  logger.log(`💾 Storage path: ${configService.get('STORAGE_PATH', './storage')}`);
  logger.log(`🗄️ Database path: ${configService.get('DATABASE_URL', 'sqlite:./storage/practice-manager.db')}`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start application', error);
  process.exit(1);
});
