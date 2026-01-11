# Requirements Document

## Introduction

This feature addresses layout issues in the Companies House quick view panel that appears when users click "Quick preview" on a search result. The quick view currently uses inconsistent styling and should be migrated to use the unified MDJ UI component system (mdjnew-ui) for proper layout, consistent styling, and better maintainability.

## Glossary

- **Quick View Panel**: The right-side detail pane that displays when a user clicks "Quick preview" on a Companies House search result
- **MDJ Practice Manager**: The practice management application
- **Companies House Page**: The page at `/companies-house` that allows searching and importing company data
- **Split Layout**: The two-column grid layout showing search results on the left and company details on the right
- **MDJ UI Components**: The unified component library exported from `@/components/mdj-ui` that provides consistent styling via `mdjnew.ui.css`
- **mdjnew.ui.css**: The unified design system stylesheet that defines card-mdj, btn-gold, input-mdj, and other standardized classes

## Requirements

### Requirement 1

**User Story:** As a user searching for companies, I want the quick view panel to use consistent MDJ UI styling so that it matches the rest of the application

#### Acceptance Criteria

1. THE Companies House Page SHALL use MDJCard components from the MDJ UI library for all card sections
2. THE Companies House Page SHALL use MDJButton components for all action buttons
3. THE Companies House Page SHALL use MDJInput and MDJSelect components for all form inputs
4. THE Companies House Page SHALL use MDJBadge components for status indicators
5. THE Companies House Page SHALL apply mdjnew.ui.css classes consistently throughout the layout

### Requirement 2

**User Story:** As a user searching for companies, I want the quick view panel to display properly so that I can review company details without layout issues

#### Acceptance Criteria

1. WHEN THE user clicks "Quick preview" on a search result, THE Quick View Panel SHALL display in a two-column grid layout with search results on the left
2. WHILE THE Quick View Panel is visible, THE panel SHALL remain scrollable independently from the search results
3. WHEN THE Quick View Panel contains multiple sections, THE sections SHALL stack vertically with consistent spacing using MDJCard components
4. THE Quick View Panel SHALL display all company information sections without overlapping or misalignment
5. WHEN THE user resizes the browser window, THE Quick View Panel SHALL maintain proper layout proportions

### Requirement 3

**User Story:** As a user reviewing company details, I want all information sections to be clearly organized using consistent UI components so that I can quickly find the data I need

#### Acceptance Criteria

1. THE Quick View Panel SHALL display the company header section using MDJCard with title, actions, and proper spacing
2. THE Quick View Panel SHALL display import options in a dedicated MDJCard section with MDJCheckbox components
3. THE Quick View Panel SHALL display registered office and compliance information in a two-column grid using MDJCard components
4. THE Quick View Panel SHALL display service selection options in a grid layout using MDJCard components with MDJCheckbox inputs
5. THE Quick View Panel SHALL display directors and PSCs in a two-column grid using MDJCard components
6. THE Quick View Panel SHALL display filing history and charges in a two-column grid using MDJCard components

### Requirement 4

**User Story:** As a user on smaller screens, I want the quick view to be responsive so that I can use it on tablets and mobile devices

#### Acceptance Criteria

1. WHEN THE viewport width is below tablet breakpoint, THE Quick View Panel SHALL stack below the search results
2. WHEN THE viewport width is below tablet breakpoint, THE two-column grids within the panel SHALL collapse to single columns
3. THE Quick View Panel SHALL maintain readability at all supported viewport sizes
4. THE MDJ UI components SHALL apply responsive classes automatically based on viewport size
