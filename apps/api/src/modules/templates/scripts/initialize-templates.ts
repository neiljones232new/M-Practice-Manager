import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { TemplateInitializationService } from '../template-initialization.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const initService = app.get(TemplateInitializationService);

  try {
    console.log('Initializing templates...');
    await initService.initializeTemplates();
    console.log('Template initialization complete!');
  } catch (error) {
    console.error('Failed to initialize templates:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
