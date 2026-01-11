# Design Document: Client Compliance & Filings Page

## Overview

This feature adds a dedicated Compliance & Filings page for individual clients, accessible from the client detail view at `/clients/[id]/compliance`. The page provides a comprehensive view of all compliance items, filings, and deadlines for a specific client, with capabilities to manage compliance status, create tasks, and view Companies House filing history.

Currently, the client detail page has a basic "compliance" tab showing only accounts and confirmation statement dates from the client record. This new dedicated page will provide enhanced functionality including:
- Full compliance item management with status tracking
- Task creation from compliance items
- Companies House filing history integration
- Summary statistics and visual indicators
- Responsive design for desktop and tablet use

## Architecture

### Page Structure

The new page follows the existing MDJ Practice Manager architecture patterns:

```
apps/web/src/app/clients/[id]/compliance/page.tsx (new)
```

This page will:
- Use the existing `MDJShell` component for consistent layout
- Leverage the shared `api` client from `apps/web/src/lib/api.ts`
- Follow the same patterns as `/clients/[id]/page.tsx` and `/compliance/page.tsx`
- Integrate with existing backend endpoints in `apps/api/src/modules/filings/compliance.controller.ts`

### Navigation Flow

```
Client Detail Page (/clients/[id])
  └─> Compliance Tab
      └─> "View Compliance & Filings" button
          └─> Client Compliance Page (/clients/[id]/compliance)
              └─> Back button returns to client detail
```

## Components and Interfaces

### Frontend Component Structure

#### Main Page Component
**File**: `apps/web/src/app/clients/[id]/compliance/page.tsx`

```typescript
// Key interfaces
interface ComplianceItem {
  id: string;
  clientId: string;
  type: string;
  description: string;
  dueDate?: string;
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  source: 'COMPANIES_HOUSE' | 'HMRC' | 'MANUAL';
  reference?: string;
  period?: string;
  createdAt: string;
  updatedAt: string;
}

interface ComplianceSummary {
  total: number;
  pending: number;
  overdue: number;
  upcoming: number;
  filed: number;
}

interface FilingHistoryItem {
  date: string;
  type: string;
  description: string;
}
```

**State Management**:
- `client`: Client data loaded from `/clients/[id]`
- `complianceItems`: Array of compliance items from `/compliance?clientId=[id]`
- `summary`: Summary statistics calculated from compliance items
- `filingHistory`: Companies House filing history from `/companies-house/company/[number]/filing-history`
- `loading`: Loading states for different sections
- `error`: Error messages for user feedback

### Backend Integration

The page will use existing API endpoints:

**Compliance Endpoints** (already implemented):
- `GET /compliance?clientId=[id]` - Fetch all compliance items for client
- `PUT /compliance/[id]/filed` - Mark compliance item as filed
- `POST /compliance/[id]/create-task` - Create task from compliance item
- `GET /compliance/dashboard/summary` - Get summary statistics

**Companies House Endpoints** (already implemented):
- `GET /companies-house/company/[number]/filing-history` - Get filing history

**Client Endpoints** (already implemented):
- `GET /clients/[id]` - Get client details including company number

## Data Models

### Compliance Item Display Model

The page will display compliance items with the following structure:

```typescript
{
  id: string;                    // Unique identifier
  type: string;                  // e.g., "ANNUAL_ACCOUNTS", "CONFIRMATION_STATEMENT"
  description: string;           // Human-readable description
  dueDate: string;              // ISO date string
  status: 'PENDING' | 'FILED' | 'OVERDUE' | 'EXEMPT';
  lastFiled: string;            // Derived from period field
  actions: {
    canMarkFiled: boolean;
    canCreateTask: boolean;
    hasExistingTask: boolean;
  }
}
```

### Summary Statistics Model

```typescript
{
  total: number;        // Total compliance items
  pending: number;      // Items with PENDING status
  overdue: number;      // Items past due date
  upcoming: number;     // Items due within 30 days
  filed: number;        // Items with FILED status
}
```

## User Interface Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ MDJShell Header                                             │
│ ← Back to Client | Client Name - Compliance & Filings      │
├─────────────────────────────────────────────────────────────┤
│ Summary Cards (4-column grid)                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │  Total   │ │ Pending  │ │ Overdue  │ │ Upcoming │       │
│ │    12    │ │    8     │ │    2     │ │    3     │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│ Compliance Items Table                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Type | Description | Last Filed | Due Date | Status | ⚙ ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ Accounts | ... | 31/12/2023 | 31/12/2024 | PENDING | ⚙ ││
│ │ Confirmation | ... | 15/06/2023 | 15/06/2024 | OVERDUE | ⚙││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Filing History (if company number exists)                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Date | Type | Description                                ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ 15/01/2024 | AA | Annual accounts made up to...         ││
│ │ 10/06/2023 | CS01 | Confirmation statement...           ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Visual Design Patterns

**Status Badges**:
- `PENDING` - Yellow/warning badge (`mdj-badge-warn`)
- `FILED` - Green/success badge (`mdj-badge-success`)
- `OVERDUE` - Red/danger badge (`mdj-badge-danger`)
- `EXEMPT` - Gray/muted badge (`mdj-badge-muted`)

**Action Buttons**:
- "Mark as Filed" - Primary action button (`btn-gold`)
- "Create Task" - Secondary action button (`btn-outline-gold`)
- "View Task" - Link button when task exists (`btn-outline-gold`)

**Summary Cards**:
- Use existing `card-mdj` styling
- Color-coded numbers matching status severity
- Grid layout: `display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`

## Error Handling

### Error Scenarios and Responses

1. **Client Not Found**
   - Display error message: "Client not found"
   - Show back button to return to clients list
   - HTTP Status: 404

2. **No Company Number**
   - Hide filing history section
   - Show message: "No company number registered for this client"
   - Continue showing compliance items

3. **API Connection Failure**
   - Display error banner: "Unable to load compliance data. Please try again."
   - Provide retry button
   - Log error to console for debugging

4. **Status Update Failure**
   - Display inline error message near affected item
   - Keep UI in previous state (don't optimistically update)
   - Error message: "Failed to update status. Please try again."

5. **Task Creation Failure**
   - Display error message: "Failed to create task. Please try again."
   - Provide option to retry
   - Log detailed error for debugging

### Error Display Pattern

```typescript
{error && (
  <div className="card-mdj" style={{ 
    marginBottom: '1rem', 
    padding: '1rem', 
    background: 'var(--danger-bg)', 
    borderColor: 'var(--danger)' 
  }}>
    <span style={{ color: 'var(--danger)' }}>{error}</span>
  </div>
)}
```

## Testing Strategy

### Unit Testing Focus

**Component Testing**:
- Summary statistics calculation
- Status badge rendering logic
- Date formatting and comparison
- Action button visibility logic

**Integration Points**:
- API client calls with correct parameters
- Error handling for failed requests
- State updates after successful operations

### Manual Testing Checklist

1. **Navigation**
   - [ ] Link from client detail compliance tab works
   - [ ] Back button returns to client detail page
   - [ ] Breadcrumb navigation is correct

2. **Data Display**
   - [ ] Summary cards show correct counts
   - [ ] Compliance items table displays all fields
   - [ ] Status badges use correct colors
   - [ ] Dates format correctly (DD/MM/YYYY)
   - [ ] Filing history appears when company number exists
   - [ ] Filing history hidden when no company number

3. **Actions**
   - [ ] "Mark as Filed" updates status
   - [ ] "Create Task" creates task and shows success message
   - [ ] "View Task" button appears after task creation
   - [ ] Action buttons disable during loading

4. **Error Handling**
   - [ ] Error messages display for failed operations
   - [ ] Page handles missing client gracefully
   - [ ] Page handles API connection errors

5. **Responsive Design**
   - [ ] Desktop layout (1920x1080) displays correctly
   - [ ] Tablet layout (768x1024) adjusts appropriately
   - [ ] Tables scroll horizontally on narrow screens
   - [ ] Summary cards stack on smaller screens

### Test Data Requirements

- Client with company number and compliance items
- Client without company number
- Compliance items with various statuses (PENDING, OVERDUE, FILED)
- Compliance items with and without due dates
- Companies House filing history data

## Implementation Details

### Client Detail Page Modifications

**File**: `apps/web/src/app/clients/[id]/page.tsx`

Add navigation link in the compliance tab section:

```typescript
{tab === 'compliance' && (
  <div style={{ padding: '1rem' }}>
    {/* Existing compliance table */}
    <div style={{ overflowX: 'auto' }}>
      <table className="mdj-table">
        {/* ... existing table content ... */}
      </table>
    </div>
    
    {/* NEW: Summary and navigation */}
    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-soft)', borderRadius: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="mdj-sub">
            {(() => {
              const pending = [client.accountsNextDue, client.confirmationNextDue].filter(Boolean).length;
              const overdue = [
                client.accountsNextDue && new Date(client.accountsNextDue) < new Date(),
                client.confirmationNextDue && new Date(client.confirmationNextDue) < new Date()
              ].filter(Boolean).length;
              return `${pending} pending items${overdue > 0 ? `, ${overdue} overdue` : ''}`;
            })()}
          </div>
        </div>
        <button 
          className="btn-gold"
          onClick={() => router.push(`/clients/${client.id}/compliance`)}
        >
          View Compliance & Filings
        </button>
      </div>
    </div>
  </div>
)}
```

**Design Rationale**: This approach provides a clear call-to-action from the existing compliance tab while maintaining the current simple view. Users can see basic information at a glance and navigate to the detailed page when needed.

### New Compliance Page Implementation

**File**: `apps/web/src/app/clients/[id]/compliance/page.tsx`

Key implementation patterns:

1. **Data Loading Strategy**:
   - Load client data first to get company number
   - Load compliance items in parallel with client data
   - Load filing history only if company number exists
   - Use `Promise.all()` for parallel requests where possible

2. **State Management**:
   - Separate loading states for different sections
   - Optimistic updates for status changes (with rollback on error)
   - Local state for UI interactions (modals, dropdowns)

3. **Action Handlers**:
```typescript
const handleMarkFiled = async (id: string) => {
  try {
    setUpdating(id);
    await api.put(`/compliance/${id}/filed`, {
      filedDate: new Date().toISOString(),
    });
    // Refresh compliance items
    await loadComplianceItems();
    setSuccess('Compliance item marked as filed');
  } catch (err) {
    setError('Failed to mark item as filed');
  } finally {
    setUpdating(null);
  }
};

const handleCreateTask = async (id: string) => {
  try {
    setCreatingTask(id);
    const result = await api.post(`/compliance/${id}/create-task`);
    setSuccess(`Task created successfully`);
    // Update UI to show "View Task" button
    await loadComplianceItems();
  } catch (err) {
    setError('Failed to create task');
  } finally {
    setCreatingTask(null);
  }
};
```

4. **Summary Calculation**:
```typescript
const calculateSummary = (items: ComplianceItem[]): ComplianceSummary => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return {
    total: items.length,
    pending: items.filter(i => i.status === 'PENDING').length,
    overdue: items.filter(i => 
      i.dueDate && new Date(i.dueDate) < now && i.status === 'PENDING'
    ).length,
    upcoming: items.filter(i => 
      i.dueDate && 
      new Date(i.dueDate) >= now && 
      new Date(i.dueDate) <= thirtyDaysFromNow &&
      i.status === 'PENDING'
    ).length,
    filed: items.filter(i => i.status === 'FILED').length,
  };
};
```

### Responsive Design Implementation

**Breakpoints**:
- Desktop: > 1024px - Full table layout
- Tablet: 768px - 1024px - Adjusted table with horizontal scroll
- Mobile: < 768px - Card-based layout (future enhancement)

**CSS Patterns**:
```typescript
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem'
}}>
  {/* Summary cards */}
</div>

<div style={{ overflowX: 'auto' }}>
  <table className="mdj-table">
    {/* Compliance items */}
  </table>
</div>
```

**Design Rationale**: Using CSS Grid with `auto-fit` and `minmax` ensures summary cards automatically adjust to available space. The table wrapper with `overflowX: auto` provides horizontal scrolling on smaller screens without breaking the layout.

### Accessibility Considerations

1. **Keyboard Navigation**:
   - All interactive elements (buttons, links) are keyboard accessible
   - Tab order follows logical reading order
   - Focus indicators visible on all interactive elements

2. **Screen Reader Support**:
   - Table headers properly marked with `<th>` elements
   - Status badges include text content, not just colors
   - Action buttons have descriptive labels
   - Loading states announced with aria-live regions

3. **Color Contrast**:
   - Status badges meet WCAG AA contrast requirements
   - Error messages use both color and text
   - Links distinguishable from regular text

4. **ARIA Attributes**:
```typescript
<button
  aria-label={`Mark ${item.description} as filed`}
  aria-busy={updating === item.id}
  disabled={updating === item.id}
>
  {updating === item.id ? 'Updating...' : 'Mark as Filed'}
</button>
```

## Design Decisions and Rationales

### 1. Dedicated Page vs. Modal/Drawer

**Decision**: Create a dedicated page at `/clients/[id]/compliance` rather than a modal or drawer.

**Rationale**:
- Compliance management is a primary workflow that deserves dedicated screen space
- Users may need to reference other information while managing compliance
- Dedicated URL allows bookmarking and direct navigation
- Consistent with existing patterns (services, tasks have dedicated pages)
- Better for responsive design on tablets

### 2. Summary Statistics Placement

**Decision**: Place summary cards at the top of the page, above the compliance items table.

**Rationale**:
- Provides immediate overview of compliance health
- Follows dashboard pattern used elsewhere in the application
- Helps users prioritize which items need attention
- Visual hierarchy: overview → details → history

### 3. Filing History Integration

**Decision**: Show Companies House filing history on the same page, below compliance items.

**Rationale**:
- Provides context for compliance items (what was actually filed)
- Reduces navigation between pages
- Only shown when relevant (client has company number)
- Requirement 5 explicitly requests this integration
- Users can verify filed items against CH records

### 4. Task Creation Flow

**Decision**: Create tasks directly from compliance items with a single button click, showing success message with link to task.

**Rationale**:
- Streamlines workflow (no multi-step form)
- Compliance items already contain necessary task information
- Success message with link allows immediate task access if needed
- Prevents duplicate task creation by checking for existing tasks
- Follows principle of least user effort

### 5. Status Management Approach

**Decision**: Provide simple action buttons ("Mark as Filed") rather than dropdown status selectors.

**Rationale**:
- Most common action is marking items as filed
- Reduces cognitive load (fewer choices)
- Prevents accidental status changes
- Clear, action-oriented language
- Can be extended later if needed

### 6. Data Refresh Strategy

**Decision**: Refresh compliance items after status updates and task creation, rather than optimistic updates.

**Rationale**:
- Ensures data consistency with backend
- Prevents UI/backend state mismatches
- Compliance data is critical and should be accurate
- Performance impact is minimal (single client's items)
- Provides confirmation that operation succeeded

### 7. No Filtering/Sorting UI

**Decision**: Display all compliance items sorted by due date, without filter controls.

**Rationale**:
- Client-specific view typically has few items (2-5)
- Summary cards provide at-a-glance status overview
- Keeps UI simple and focused
- Different from portfolio-wide compliance page which needs filtering
- Can be added later if user feedback indicates need

### 8. Responsive Strategy

**Decision**: Optimize for desktop and tablet, with basic mobile support via horizontal scroll.

**Rationale**:
- Requirement 7 specifies desktop and tablet as primary targets
- Compliance management is typically done at desk
- Table data is complex and doesn't collapse well on mobile
- Horizontal scroll is acceptable fallback for mobile
- Full mobile optimization can be future enhancement

## Future Enhancements

While not part of the current requirements, these enhancements could be considered:

1. **Bulk Actions**: Select multiple compliance items and mark as filed together
2. **Filtering**: Filter by status, type, or date range
3. **Export**: Export compliance items to CSV/PDF
4. **Reminders**: Set custom reminder dates for upcoming deadlines
5. **Notes**: Add notes to compliance items
6. **Audit Trail**: Show history of status changes
7. **Mobile Card Layout**: Dedicated mobile-optimized card layout
8. **Inline Editing**: Edit due dates directly in the table
9. **Calendar Integration**: Add compliance deadlines to calendar
10. **Email Notifications**: Automated reminders for upcoming deadlines

## Dependencies

### External Dependencies
- None (uses existing dependencies)

### Internal Dependencies
- `MDJShell` component for layout
- `api` client for backend communication
- Existing compliance and Companies House API endpoints
- Client data model and endpoints

### API Endpoints Required
All endpoints already exist:
- `GET /clients/[id]`
- `GET /compliance?clientId=[id]`
- `PUT /compliance/[id]/filed`
- `POST /compliance/[id]/create-task`
- `GET /companies-house/company/[number]/filing-history`

## Security Considerations

1. **Authentication**: Page requires authenticated user (enforced by `JwtAuthGuard` on API)
2. **Authorization**: Users can only access clients in their assigned portfolios
3. **Data Validation**: All user inputs validated on backend
4. **XSS Prevention**: React automatically escapes rendered content
5. **CSRF Protection**: API uses JWT tokens, not cookies

## Performance Considerations

1. **Data Loading**:
   - Parallel requests where possible
   - Client-specific queries (not loading all compliance items)
   - Filing history limited to 20 most recent items

2. **Rendering**:
   - Simple table rendering (no virtualization needed for small datasets)
   - Conditional rendering of filing history section
   - Minimal re-renders through proper state management

3. **Network**:
   - Typical payload: < 10KB for compliance items
   - Filing history: < 50KB
   - Total page load: < 100KB
   - Expected load time: < 500ms on good connection

## Monitoring and Analytics

Consider tracking:
- Page views and navigation patterns
- Most common actions (mark filed, create task)
- Error rates for API calls
- Time spent on page
- Task creation success rate

This data can inform future enhancements and identify pain points in the workflow.
