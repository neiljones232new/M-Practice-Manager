# Implementation Plan

## Overview
This implementation plan addresses the Service-Task-Compliance relationship fix. Based on code analysis, the following has been identified:

**Already Implemented:**
- ✅ Tasks already have `serviceId` field and support linking to services
- ✅ Tasks service has `findByService()` method
- ✅ Services service has proper CRUD operations
- ✅ Compliance service has full CRUD operations
- ✅ Service detail page exists but needs enhancement

**Missing Implementation:**
- ❌ ComplianceItem interface lacks `serviceId` field
- ❌ No service-compliance integration service
- ❌ No service detail endpoint that returns tasks and compliance items
- ❌ Service detail page doesn't show related tasks and compliance items
- ❌ No automatic compliance item creation when services are created
- ❌ No compliance item filtering by service

## Tasks

- [x] 1. Add serviceId field to ComplianceItem interface and DTOs
  - Update `ComplianceItem` interface in `apps/api/src/modules/companies-house/interfaces/companies-house.interface.ts` to add optional `serviceId: string` field
  - Update `CreateComplianceItemDto` interface to include optional `serviceId` field
  - _Requirements: 4.1, 4.2, 7.3, 9.3_

- [x] 2. Add service filtering methods to ComplianceService
  - Add `findByService(serviceId: string): Promise<ComplianceItem[]>` method to `apps/api/src/modules/filings/compliance.service.ts`
  - Update `findAll()` method to support filtering by `serviceId` in filters parameter
  - _Requirements: 4.2, 8.2, 9.4_

- [x] 3. Create ServiceComplianceIntegrationService
  - Create new file `apps/api/src/modules/services/service-compliance-integration.service.ts`
  - Implement `createComplianceItemsForService(serviceId: string)` method that maps service types to compliance types
  - Implement `syncServiceAndComplianceDates(serviceId: string)` method to update compliance item dates when service dates change
  - Implement `getComplianceMapping(serviceKind: string)` helper method for service-to-compliance type mapping
  - _Requirements: 4.1, 7.1, 7.2, 7.4_

- [x] 4. Update ServicesService to integrate with compliance
  - Inject `ServiceComplianceIntegrationService` into `apps/api/src/modules/services/services.service.ts`
  - Update `create()` method to call `createComplianceItemsForService()` for applicable service types
  - Update `update()` method to call `syncServiceAndComplianceDates()` when `nextDue` changes
  - Add `shouldCreateComplianceItems(serviceKind: string)` helper method
  - _Requirements: 7.1, 7.4, 7.5_

- [x] 5. Add service detail endpoint with related entities
  - Add `GET /services/:id/details` endpoint to `apps/api/src/modules/services/services.controller.ts`
  - Endpoint should return service, related tasks (via TasksService), and related compliance items (via ComplianceService)
  - Include summary statistics (total tasks, open tasks, pending compliance, etc.)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Update ServicesModule to include new dependencies
  - Update `apps/api/src/modules/services/services.module.ts` to import `FilingsModule` for ComplianceService
  - Add `ServiceComplianceIntegrationService` to providers array
  - Ensure proper dependency injection setup with forwardRef if needed
  - _Requirements: 9.1, 9.5_

- [x] 7. Enhance service detail page to show related tasks and compliance
  - Update `apps/web/src/app/services/[id]/page.tsx` to fetch service details from new `/services/:id/details` endpoint
  - Add "Related Tasks" section showing tasks linked to the service with status, due date, assignee
  - Add "Compliance Items" section showing compliance items linked to the service with status and due date
  - Add summary cards showing task and compliance statistics
  - Add "Generate Tasks" button to trigger task generation from service template
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2_

- [x] 8. Update task creation form to show service selection
  - Update `apps/web/src/app/tasks/new/page.tsx` to add service dropdown
  - Load active services for selected client
  - Pre-populate serviceId if coming from service detail page (via query param)
  - Add helper text explaining service-task relationship
  - _Requirements: 2.1, 2.2, 5.1, 10.4_

- [x] 9. Update tasks list page to show related service name
  - Update `apps/web/src/app/tasks/page.tsx` to display service name column
  - Show "Standalone Task" for tasks without serviceId
  - Make service name clickable to navigate to service detail page
  - _Requirements: 2.2, 5.3, 10.2_

- [x] 10. Update compliance list page to show related service
  - Update `apps/web/src/app/compliance/page.tsx` to display related service column
  - Show service name if serviceId exists, otherwise show "-"
  - Make service name clickable to navigate to service detail page
  - _Requirements: 4.4, 5.4, 10.3_

- [x] 11. Add cascade delete for service-related tasks
  - Update `ServicesService.delete()` method in `apps/api/src/modules/services/services.service.ts`
  - Before deleting service, find and delete all related tasks using `TasksService.findByService()`
  - Log cascade deletion for audit purposes
  - _Requirements: 1.5, 9.2_

- [x] 12. Update Companies House sync to link compliance items to services
  - Update `apps/api/src/modules/companies-house/companies-house.service.ts` sync methods
  - When creating compliance items from Companies House data, attempt to find matching service
  - Link compliance item to service via serviceId if match found
  - _Requirements: 4.5, 7.1, 7.2_

- [x] 13. Create migration script for existing compliance items
  - Create `scripts/migrate-compliance-service-links.ts` to backfill serviceId for existing compliance items
  - Match compliance items to services based on clientId and type mapping
  - Log successful and failed matches
  - _Requirements: 9.3, 9.5_

- [ ]* 14. Add integration tests for service-task-compliance relationships
  - Create test file `apps/api/src/modules/services/service-compliance-integration.spec.ts`
  - Test service creation automatically creates compliance items
  - Test service update syncs compliance item dates
  - Test service deletion cascades to tasks
  - Test service detail endpoint returns correct related entities
  - _Requirements: 1.5, 4.1, 7.1, 7.4, 8.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for MVP
- The implementation follows the existing file-based storage pattern
- All changes maintain backward compatibility with existing data
- Service-task relationship already exists and is working correctly
- Main focus is adding service-compliance relationship and enhancing UI to show relationships
