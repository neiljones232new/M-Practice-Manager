import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const cwd = process.cwd();
  const repoRoot = cwd.endsWith(path.join('apps', 'api')) ? path.resolve(cwd, '..', '..') : cwd;
  const defaultStoragePath = path.resolve(repoRoot, 'storage');
  if (!process.env.STORAGE_PATH || String(process.env.STORAGE_PATH).trim() === '') {
    process.env.STORAGE_PATH = defaultStoragePath;
  }

  const envCandidates = [
    path.resolve(process.cwd(), '.env.prod'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env.prod'),
    path.resolve(process.cwd(), '../.env.local'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env.prod'),
    path.resolve(process.cwd(), '../../.env.local'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  for (const p of envCandidates) {
    dotenv.config({ path: p, override: false });
  }

  // If an env file has set COMPANIES_HOUSE_API_KEY to an empty string, dotenv won't override it.
  // Ensure the key is populated from .env.prod if present.
  if (!process.env.COMPANIES_HOUSE_API_KEY || String(process.env.COMPANIES_HOUSE_API_KEY).trim() === '') {
    const prodCandidates = envCandidates.filter((p) => p.endsWith('.env.prod'));
    for (const p of prodCandidates) {
      try {
        if (!fs.existsSync(p)) continue;
        const parsed = dotenv.parse(fs.readFileSync(p));
        const key = parsed?.COMPANIES_HOUSE_API_KEY;
        if (key && String(key).trim() !== '') {
          process.env.COMPANIES_HOUSE_API_KEY = key;
          break;
        }
      } catch {
        // ignore
      }
    }
  }
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra properties for flexibility
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
