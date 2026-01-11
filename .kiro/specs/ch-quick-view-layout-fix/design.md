# Design Document

## Overview

This design document outlines the approach to migrate the Companies House quick view panel from inline styling and inconsistent class usage to the unified MDJ UI component system. The migration will improve visual consistency, maintainability, and ensure the quick view matches the design language used throughout the MDJ Practice Manager application.

## Architecture

### Component Structure

The Companies House page (`apps/web/src/app/companies-house/page.tsx`) will be refactored to use:

1. **MDJ UI Components** from `@/components/mdj-ui`:
   - `MDJCard` - For all card sections
   - `MDJButton` - For action buttons
   - `MDJInput` / `MDJSelect` - For form inputs
   - `MDJCheckbox` - For checkbox inputs
   - `MDJBadge` - For status indicators

2. **mdjnew.ui.css Classes**:
   - `.card-mdj` - Card styling
   - `.btn-gold` / `.btn-outline-gold` - Button styling
   - `.input-mdj` - Input styling
   - `.list-compact` - List styling
   - `.kv` - Key-value pair layout
   - `.sticky-pane` - Sticky positioning for detail panel
   - `.gold-ref` - Gold reference text styling
   - `.badge` with variants - Status badges

### Layout Strategy

The page uses a split-column layout:

```
┌─────────────────────────────────────────────────────────┐
│  Search Card (MDJCard)                                  │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────┐
│  Search Results      │  Quick View Panel (sticky-pane)  │
│  (MDJCard)           │  ┌────────────────────────────┐  │
│  ┌────────────────┐  │  │ Company Header (MDJCard)   │  │
│  │ Result Item    │  │  └────────────────────────────┘  │
│  │ Result Item    │  │  ┌────────────────────────────┐  │
│  │ Result Item    │  │  │ Import Options (MDJCard)   │  │
│  └────────────────┘  │  └────────────────────────────┘  │
│                      │  ┌──────────┬─────────────────┐  │
│                      │  │ Office   │ Compliance      │  │
│                      │  └──────────┴─────────────────┘  │
│                      │  ... more sections ...           │
└──────────────────────┴──────────────────────────────────┘
```

## Components and Interfaces

### Existing Component Structure

The page already has well-defined TypeScript interfaces:
- `CompanySearchResult`
- `CompanyDetails`
- `CompanyOfficer`
- `PersonWithSignificantControl`
- `FilingItem`
- `ChargeItem`

These interfaces will remain unchanged.

### Component Replacements

#### 1. SectionCard Component → MDJCard

**Current:**
```tsx
function SectionCard({ title, children, actions, tight }) {
  return (
    <div className={`card-mdj ${tight ? 'tight' : ''}`}>
      <div className="mdj-pagehead">
        <h3 className="mdj-h2">{title}</h3>
        {actions && <div className="mdj-page-actions">{actions}</div>}
      </div>
      <hr className="mdj-gold-rule" />
      {children}
    </div>
  );
}
```

**New:**
```tsx
import { MDJCard } from '@/components/mdj-ui';

<MDJCard 
  title={title}
  actions={actions}
  padding={tight ? 'sm' : 'md'}
>
  {children}
</MDJCard>
```

#### 2. Button Elements → MDJButton

**Current:**
```tsx
<button className="btn-gold" onClick={handleClick}>
  Import Company
</button>
<button className="btn-outline-gold" onClick={handleClick}>
  Clear
</button>
```

**New:**
```tsx
import { MDJButton } from '@/components/mdj-ui';

<MDJButton variant="primary" onClick={handleClick}>
  Import Company
</MDJButton>
<MDJButton variant="outline" onClick={handleClick}>
  Clear
</MDJButton>
```

#### 3. Input Elements → MDJInput / MDJSelect

**Current:**
```tsx
<input
  className="input-mdj"
  placeholder="Enter company name..."
  value={q}
  onChange={(e) => setQ(e.target.value)}
/>
<select className="input-mdj" value={filters.status}>
  <option value="">Company status</option>
  <option value="active">Active</option>
</select>
```

**New:**
```tsx
import { MDJInput, MDJSelect } from '@/components/mdj-ui';

<MDJInput
  placeholder="Enter company name..."
  value={q}
  onChange={(e) => setQ(e.target.value)}
/>
<MDJSelect
  value={filters.status}
  onChange={(e) => setFilters(s => ({ ...s, status: e.target.value }))}
  options={[
    { label: 'Company status', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Dissolved', value: 'dissolved' }
  ]}
/>
```

#### 4. Checkbox Elements → MDJCheckbox

**Current:**
```tsx
<label style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
  <input 
    type="checkbox" 
    checked={importCompany} 
    onChange={(e) => setImportCompany(e.target.checked)} 
  />
  <span>Import company</span>
</label>
```

**New:**
```tsx
import { MDJCheckbox } from '@/components/mdj-ui';

<MDJCheckbox
  label="Import company"
  checked={importCompany}
  onChange={(e) => setImportCompany(e.target.checked)}
/>
```

#### 5. Badge Elements → MDJBadge

**Current:**
```tsx
<span className={`mdj-badge ${badgeTone(r.company_status)}`}>
  {toTitle(r.company_status)}
</span>
```

**New:**
```tsx
import { MDJBadge } from '@/components/mdj-ui';

<MDJBadge variant={getBadgeVariant(r.company_status)}>
  {toTitle(r.company_status)}
</MDJBadge>
```

### Helper Function Updates

The `badgeTone` function will be replaced with `getBadgeVariant`:

```tsx
const getBadgeVariant = (status?: string): 'success' | 'error' | 'warning' | 'default' => {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'dissolved') return 'error';
  return 'warning';
};
```

## Data Models

No changes to existing data models. All TypeScript interfaces remain the same.

## Error Handling

Error handling remains unchanged. The component migration does not affect:
- API error handling
- Loading states
- Empty states
- Form validation

## Testing Strategy

### Manual Testing Checklist

1. **Search Functionality**
   - Verify search input styling matches MDJ UI
   - Test advanced filters display correctly
   - Confirm button states (loading, disabled) work

2. **Results List**
   - Verify result items use proper card styling
   - Test hover states on result items
   - Confirm selection highlighting works
   - Test "Quick preview" button functionality

3. **Quick View Panel**
   - Verify sticky positioning works correctly
   - Test scrolling behavior (independent from results)
   - Confirm all sections display properly
   - Test responsive behavior at different breakpoints

4. **Import Functionality**
   - Verify portfolio dropdown styling
   - Test checkbox states for import options
   - Confirm service selection grid layout
   - Test director selection checkboxes
   - Verify import button states

5. **Responsive Behavior**
   - Test at mobile breakpoint (< 768px)
   - Test at tablet breakpoint (768px - 1024px)
   - Test at desktop breakpoint (> 1024px)
   - Verify grid layouts collapse appropriately

### Visual Regression Testing

Compare before/after screenshots at key breakpoints:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

### Accessibility Testing

1. Keyboard navigation through all interactive elements
2. Screen reader compatibility with MDJ UI components
3. Focus indicators on buttons and inputs
4. ARIA labels preserved from MDJ UI components

## Implementation Notes

### Styling Preservation

The following existing styles should be preserved:
- `.sticky-pane` for the detail panel positioning
- `.list-compact` for result items
- `.kv` for key-value pair layouts
- `.gold-ref` for company number styling
- Grid layouts using Tailwind-style classes (`grid`, `md:grid-cols-2`, etc.)

### Component Import Strategy

All MDJ UI components should be imported from the barrel export:

```tsx
import {
  MDJCard,
  MDJButton,
  MDJInput,
  MDJSelect,
  MDJCheckbox,
  MDJBadge,
} from '@/components/mdj-ui';
```

### Inline Styles

Minimize inline styles. Where inline styles are necessary (e.g., dynamic positioning), use CSS custom properties from mdjnew.ui.css:

```tsx
style={{ 
  color: 'var(--text-dark)',
  borderColor: 'var(--gold)',
  gap: '1rem'
}}
```

### Grid Layout Classes

Continue using utility classes for grid layouts:
- `.grid` with `.md:grid-cols-2` for responsive two-column grids
- `.content-grid` for page-level section spacing
- `.gap-4`, `.gap-2` for consistent spacing

## Migration Strategy

### Phase 1: Component Imports
1. Add MDJ UI component imports at the top of the file
2. Keep existing code functional

### Phase 2: Replace SectionCard
1. Replace all `<SectionCard>` instances with `<MDJCard>`
2. Update props to match MDJCard API
3. Test each section individually

### Phase 3: Replace Form Elements
1. Replace all `<button>` elements with `<MDJButton>`
2. Replace all `<input>` and `<select>` with `<MDJInput>` and `<MDJSelect>`
3. Replace checkbox labels with `<MDJCheckbox>`
4. Test form interactions

### Phase 4: Replace Badges
1. Replace badge spans with `<MDJBadge>`
2. Update `badgeTone` function to `getBadgeVariant`
3. Test status display

### Phase 5: Cleanup
1. Remove unused helper components (SectionCard, KV if replaced)
2. Remove unused inline styles
3. Verify no console warnings
4. Run final visual regression tests

## Performance Considerations

- MDJ UI components are already optimized and tree-shakeable
- No additional bundle size impact (components already used elsewhere)
- Sticky positioning performance remains unchanged
- No impact on API call patterns or data fetching

## Browser Compatibility

MDJ UI components support:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

CSS Grid and sticky positioning are well-supported in all target browsers.
