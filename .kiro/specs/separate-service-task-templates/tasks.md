# Implementation Plan

## Overview
This implementation plan adds standalone task templates to the MDJ Practice Manager system while keeping existing service templates unchanged. The Tasks page will show standalone action templates (Send email, Make call, etc.) while the Services page continues to show service templates with their workflow tasks.

**Key Points:**
- Service templates remain completely unchanged (already exist in `apps/api/storage/service-templates/`)
- New standalone task templates will be stored separately in `apps/api/storage/task-templates/`
- Template drawer shows appropriate templates based on context
- 40+ default task templates organized by category

**Current State:**
- ✅ Service templates exist and are working
- ✅ MDJTemplateDrawer exists and displays service templates
- ✅ Task creation page exists but doesn't handle template query parameters
- ❌ No standalone task template interfaces or service
- ❌ No API endpoints for standalone task templates
- ❌ Template drawer doesn't support `highlightMode='tasks'` or standalone templates

## Tasks

- [x] 1. Add standalone task template interfaces
  - Add `StandaloneTaskTemplate` interface to `apps/api/src/modules/tasks/interfaces/task.interface.ts`
  - Add `CreateStandaloneTaskTemplateDto` interface
  - Define task template categories as constants (7 categories)
  - _Requirements: 4.1, 4.4, 6.1_

- [x] 2. Create StandaloneTaskTemplatesService
  - Create new file `apps/api/src/modules/tasks/standalone-task-templates.service.ts`
  - Implement `findAll()` method to retrieve all standalone task templates from `task-templates` storage
  - Implement `findByCategory(category: string)` method to filter templates by category
  - Implement `findOne(id: string)` method to get a single template
  - Implement `create(dto: CreateStandaloneTaskTemplateDto)` method to create new templates
  - Implement `update(id: string, dto: Partial<CreateStandaloneTaskTemplateDto>)` method
  - Implement `delete(id: string)` method
  - _Requirements: 4.2, 4.4, 8.2, 8.3_

- [x] 3. Add default task templates initialization
  - In `StandaloneTaskTemplatesService`, implement `onModuleInit()` hook
  - Create 40+ default templates across 7 categories:
    - Client Communication (8 templates)
    - Billing & Credit Control (6 templates)
    - Practice Administration (7 templates)
    - Email & Correspondence (5 templates)
    - Client Job Workflow (5 templates)
    - Internal Operations (5 templates)
    - Marketing & Growth (4 templates)
  - Check for existing templates by title before creating to avoid duplicates
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

- [x] 4. Add controller endpoints for standalone task templates
  - Add `GET /tasks/templates/standalone` endpoint to `apps/api/src/modules/tasks/tasks.controller.ts`
  - Add optional `category` query parameter for filtering
  - Add `GET /tasks/templates/standalone/:id` endpoint to get single template
  - Add `POST /tasks/templates/standalone` endpoint to create custom templates
  - _Requirements: 4.2, 8.2_

- [x] 5. Update TasksModule to include new service
  - Update `apps/api/src/modules/tasks/tasks.module.ts` to import `StandaloneTaskTemplatesService`
  - Add service to providers array
  - Export service for use in other modules if needed
  - _Requirements: 4.5_

- [x] 6. Update MDJTemplateDrawer component for standalone task templates
  - Update `apps/web/src/components/mdj-ui/MDJTemplateDrawer.tsx` to support both template types
  - Add state for standalone task templates
  - Fetch standalone task templates when `highlightMode='tasks'` via `/tasks/templates/standalone`
  - Keep existing service template fetching when `highlightMode='services'` (already working)
  - Add category dropdown for filtering task templates (7 categories)
  - Group task templates by category in the display
  - Update template card click handlers to navigate to `/tasks/new?title=...&description=...&priority=...&tags=...`
  - Update drawer title based on highlightMode ('Service Templates' vs 'Task Templates')
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 10.1, 10.2, 10.3_

- [x] 7. Update task creation page to handle template parameters
  - Update `apps/web/src/app/tasks/new/page.tsx` to read query parameters (title, description, priority, tags)
  - Add useEffect to pre-populate form fields when template parameters are present
  - Parse tags from comma-separated string to array
  - Allow users to modify pre-populated data before submission
  - _Requirements: 3.1, 3.2, 7.4, 7.5_

- [x] 8. Add unit tests for StandaloneTaskTemplatesService
  - Test template creation
  - Test template retrieval (all, by category, by ID)
  - Test template update and delete
  - Test default template initialization
  - Test duplicate prevention
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 9. Add integration tests for template system
  - Test template drawer displays correct templates based on highlightMode
  - Test template selection navigates to correct form with pre-populated data
  - Test task creation from template
  - Test service templates remain unchanged and functional
  - _Requirements: 1.1, 1.2, 7.1, 7.2, 9.1, 9.2, 9.3, 9.4, 9.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for MVP
- Existing service templates in `apps/api/storage/service-templates/` remain completely unchanged
- No migration is needed - this is purely additive functionality
- Default templates will be created automatically on first system startup via `onModuleInit()`
- Template drawer already exists with full accessibility and responsive design - just needs to support standalone templates
- Search functionality already exists in template drawer - will work for both template types
