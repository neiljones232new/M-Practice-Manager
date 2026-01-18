# Client Display CSS Classes

This document describes the CSS classes available for styling client information display throughout the M Practice Manager application.

## Overview

The `client-display.css` stylesheet provides consistent styling for client names, references, and related UI elements in calendar events, forms, and modals.

## CSS Classes Reference

### Client Name Separator
- **`.client-separator`** - Styles the bullet separator (•) between event title and client name
  - Color: Muted text color with reduced opacity
  - Usage: Inline with event titles on calendar grid

### Client Reference Display
- **`.client-ref-display`** - Styles client reference in parentheses (larger contexts)
  - Font: Monospace
  - Size: 0.875rem
  - Color: Muted gray
  
- **`.client-ref-inline`** - Smaller variant for inline display
  - Font: Monospace
  - Size: 0.85rem
  - Color: Gray (#6b7280)

### Error States
- **`.client-not-found`** - Styles "Not Found" indicator
  - Color: Red (#dc2626)
  - Weight: 600 (semi-bold)
  - Includes icon spacing

- **`.client-not-found-icon`** - Warning icon styling
  - Size: 1.1rem

- **`.client-not-found-helper`** - Helper text for not found state
  - Size: 0.75rem
  - Color: Gray

- **`.client-error`** - General error state styling
  - Color: Red (#dc2626)
  - Weight: 600

### Client Name Links
- **`.client-name-link`** - Clickable client name links
  - Color: Gold (brand color)
  - Hover: Underline + darker gold
  - Focus: Gold outline with offset

### ClientSelect Dropdown
- **`.client-select-dropdown`** - Main dropdown container
  - Z-index: 1000
  - Shadow: Medium elevation
  - Border radius: 10px

- **`.client-select-option`** - Individual option in dropdown
  - Hover: Light gray background
  - Focus: Gold outline with tint background

- **`.client-select-option-name`** - Client name in option
  - Weight: 500
  - Color: Dark text

- **`.client-select-option-ref`** - Client reference in option
  - Font: Monospace
  - Size: 0.85rem
  - Color: Muted

- **`.client-select-clear`** - "No client" option
  - Style: Italic
  - Color: Muted

- **`.client-select-loading`** - Loading spinner container
  - Position: Absolute right

- **`.client-select-spinner`** - Animated spinner
  - Animation: Rotating border

- **`.client-select-clear-btn`** - Clear selection button (×)
  - Position: Absolute right
  - Hover: Darker color

### Selected Client Info
- **`.client-selected-info`** - Container for selected client display
  - Size: 0.875rem
  - Color: Gray
  - Margin: Top spacing

- **`.client-selected-name`** - Selected client name
  - Weight: 500
  - Color: Dark text

- **`.client-selected-ref`** - Selected client reference
  - Font: Monospace

### Calendar Event Display
- **`.calendar-event-title`** - Event title with client name
  - Display: Inline flex
  - Gap: 0.35rem

- **`.calendar-event-client`** - Client name in event
  - Color: Muted
  - Weight: 500

### Modal Client Info Section
- **`.client-info-section`** - Client information container
  - Padding: 1rem
  - Border: 1px solid border color
  - Border radius: 8px
  - Background: White

- **`.client-info-label`** - "Client" label
  - Size: 0.9rem
  - Weight: 600
  - Color: Muted

- **`.client-info-content`** - Content area
  - Size: 0.95rem
  - Display: Flex with wrap

- **`.client-info-primary`** - Primary client name
  - Weight: 600
  - Size: 1rem

### Reference-Only Display
- **`.client-ref-only`** - Container for reference-only display
  - Display: Flex
  - Gap: 0.25rem

- **`.client-ref-label`** - "Reference:" label
  - Color: Gray
  - Size: 0.875rem

- **`.client-ref-value`** - Reference value
  - Font: Monospace
  - Weight: 500

### Validation Errors
- **`.client-validation-error`** - Validation error container
  - Background: Light red (#fee2e2)
  - Border: Red (#dc2626)
  - Color: Dark red (#991b1b)
  - Includes icon spacing

- **`.client-validation-error-icon`** - Error icon
  - Size: 1rem

### Error Messages with Retry
- **`.client-error-message`** - Error message container
  - Padding: 1rem
  - Color: Red
  - Border bottom: Soft border

- **`.client-error-text`** - Error text with icon
  - Display: Flex centered
  - Gap: 0.5rem

- **`.client-retry-btn`** - Retry button
  - Background: Gold
  - Color: White
  - Hover: Darker gold
  - Focus: Gold outline with tint

### No Results
- **`.client-no-results`** - "No clients found" message
  - Padding: 1rem
  - Color: Muted
  - Centered text

## Responsive Behavior

### Mobile (< 768px)
- Smaller font sizes for references
- Reduced spacing
- Stacked layout for client info
- Shorter dropdown height

### Accessibility Features
- Proper focus states for keyboard navigation
- High contrast mode support
- Reduced motion support
- ARIA-friendly structure

## Usage Examples

### Event Modal Client Display
```tsx
<div className="client-info-section">
  <label className="client-info-label">Client</label>
  <div className="client-info-content">
    <Link href={`/clients/${ref}`} className="client-name-link client-info-primary">
      Acme Corporation Ltd
    </Link>
    <span className="client-ref-display">(1A001)</span>
  </div>
</div>
```

### Not Found State
```tsx
<div className="client-not-found">
  <span className="client-not-found-icon">⚠</span>
  <span>1A001 (Not Found)</span>
  <span className="client-not-found-helper">
    Client may have been deleted
  </span>
</div>
```

### Selected Client Info
```tsx
<div className="client-selected-info">
  Selected: <span className="client-selected-name">Acme Corporation Ltd</span>
  <span className="client-selected-ref">(1A001)</span>
</div>
```

## Design System Integration

All classes follow the M UI design system:
- Uses CSS custom properties (--gold, --text-muted, etc.)
- Consistent border radius (10px for inputs, 8px for sections)
- Standard spacing scale (0.25rem, 0.5rem, 0.75rem, 1rem)
- Brand colors for interactive elements
- Proper elevation with shadows

## Requirements Satisfied

- **Requirement 3.4**: Consistent styling for client information across calendar and task views
- **Requirement 4.5**: Readable font sizes and colors for calendar grid display
- **Requirement 8.1**: Red text styling for "Not Found" indicator
- **Requirement 8.2**: Styled error messages with retry buttons
- **Requirement 8.3**: Validation error display styling

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox
- CSS Custom Properties
- CSS Animations
