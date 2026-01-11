# Design Document

## Overview

This design implements a template viewing interface accessible from both the Services and Tasks pages. The solution uses a reusable drawer component that displays service templates and their associated task templates, following the existing MDJ UI design patterns.

## Architecture

### Component Structure

```
MDJTemplateDrawer (new shared component)
├── Template List View
│   ├── Search/Filter Bar
│   ├── Template Cards (grouped by service kind)
│   └── Empty State
└── Template Detail View
    ├── Service Template Header
    ├── Task Template List
    └── Back Navigation
```

### Data Flow

```
User Action (Click "Templates" button)
    ↓
Open MDJTemplateDrawer
    ↓
Fetch from /api/v1/tasks/templates/service-templates
    ↓
Cache in component state
    ↓
Display template list
    ↓
User selects template
    ↓
Display task template details
```

## Components and Interfaces

### 1. MDJTemplateDrawer Component

**Location:** `apps/web/src/components/mdj-ui/MDJTemplateDrawer.tsx`

**Purpose:** Reusable drawer component for displaying service and task templates

**Props:**
```typescript
interface MDJTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  highlightMode?: 'services' | 'tasks'; // Optional: emphasize different aspects
}
```

**State:**
```typescript
interface TemplateDrawerState {
  templates: ServiceTemplate[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTemplate: ServiceTemplate | null;
  filterFrequency: '' | 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
}
```

**Key Features:**
- Slides in from the right side (desktop) or bottom (mobile)
- 600px width on desktop, full width on mobile
- Backdrop overlay with click-to-close
- Escape key to close
- Focus trap when open
- Smooth transitions

### 2. Template List View

**Layout:**
- Search input at top
- Frequency filter dropdown
- Scrollable list of template cards
- Empty state when no templates match filters

**Template Card Structure:**
```typescript
<MDJCard padding="sm">
  <div className="template-card-header">
    <h4>{serviceKind}</h4>
    <MDJBadge variant="default">{frequency}</MDJBadge>
  </div>
  <div className="template-card-meta">
    <span>{taskTemplates.length} tasks</span>
  </div>
  <MDJButton variant="outline" onClick={viewDetails}>
    View Details
  </MDJButton>
</MDJCard>
```

### 3. Template Detail View

**Layout:**
- Back button to return to list
- Service template header with kind and frequency
- List of task templates in cards
- Each task template shows:
  - Title (bold)
  - Description
  - Priority badge
  - Timing ("X days before due")
  - Tags as badges

**Task Template Card Structure:**
```typescript
<MDJCard padding="sm">
  <div className="task-template-header">
    <h5>{title}</h5>
    <MDJBadge variant={priorityVariant}>{priority}</MDJBadge>
  </div>
  <p className="mdj-sub">{description}</p>
  <div className="task-template-meta">
    <span className="timing-badge">{daysBeforeDue} days before due</span>
    <div className="tags">
      {tags.map(tag => (
        <MDJBadge key={tag} variant="soft">{tag}</MDJBadge>
      ))}
    </div>
  </div>
</MDJCard>
```

## Data Models

### ServiceTemplate Interface

```typescript
interface ServiceTemplate {
  id: string;
  serviceKind: string;
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  taskTemplates: TaskTemplate[];
  createdAt: string;
  updatedAt: string;
}
```

### TaskTemplate Interface

```typescript
interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  daysBeforeDue: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
}
```

## API Integration

### Endpoint

```
GET /api/v1/tasks/templates/service-templates
```

**Response:**
```json
[
  {
    "id": "template-1",
    "serviceKind": "Annual Accounts",
    "frequency": "ANNUAL",
    "taskTemplates": [
      {
        "id": "task-1",
        "title": "Request client records",
        "description": "Contact client to request annual accounting records",
        "daysBeforeDue": 60,
        "priority": "HIGH",
        "tags": ["preparation", "client-contact"]
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Caching Strategy

- Cache templates in component state after first fetch
- Cache duration: session-based (cleared on page refresh)
- No automatic refresh (user can manually refresh by closing/reopening)
- Error handling: display error message with retry button

## UI/UX Design

### Visual Design

**Drawer Appearance:**
- Background: `var(--bg-light)`
- Border: 1px solid `var(--border)` on left edge
- Shadow: `0 0 20px rgba(0,0,0,0.1)`
- Z-index: 1000 (above page content)

**Backdrop:**
- Background: `rgba(0,0,0,0.5)`
- Z-index: 999
- Click to close

**Transitions:**
- Drawer slide: 300ms ease-in-out
- Backdrop fade: 200ms ease-in-out

### Responsive Behavior

**Desktop (>1024px):**
- Drawer width: 600px
- Slides from right
- Backdrop covers remaining screen

**Tablet (768px-1024px):**
- Drawer width: 500px
- Slides from right
- Backdrop covers remaining screen

**Mobile (<768px):**
- Drawer full width
- Slides from bottom
- Max height: 90vh
- Rounded top corners

### Interaction States

**Template Cards:**
- Hover: Slight elevation increase, border color change
- Focus: Gold border (2px solid var(--gold))
- Active: Slight scale down (0.98)

**Buttons:**
- Use standard MDJButton hover/focus/active states
- Primary action: "View Details" (outline variant)
- Secondary action: "Back" (outline variant)

## Error Handling

### API Errors

**Network Error:**
```typescript
<div className="error-state">
  <p className="mdj-sub" style={{ color: 'var(--danger)' }}>
    Failed to load templates. Please check your connection.
  </p>
  <MDJButton variant="primary" onClick={retry}>
    Retry
  </MDJButton>
</div>
```

**Empty Response:**
```typescript
<div className="empty-state">
  <p className="mdj-sub">
    No templates found. Templates will be created automatically.
  </p>
</div>
```

**No Search Results:**
```typescript
<div className="empty-state">
  <p className="mdj-sub">
    No templates match your search. Try different keywords.
  </p>
  <MDJButton variant="outline" onClick={clearSearch}>
    Clear Search
  </MDJButton>
</div>
```

## Accessibility

### Keyboard Navigation

- **Tab:** Navigate between interactive elements
- **Shift+Tab:** Navigate backwards
- **Enter/Space:** Activate buttons
- **Escape:** Close drawer
- **Arrow keys:** Navigate within lists (optional enhancement)

### Focus Management

1. When drawer opens: Focus on close button or first interactive element
2. Focus trap: Tab cycles within drawer
3. When drawer closes: Return focus to "Templates" button

### ARIA Attributes

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="template-drawer-title"
  aria-describedby="template-drawer-description"
>
  <h2 id="template-drawer-title">Service Templates</h2>
  <p id="template-drawer-description" className="sr-only">
    View and explore service and task templates
  </p>
  {/* Content */}
</div>
```

### Screen Reader Support

- Announce drawer opening: "Templates dialog opened"
- Announce template count: "Showing X templates"
- Announce filter changes: "Filtered to Y templates"
- Announce navigation: "Viewing details for [Service Kind]"

## Testing Strategy

### Unit Tests

**Component Tests:**
- MDJTemplateDrawer renders correctly
- Opens and closes properly
- Handles API responses
- Filters templates correctly
- Navigates between list and detail views

**Integration Tests:**
- API integration works correctly
- Caching functions as expected
- Error states display properly

### Manual Testing

**Functional Testing:**
- [ ] Templates button appears on Services page
- [ ] Templates button appears on Tasks page
- [ ] Drawer opens when button clicked
- [ ] Templates load from API
- [ ] Search filters templates
- [ ] Frequency filter works
- [ ] Template details display correctly
- [ ] Back navigation works
- [ ] Close button works
- [ ] Backdrop click closes drawer
- [ ] Escape key closes drawer

**Responsive Testing:**
- [ ] Desktop layout (>1024px)
- [ ] Tablet layout (768px-1024px)
- [ ] Mobile layout (<768px)
- [ ] Touch interactions work on mobile

**Accessibility Testing:**
- [ ] Keyboard navigation works
- [ ] Focus trap functions correctly
- [ ] Screen reader announces correctly
- [ ] ARIA attributes present
- [ ] Color contrast meets WCAG AA

**Browser Testing:**
- [ ] Chrome/Edge
- [ ] Safari
- [ ] Firefox

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading:** Only fetch templates when drawer opens
2. **Memoization:** Use React.memo for template cards
3. **Virtual Scrolling:** If template count exceeds 50 (future enhancement)
4. **Debounced Search:** 300ms debounce on search input
5. **Cached Results:** Store in component state, clear on unmount

### Performance Targets

- Drawer open animation: <300ms
- API response time: <500ms (backend dependent)
- Search filter response: <100ms
- Smooth scrolling: 60fps

## Integration Points

### Services Page Integration

**Location:** `apps/web/src/app/services/page.tsx`

**Changes:**
1. Import MDJTemplateDrawer
2. Add state for drawer open/close
3. Add "Templates" button to actions array
4. Render MDJTemplateDrawer component

```typescript
const [templatesOpen, setTemplatesOpen] = useState(false);

// In actions array:
{ 
  label: 'Templates', 
  onClick: () => setTemplatesOpen(true),
  variant: 'outline' 
}

// At end of component:
<MDJTemplateDrawer
  isOpen={templatesOpen}
  onClose={() => setTemplatesOpen(false)}
  highlightMode="services"
/>
```

### Tasks Page Integration

**Location:** `apps/web/src/app/tasks/page.tsx`

**Changes:** Same as Services page, with `highlightMode="tasks"`

## Future Enhancements

### Phase 2 Features (Not in Current Scope)

1. **Template Management:**
   - Create new templates
   - Edit existing templates
   - Delete templates
   - Duplicate templates

2. **Template Application:**
   - Apply template to existing service
   - Generate tasks from template
   - Bulk template application

3. **Template Analytics:**
   - Most used templates
   - Template effectiveness metrics
   - Task completion rates by template

4. **Advanced Filtering:**
   - Filter by tags
   - Filter by priority
   - Sort options (alphabetical, most used, newest)

5. **Template Preview:**
   - Preview tasks that would be generated
   - Show timeline visualization
   - Estimate workload

## Implementation Notes

### Development Order

1. Create MDJTemplateDrawer component (basic structure)
2. Implement API integration and data fetching
3. Build template list view
4. Build template detail view
5. Add search and filter functionality
6. Implement responsive behavior
7. Add accessibility features
8. Integrate with Services page
9. Integrate with Tasks page
10. Test and refine

### Code Style

- Use TypeScript for type safety
- Follow existing MDJ UI patterns
- Use functional components with hooks
- Keep components under 300 lines
- Extract reusable logic into custom hooks
- Use meaningful variable names
- Add JSDoc comments for complex logic

### Dependencies

**New Dependencies:** None (uses existing MDJ UI components)

**Existing Dependencies:**
- React (hooks: useState, useEffect, useMemo)
- MDJ UI components (MDJCard, MDJButton, MDJBadge, MDJInput, MDJSelect)
- API client (`@/lib/api`)

## Conclusion

This design provides a clean, accessible, and performant way to view service and task templates from the main Services and Tasks pages. The reusable MDJTemplateDrawer component follows existing MDJ UI patterns and can be easily extended in future phases to support template management and application features.
