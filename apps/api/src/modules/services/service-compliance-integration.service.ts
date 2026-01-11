import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ComplianceService } from '../filings/compliance.service';
import { ComplianceItem } from '../companies-house/interfaces/companies-house.interface';

@Injectable()
export class ServiceComplianceIntegrationService {
  private readonly logger = new Logger(ServiceComplianceIntegrationService.name);

  constructor(
    @Inject(forwardRef(() => ServicesService))
    private servicesService: ServicesService,
    private complianceService: ComplianceService,
  ) {}

  /**
   * Creates compliance items for a service based on service type mapping
   * Requirements: 4.1, 7.1, 7.2, 7.4
   */
  async createComplianceItemsForService(serviceId: string): Promise<ComplianceItem[]> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    const complianceItems: ComplianceItem[] = [];

    // Map service types to compliance item types
    const complianceMapping = this.getComplianceMapping(service.kind);
    
    if (complianceMapping.length === 0) {
      this.logger.debug(`No compliance mapping found for service kind: ${service.kind}`);
      return complianceItems;
    }

    for (const complianceType of complianceMapping) {
      try {
        const item = await this.complianceService.createComplianceItem({
          clientId: service.clientId,
          serviceId: service.id,
          type: complianceType.type,
          description: complianceType.description,
          dueDate: service.nextDue,
          source: complianceType.source,
          status: 'PENDING',
        });
        complianceItems.push(item);
        this.logger.log(
          `Created compliance item ${item.id} (${item.type}) for service ${serviceId}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to create compliance item for service ${serviceId}: ${error.message}`,
          error.stack
        );
      }
    }

    return complianceItems;
  }

  /**
   * Syncs compliance item dates when service dates change
   * Requirements: 7.4
   */
  async syncServiceAndComplianceDates(serviceId: string): Promise<void> {
    const service = await this.servicesService.findOne(serviceId);
    if (!service || !service.nextDue) {
      this.logger.debug(`Service ${serviceId} not found or has no nextDue date`);
      return;
    }

    // Find all compliance items linked to this service
    const complianceItems = await this.complianceService.findByService(serviceId);

    if (complianceItems.length === 0) {
      this.logger.debug(`No compliance items found for service ${serviceId}`);
      return;
    }

    // Update each compliance item's due date
    for (const item of complianceItems) {
      try {
        await this.complianceService.updateComplianceItem(item.id, {
          dueDate: service.nextDue,
        });
        this.logger.log(
          `Synced compliance item ${item.id} due date to ${service.nextDue.toISOString()}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync compliance item ${item.id}: ${error.message}`,
          error.stack
        );
      }
    }
  }

  /**
   * Maps service kinds to compliance types
   * Requirements: 7.1, 7.2
   */
  getComplianceMapping(serviceKind: string): Array<{
    type: string;
    description: string;
    source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  }> {
    const mappings: Record<string, Array<{
      type: string;
      description: string;
      source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
    }>> = {
      'Annual Accounts': [
        {
          type: 'ANNUAL_ACCOUNTS',
          description: 'Companies House Annual Accounts Filing',
          source: 'COMPANIES_HOUSE',
        },
      ],
      'Confirmation Statement': [
        {
          type: 'CONFIRMATION_STATEMENT',
          description: 'Companies House Confirmation Statement',
          source: 'COMPANIES_HOUSE',
        },
      ],
      'VAT Returns': [
        {
          type: 'VAT_RETURN',
          description: 'HMRC VAT Return',
          source: 'HMRC',
        },
      ],
      'Corporation Tax': [
        {
          type: 'CT600',
          description: 'HMRC Corporation Tax Return',
          source: 'HMRC',
        },
      ],
      'Self Assessment': [
        {
          type: 'SA100',
          description: 'HMRC Self Assessment Tax Return',
          source: 'HMRC',
        },
      ],
      'Payroll': [
        {
          type: 'RTI_SUBMISSION',
          description: 'HMRC Real Time Information Submission',
          source: 'HMRC',
        },
      ],
    };

    return mappings[serviceKind] || [];
  }
}
