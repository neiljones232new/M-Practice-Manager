# Implementation Plan

- [x] 1. Add MDJ UI component imports and helper functions
  - Add imports for MDJCard, MDJButton, MDJInput, MDJSelect, MDJCheckbox, and MDJBadge from '@/components/mdj-ui'
  - Create getBadgeVariant helper function to replace badgeTone
  - Verify imports resolve correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Replace SectionCard component with MDJCard
  - [x] 2.1 Replace search card SectionCard with MDJCard
    - Update the search form card to use MDJCard component
    - Preserve form layout and functionality
    - _Requirements: 1.1, 2.3_
  
  - [x] 2.2 Replace results list SectionCard with MDJCard
    - Update search results container to use MDJCard
    - Maintain list-compact styling for result items
    - _Requirements: 1.1, 2.1, 2.3_
  
  - [x] 2.3 Replace quick view header SectionCard with MDJCard
    - Update company header section to use MDJCard with title and actions props
    - Preserve portfolio dropdown and action buttons in actions prop
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [x] 2.4 Replace import options SectionCard with MDJCard
    - Update import options section to use MDJCard
    - Maintain checkbox layout structure
    - _Requirements: 1.1, 3.2_
  
  - [x] 2.5 Replace registered office and compliance SectionCards with MDJCard
    - Update both cards in the two-column grid
    - Preserve kv (key-value) layout styling
    - _Requirements: 1.1, 3.3_
  
  - [x] 2.6 Replace service selection SectionCard with MDJCard
    - Update service selection section to use MDJCard
    - Maintain grid layout for service options
    - _Requirements: 1.1, 3.4_
  
  - [x] 2.7 Replace directors and PSCs SectionCards with MDJCard
    - Update both cards in the two-column grid
    - Preserve list-compact styling for items
    - _Requirements: 1.1, 3.5_
  
  - [x] 2.8 Replace filing history and charges SectionCards with MDJCard
    - Update both cards in the two-column grid
    - Maintain list-compact styling
    - _Requirements: 1.1, 3.6_
  
  - [x] 2.9 Remove unused SectionCard component definition
    - Delete the SectionCard helper component
    - Verify no remaining references
    - _Requirements: 1.1_

- [x] 3. Replace button elements with MDJButton
  - [x] 3.1 Replace search and filter buttons
    - Update "Search" button to MDJButton with variant="primary"
    - Update "More options" button to MDJButton with variant="outline"
    - Preserve loading and disabled states
    - _Requirements: 1.2, 2.2_
  
  - [x] 3.2 Replace recent search action buttons
    - Update "Run again" buttons to MDJButton with variant="outline"
    - _Requirements: 1.2_
  
  - [x] 3.3 Replace result item action buttons
    - Update "View details" and "Quick preview" buttons to MDJButton with variant="outline"
    - Maintain click handlers and event propagation
    - _Requirements: 1.2, 2.1_
  
  - [x] 3.4 Replace quick view header action buttons
    - Update "Import Company" button to MDJButton with variant="primary"
    - Update "Full Company Page" and "Clear" buttons to MDJButton with variant="outline"
    - Preserve loading and disabled states
    - _Requirements: 1.2, 2.2, 3.1_

- [x] 4. Replace form input elements with MDJ UI components
  - [x] 4.1 Replace search input with MDJInput
    - Update main search input to use MDJInput component
    - Preserve placeholder and value binding
    - _Requirements: 1.3, 2.2_
  
  - [x] 4.2 Replace advanced filter inputs with MDJSelect and MDJInput
    - Update status dropdown to MDJSelect with options prop
    - Update SIC, postcode, and date inputs to MDJInput
    - Maintain filter state management
    - _Requirements: 1.3, 2.2_
  
  - [x] 4.3 Replace portfolio dropdown with MDJSelect
    - Update portfolio selection to MDJSelect with options prop
    - Map portfolios array to options format
    - _Requirements: 1.3, 3.1_
  
  - [x] 4.4 Replace service fee inputs with MDJInput
    - Update frequency dropdowns to MDJSelect
    - Update fee number inputs to MDJInput with type="number"
    - _Requirements: 1.3, 3.4_
  
  - [x] 4.5 Replace PTR fee input with MDJInput
    - Update personal tax return fee input to MDJInput with type="number"
    - _Requirements: 1.3, 3.2_

- [x] 5. Replace checkbox elements with MDJCheckbox
  - [x] 5.1 Replace import option checkboxes
    - Update "Import company" checkbox to MDJCheckbox
    - Update "Select all directors" checkbox to MDJCheckbox
    - Update "Create selected directors as clients" checkbox to MDJCheckbox
    - Update "Add Personal Tax Return service" checkbox to MDJCheckbox
    - Preserve checked state and onChange handlers
    - _Requirements: 1.3, 3.2_
  
  - [x] 5.2 Replace director selection checkboxes
    - Update individual director checkboxes in the list to MDJCheckbox
    - Maintain selection state management
    - _Requirements: 1.3, 3.5_
  
  - [x] 5.3 Replace service selection checkboxes
    - Update service option checkboxes to MDJCheckbox
    - Preserve selection state in serviceChoices array
    - _Requirements: 1.3, 3.4_

- [x] 6. Replace badge elements with MDJBadge
  - [x] 6.1 Update badgeTone helper to getBadgeVariant
    - Create getBadgeVariant function that returns 'success' | 'error' | 'warning' | 'default'
    - Map 'active' to 'success', 'dissolved' to 'error', others to 'warning'
    - _Requirements: 1.4_
  
  - [x] 6.2 Replace status badges in search results
    - Update company status badges to MDJBadge with variant prop
    - Use getBadgeVariant for variant determination
    - _Requirements: 1.4, 2.1_
  
  - [x] 6.3 Replace status badges in quick view
    - Update company status badges in header and overview sections
    - Update filing type badges to MDJBadge with variant="default"
    - Update charge status badges to MDJBadge with variant="default"
    - _Requirements: 1.4, 3.1, 3.6_

- [x] 7. Verify responsive behavior and styling
  - [x] 7.1 Test mobile layout (< 768px)
    - Verify split layout stacks vertically
    - Confirm two-column grids collapse to single column
    - Test touch interactions on buttons and inputs
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 7.2 Test tablet layout (768px - 1024px)
    - Verify split layout maintains two columns
    - Confirm internal grids display correctly
    - Test sticky-pane behavior
    - _Requirements: 2.2, 4.3_
  
  - [x] 7.3 Test desktop layout (> 1024px)
    - Verify all sections display with proper spacing
    - Confirm sticky-pane scrolling works independently
    - Test all interactive elements
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [-] 8. Clean up and final verification
  - [x] 8.1 Remove unused helper components
    - Remove SectionCard component definition
    - Remove KV component if not used elsewhere
    - Remove badgeTone function
    - _Requirements: 1.1, 1.4_
  
  - [x] 8.2 Remove unnecessary inline styles
    - Replace inline styles with CSS custom properties where possible
    - Ensure consistent use of mdjnew.ui.css classes
    - _Requirements: 1.5_
  
  - [x] 8.3 Verify no console errors or warnings
    - Check browser console for React warnings
    - Verify no TypeScript errors
    - Test all user interactions
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 8.4 Visual regression check
    - Compare before/after screenshots at key breakpoints
    - Verify consistent styling with other MDJ pages
    - Confirm all sections render correctly
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
