import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { LettersController } from './letters.controller';
import { TemplatesService } from './templates.service';
import { LetterGenerationService } from './letter-generation.service';
import { PlaceholderService } from './placeholder.service';
import { TemplateParserService } from './template-parser.service';
import { DocumentGeneratorService } from './document-generator.service';
import { HandlebarsService } from './handlebars.service';
import { TemplateInitializationService } from './template-initialization.service';
import { TemplateValidationService } from './template-validation.service';
import { TemplateErrorHandlerService } from './template-error-handler.service';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { ClientsModule } from '../clients/clients.module';
import { ServicesModule } from '../services/services.module';
import { DocumentsModule } from '../documents/documents.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    FileStorageModule,
    ClientsModule,
    ServicesModule,
    DocumentsModule,
    AuthModule,
    AuditModule,
  ],
  controllers: [TemplatesController, LettersController],
  providers: [
    TemplatesService,
    LetterGenerationService,
    PlaceholderService,
    TemplateParserService,
    DocumentGeneratorService,
    HandlebarsService,
    TemplateInitializationService,
    TemplateValidationService,
    TemplateErrorHandlerService,
  ],
  exports: [
    TemplatesService,
    LetterGenerationService,
    PlaceholderService,
    TemplateParserService,
    DocumentGeneratorService,
    HandlebarsService,
    TemplateInitializationService,
    TemplateValidationService,
    TemplateErrorHandlerService,
  ],
})
export class TemplatesModule {}
