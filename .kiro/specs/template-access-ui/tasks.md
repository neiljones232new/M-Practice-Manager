# Implementation Plan

- [x] 1. Create MDJTemplateDrawer component structure
  - Create new file `apps/web/src/components/mdj-ui/MDJTemplateDrawer.tsx`
  - Define TypeScript interfaces for props and state
  - Implement basic drawer shell with open/close functionality
  - Add backdrop overlay with click-to-close
  - Implement Escape key handler
  - _Requirements: 1.2, 2.2, 5.1, 5.2, 5.3, 7.4_

- [x] 2. Implement API integration and data fetching
  - Add API call to fetch templates from `/tasks/templates/service-templates`
  - Implement loading state with MDJ UI loading indicator
  - Implement error handling with error state display
  - Add session-based caching in component state
  - Add retry functionality for failed requests
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 8.2, 8.3_

- [x] 3. Build template list view
  - Create template list container with scrollable area
  - Implement template card component using MDJCard
  - Display service kind, frequency badge, and task count
  - Add "View Details" button to each card
  - Implement empty state for no templates
  - Group templates by service kind
  - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.5, 9.3_

- [x] 4. Implement search and filter functionality
  - Add search input at top of drawer using MDJInput
  - Implement search filtering by service kind
  - Add frequency filter dropdown using MDJSelect
  - Implement debounced search (300ms)
  - Add empty state for no search results
  - Display filtered template count
  - _Requirements: 3.4, 8.4_

- [x] 5. Build template detail view
  - Create detail view container
  - Add back button to return to list
  - Display service template header with kind and frequency
  - Create task template card component
  - Display task title, description, priority badge, timing, and tags
  - Order task templates by daysBeforeDue descending
  - _Requirements: 1.4, 1.5, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 6.3_

- [x] 6. Implement responsive behavior
  - Add media query breakpoints for mobile, tablet, desktop
  - Implement mobile layout (full width, slide from bottom)
  - Implement tablet layout (500px width, slide from right)
  - Implement desktop layout (600px width, slide from right)
  - Ensure touch-friendly interactions on mobile
  - Test layout at all breakpoints
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Add accessibility features
  - Implement focus trap within drawer
  - Set initial focus when drawer opens
  - Return focus to trigger button when drawer closes
  - Add ARIA attributes (role, aria-modal, aria-labelledby)
  - Add screen reader announcements
  - Ensure keyboard navigation works correctly
  - Test with keyboard only (no mouse)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1_

- [x] 8. Integrate with Services page
  - Import MDJTemplateDrawer in `apps/web/src/app/services/page.tsx`
  - Add state for drawer open/close
  - Add "Templates" button to actions array using MDJButton
  - Render MDJTemplateDrawer component with highlightMode="services"
  - Test integration and functionality
  - _Requirements: 1.1, 1.2, 9.1, 9.2_

- [x] 9. Integrate with Tasks page
  - Import MDJTemplateDrawer in `apps/web/src/app/tasks/page.tsx`
  - Add state for drawer open/close
  - Add "Templates" button to actions array using MDJButton
  - Render MDJTemplateDrawer component with highlightMode="tasks"
  - Test integration and functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2_

- [x] 10. Export component from MDJ UI index
  - Add MDJTemplateDrawer to `apps/web/src/components/mdj-ui/index.tsx`
  - Verify component is properly exported
  - Test import in Services and Tasks pages
  - _Requirements: 9.2_

- [x] 11. Style and polish UI
  - Apply MDJ UI color palette and typography
  - Add hover states to template cards
  - Add focus indicators to interactive elements
  - Implement smooth transitions for drawer and backdrop
  - Ensure consistent spacing and padding
  - Add visual feedback for loading and error states
  - _Requirements: 9.3, 9.4, 9.5_

- [x] 12. Performance optimization
  - Implement React.memo for template cards
  - Add useMemo for filtered template list
  - Verify drawer opens within 300ms
  - Test with large template lists (50+ templates)
  - Optimize re-renders
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13. Cross-browser testing
  - Test in Chrome/Edge on desktop
  - Test in Safari on desktop
  - Test in Firefox on desktop
  - Test in mobile Safari (iOS)
  - Test in mobile Chrome (Android)
  - Fix any browser-specific issues
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 14. Final verification and cleanup
  - Run TypeScript type checking
  - Verify no console errors or warnings
  - Test all user interactions
  - Verify accessibility with screen reader
  - Test keyboard navigation thoroughly
  - Remove any debug code or console.logs
  - Add JSDoc comments to complex functions
  - _Requirements: All requirements_
