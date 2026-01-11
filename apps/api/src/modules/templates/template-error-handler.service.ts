import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Centralized error handling service for the templates module
 * Requirements: All (comprehensive error handling)
 * Provides user-friendly error messages and proper error categorization
 */
@Injectable()
export class TemplateErrorHandlerService {
  private readonly logger = new Logger(TemplateErrorHandlerService.name);

  /**
   * Handle template not found errors
   * Requirements: All
   */
  handleTemplateNotFound(templateId: string): never {
    const message = `Template with ID '${templateId}' was not found. Please verify the template ID and try again.`;
    this.logger.warn(`Template not found: ${templateId}`);
    throw new NotFoundException({
      message,
      error: 'Template Not Found',
      statusCode: HttpStatus.NOT_FOUND,
      templateId,
    });
  }

  /**
   * Handle client not found errors
   * Requirements: All
   */
  handleClientNotFound(clientId: string): never {
    const message = `Client with ID '${clientId}' was not found. Please verify the client exists and try again.`;
    this.logger.warn(`Client not found: ${clientId}`);
    throw new NotFoundException({
      message,
      error: 'Client Not Found',
      statusCode: HttpStatus.NOT_FOUND,
      clientId,
    });
  }

  /**
   * Handle service not found errors
   * Requirements: All
   */
  handleServiceNotFound(serviceId: string): never {
    const message = `Service with ID '${serviceId}' was not found. Please verify the service exists and try again.`;
    this.logger.warn(`Service not found: ${serviceId}`);
    throw new NotFoundException({
      message,
      error: 'Service Not Found',
      statusCode: HttpStatus.NOT_FOUND,
      serviceId,
    });
  }

  /**
   * Handle template file not found errors
   * Requirements: All
   */
  handleTemplateFileNotFound(templateId: string, filePath: string): never {
    const message = `Template file for template '${templateId}' was not found. The template may be corrupted or the file may have been deleted.`;
    this.logger.error(`Template file not found: ${filePath} for template ${templateId}`);
    throw new NotFoundException({
      message,
      error: 'Template File Not Found',
      statusCode: HttpStatus.NOT_FOUND,
      templateId,
      filePath,
    });
  }

  /**
   * Handle template inactive errors
   * Requirements: All
   */
  handleTemplateInactive(templateId: string, templateName: string): never {
    const message = `Template '${templateName}' is currently inactive and cannot be used. Please contact an administrator to activate this template.`;
    this.logger.warn(`Attempted to use inactive template: ${templateId}`);
    throw new BadRequestException({
      message,
      error: 'Template Inactive',
      statusCode: HttpStatus.BAD_REQUEST,
      templateId,
      templateName,
    });
  }

  /**
   * Handle missing required fields errors
   * Requirements: All
   */
  handleMissingRequiredFields(missingFields: string[]): never {
    const fieldList = missingFields.map(f => `'${f}'`).join(', ');
    const message = `The following required fields are missing: ${fieldList}. Please provide values for all required fields and try again.`;
    this.logger.warn(`Missing required fields: ${fieldList}`);
    throw new BadRequestException({
      message,
      error: 'Missing Required Fields',
      statusCode: HttpStatus.BAD_REQUEST,
      missingFields,
    });
  }

  /**
   * Handle validation errors
   * Requirements: All
   */
  handleValidationErrors(errors: Array<{ field: string; message: string; code?: string }>): never {
    const message = 'Validation failed for one or more fields. Please correct the errors and try again.';
    this.logger.warn(`Validation errors: ${JSON.stringify(errors)}`);
    throw new BadRequestException({
      message,
      error: 'Validation Failed',
      statusCode: HttpStatus.BAD_REQUEST,
      validationErrors: errors,
    });
  }

  /**
   * Handle template parsing errors
   * Requirements: All
   */
  handleTemplateParsingError(templateId: string, error: Error): never {
    const message = `Failed to parse template. The template file may be corrupted or in an unsupported format. Please check the template and try again.`;
    this.logger.error(`Template parsing error for ${templateId}: ${error.message}`, error.stack);
    throw new BadRequestException({
      message,
      error: 'Template Parsing Failed',
      statusCode: HttpStatus.BAD_REQUEST,
      templateId,
      details: error.message,
    });
  }

  /**
   * Handle document generation errors
   * Requirements: All
   */
  handleDocumentGenerationError(templateId: string, clientId: string, error: Error): never {
    const message = `Failed to generate document. An error occurred during document generation. Please try again or contact support if the problem persists.`;
    this.logger.error(
      `Document generation error for template ${templateId}, client ${clientId}: ${error.message}`,
      error.stack,
    );
    throw new InternalServerErrorException({
      message,
      error: 'Document Generation Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      templateId,
      clientId,
      details: error.message,
    });
  }

  /**
   * Handle PDF generation errors
   * Requirements: All
   */
  handlePDFGenerationError(error: Error): never {
    const message = `Failed to generate PDF document. Please try again or contact support if the problem persists.`;
    this.logger.error(`PDF generation error: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'PDF Generation Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details: error.message,
    });
  }

  /**
   * Handle DOCX generation errors
   * Requirements: All
   */
  handleDOCXGenerationError(error: Error): never {
    const message = `Failed to generate DOCX document. Please try again or contact support if the problem persists.`;
    this.logger.error(`DOCX generation error: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'DOCX Generation Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details: error.message,
    });
  }

  /**
   * Handle file storage errors
   * Requirements: All
   */
  handleFileStorageError(operation: string, error: Error): never {
    const message = `Failed to ${operation}. A storage error occurred. Please try again or contact support if the problem persists.`;
    this.logger.error(`File storage error during ${operation}: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'File Storage Error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      operation,
      details: error.message,
    });
  }

  /**
   * Handle bulk generation errors
   * Requirements: All
   */
  handleBulkGenerationError(error: Error, context?: { templateId?: string; clientCount?: number }): never {
    const message = `Failed to complete bulk letter generation. ${context?.clientCount ? `Processing ${context.clientCount} clients.` : ''} Please try again or contact support if the problem persists.`;
    this.logger.error(`Bulk generation error: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'Bulk Generation Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      ...context,
      details: error.message,
    });
  }

  /**
   * Handle ZIP file creation errors
   * Requirements: All
   */
  handleZipCreationError(error: Error): never {
    const message = `Failed to create ZIP file for bulk download. The individual documents were generated successfully, but packaging failed. Please try downloading documents individually.`;
    this.logger.error(`ZIP creation error: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'ZIP Creation Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details: error.message,
    });
  }

  /**
   * Handle ZIP file not found errors
   * Requirements: All
   */
  handleZipFileNotFound(zipFileId: string): never {
    const message = `ZIP file not found or has expired. Bulk download files are only available for 24 hours. Please regenerate the letters if needed.`;
    this.logger.warn(`ZIP file not found: ${zipFileId}`);
    throw new NotFoundException({
      message,
      error: 'ZIP File Not Found',
      statusCode: HttpStatus.NOT_FOUND,
      zipFileId,
    });
  }

  /**
   * Handle document save errors
   * Requirements: All
   */
  handleDocumentSaveError(error: Error, context?: { templateId?: string; clientId?: string }): never {
    const message = `Failed to save generated document. The document was generated but could not be saved. Please try again.`;
    this.logger.error(`Document save error: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'Document Save Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      ...context,
      details: error.message,
    });
  }

  /**
   * Handle letter record creation errors
   * Requirements: All
   */
  handleLetterRecordError(error: Error, context?: { templateId?: string; clientId?: string }): never {
    const message = `Failed to create letter record. The document was generated but the record could not be saved. Please contact support.`;
    this.logger.error(`Letter record creation error: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'Letter Record Creation Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      ...context,
      details: error.message,
    });
  }

  /**
   * Handle letter not found errors
   * Requirements: All
   */
  handleLetterNotFound(letterId: string): never {
    const message = `Generated letter with ID '${letterId}' was not found. The letter may have been deleted or the ID is incorrect.`;
    this.logger.warn(`Letter not found: ${letterId}`);
    throw new NotFoundException({
      message,
      error: 'Letter Not Found',
      statusCode: HttpStatus.NOT_FOUND,
      letterId,
    });
  }

  /**
   * Handle document download errors
   * Requirements: All
   */
  handleDocumentDownloadError(letterId: string, error: Error): never {
    const message = `Failed to download document. The document may have been deleted or is temporarily unavailable. Please try again.`;
    this.logger.error(`Document download error for letter ${letterId}: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'Document Download Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      letterId,
      details: error.message,
    });
  }

  /**
   * Handle invalid format errors
   * Requirements: All
   */
  handleInvalidFormat(format: string, allowedFormats: string[]): never {
    const message = `Invalid format '${format}'. Allowed formats are: ${allowedFormats.join(', ')}.`;
    this.logger.warn(`Invalid format requested: ${format}`);
    throw new BadRequestException({
      message,
      error: 'Invalid Format',
      statusCode: HttpStatus.BAD_REQUEST,
      format,
      allowedFormats,
    });
  }

  /**
   * Handle template upload errors
   * Requirements: All
   */
  handleTemplateUploadError(error: Error, fileName?: string): never {
    const message = `Failed to upload template${fileName ? ` '${fileName}'` : ''}. Please check the file format and try again.`;
    this.logger.error(`Template upload error: ${error.message}`, error.stack);
    throw new BadRequestException({
      message,
      error: 'Template Upload Failed',
      statusCode: HttpStatus.BAD_REQUEST,
      fileName,
      details: error.message,
    });
  }

  /**
   * Handle unsupported file format errors
   * Requirements: All
   */
  handleUnsupportedFileFormat(format: string): never {
    const message = `Unsupported file format '${format}'. Only DOCX and MD formats are supported.`;
    this.logger.warn(`Unsupported file format: ${format}`);
    throw new BadRequestException({
      message,
      error: 'Unsupported File Format',
      statusCode: HttpStatus.BAD_REQUEST,
      format,
      supportedFormats: ['DOCX', 'MD'],
    });
  }

  /**
   * Handle data fetch errors
   * Requirements: All
   */
  handleDataFetchError(dataType: string, id: string, error: Error): never {
    const message = `Failed to fetch ${dataType} data for ID '${id}'. Please verify the ID and try again.`;
    this.logger.error(`Data fetch error for ${dataType} ${id}: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'Data Fetch Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      dataType,
      id,
      details: error.message,
    });
  }

  /**
   * Handle placeholder resolution errors
   * Requirements: All
   */
  handlePlaceholderResolutionError(error: Error, context?: { templateId?: string; clientId?: string }): never {
    const message = `Failed to resolve placeholder values. Please check the template and client data and try again.`;
    this.logger.error(`Placeholder resolution error: ${error.message}`, error.stack);
    throw new BadRequestException({
      message,
      error: 'Placeholder Resolution Failed',
      statusCode: HttpStatus.BAD_REQUEST,
      ...context,
      details: error.message,
    });
  }

  /**
   * Handle generic errors with user-friendly messages
   * Requirements: All
   */
  handleGenericError(operation: string, error: Error, context?: Record<string, any>): never {
    // If it's already an HTTP exception, re-throw it
    if (error instanceof HttpException) {
      throw error;
    }

    const message = `An error occurred while ${operation}. Please try again or contact support if the problem persists.`;
    this.logger.error(`Error during ${operation}: ${error.message}`, error.stack);
    throw new InternalServerErrorException({
      message,
      error: 'Operation Failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      operation,
      ...context,
      details: error.message,
    });
  }

  /**
   * Wrap an async operation with error handling
   * Requirements: All
   */
  async wrapAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleGenericError(operation, error as Error, context);
    }
  }

  /**
   * Log and return a user-friendly error response
   * Requirements: All
   */
  createErrorResponse(error: Error, operation: string): {
    message: string;
    error: string;
    statusCode: number;
    details?: string;
  } {
    this.logger.error(`Error during ${operation}: ${error.message}`, error.stack);

    if (error instanceof HttpException) {
      const response = error.getResponse();
      return typeof response === 'object'
        ? (response as any)
        : {
            message: error.message,
            error: 'Error',
            statusCode: error.getStatus(),
          };
    }

    return {
      message: `An error occurred while ${operation}. Please try again.`,
      error: 'Internal Server Error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details: error.message,
    };
  }
}
