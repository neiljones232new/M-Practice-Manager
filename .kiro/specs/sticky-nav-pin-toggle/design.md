# Design Document

## Overview

This design implements a sticky navigation bar with a toggleable red pin button that reveals shutdown and logout controls. The solution enhances the MDJLayout component with minimal changes to the existing architecture, leveraging the current CSS framework and React state management patterns.

## Architecture

### Component Structure

```
MDJLayout (apps/web/src/components/mdj-ui/MDJLayout.tsx)
├── Header (.mdj-topbar)
│   ├── Left Section (.mdj-topbar-left)
│   │   └── Brand/Logo
│   ├── Center Section (.mdj-topbar-center) [NEW]
│   │   └── Page Title (optional)
│   └── Right Section (.mdj-topbar-right)
│       ├── MDJAssist (inline)
│       ├── Pin Toggle Button [NEW]
│       ├── Shutdown Button [NEW - conditional]
│       ├── Logout Button [NEW - conditional]
│       └── User Display
├── Sidebar (.mdj-sidebar-fixed)
└── Main Content (.mdj-content-offset)
```

### State Management

The component will use React's `useState` hook to manage the pin toggle state:

```typescript
const [isPinned, setIsPinned] = useState(false);
```

This state controls the visibility of the shutdown and logout buttons.

## Components and Interfaces

### Modified MDJLayout Component

**File:** `apps/web/src/components/mdj-ui/MDJLayout.tsx`

**New Props:** None (all changes are internal)

**New State:**
- `isPinned: boolean` - Controls visibility of action buttons

**New Functions:**
- `handlePinToggle()` - Toggles the isPinned state
- `handleShutdown()` - Triggers application shutdown
- `handleLogout()` - Calls AuthContext logout and redirects

**Integration Points:**
- Uses `useAuth()` hook from AuthContext for logout functionality
- Uses `useRouter()` from Next.js for navigation after logout

### Pin Toggle Button

**Visual Design:**
- Circular button (34px × 34px)
- Red pin icon (📌 emoji or SVG)
- Background: `rgba(239, 68, 68, 0.15)` (danger-bg tint)
- Border: `1px solid rgba(239, 68, 68, 0.4)`
- Active state: Rotated 45deg, darker background

**States:**
- Unpinned (default): Pin icon upright, buttons hidden
- Pinned: Pin icon rotated, buttons visible

### Shutdown Button

**Visual Design:**
- Style: `.btn-outline-gold` with danger accent
- Icon: ⏻ (power symbol) or 🔴
- Label: "Shutdown"
- Color: Red accent (`var(--danger)`)
- Size: Compact (padding: 0.5rem 0.9rem)

**Behavior:**
- Displays confirmation dialog before shutdown
- Triggers window close or Electron app quit (if in desktop mode)

### Logout Button

**Visual Design:**
- Style: `.btn-outline-gold`
- Icon: 🚪 or ↪️
- Label: "Logout"
- Color: Gold accent (default theme)
- Size: Compact (padding: 0.5rem 0.9rem)

**Behavior:**
- Calls `logout()` from AuthContext
- Redirects to `/login` page
- Clears session storage and local storage

## Data Models

### Component State Interface

```typescript
interface MDJLayoutState {
  isPinned: boolean;
}
```

### Button Configuration

```typescript
interface ActionButton {
  id: 'shutdown' | 'logout';
  label: string;
  icon: string;
  onClick: () => void;
  variant: 'danger' | 'default';
  ariaLabel: string;
}
```

## Error Handling

### Logout Errors

**Scenario:** API logout call fails
**Handling:** 
- Log error to console
- Clear local session data anyway
- Redirect to login page
- Show toast notification: "Logged out (connection error)"

### Shutdown Errors

**Scenario:** Shutdown command not available (web mode)
**Handling:**
- Detect environment (Electron vs browser)
- In browser: Show message "Close browser tab to exit"
- In Electron: Call `window.electron.quit()`
- Fallback: Close current window

## Testing Strategy

### Unit Tests

**File:** `apps/web/src/components/mdj-ui/MDJLayout.test.tsx`

1. **Pin Toggle Functionality**
   - Test initial state (buttons hidden)
   - Test toggle opens buttons
   - Test toggle closes buttons
   - Test icon rotation on toggle

2. **Logout Button**
   - Test logout function is called
   - Test redirect to /login
   - Test session cleanup
   - Test error handling

3. **Shutdown Button**
   - Test confirmation dialog appears
   - Test shutdown in Electron mode
   - Test fallback in browser mode

### Integration Tests

1. **Full User Flow**
   - Navigate to dashboard
   - Click pin toggle
   - Verify buttons appear
   - Click logout
   - Verify redirect to login
   - Verify session cleared

2. **Accessibility**
   - Test keyboard navigation (Tab key)
   - Test Enter/Space activation
   - Test screen reader announcements
   - Test focus management

### Visual Regression Tests

1. Pin toggle in unpinned state
2. Pin toggle in pinned state
3. Buttons visible state
4. Responsive behavior (mobile/tablet/desktop)

## CSS Implementation

### New CSS Classes

**File:** `apps/web/src/styles/mdjnew.ui.css`

```css
/* Pin Toggle Button */
.mdj-pin-toggle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.1rem;
}

.mdj-pin-toggle:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: var(--danger);
}

.mdj-pin-toggle.active {
  background: rgba(239, 68, 68, 0.3);
  border-color: var(--danger);
  transform: rotate(45deg);
}

/* Action Buttons Container */
.mdj-action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Compact Action Button */
.btn-action-compact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.85rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action-compact:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--gold);
}

.btn-action-compact.danger {
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.btn-action-compact.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: var(--danger);
  color: #fff;
}
```

### Sticky Positioning

The `.mdj-topbar` class already has `position: fixed`, so no changes needed for sticky behavior. The existing implementation at line 229 of `mdjnew.ui.css` provides:

```css
.mdj-topbar {
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0;
  z-index: 1000;
}
```

This ensures the navigation bar remains visible during scroll.

## Responsive Design

### Desktop (> 1024px)
- All buttons visible when pinned
- Full labels displayed
- Standard spacing (gap: 10px)

### Tablet (768px - 1024px)
- Buttons visible when pinned
- Abbreviated labels ("Logout" → "Out")
- Reduced spacing (gap: 6px)

### Mobile (< 768px)
- Icon-only buttons when pinned
- No labels
- Minimal spacing (gap: 4px)
- Pin toggle remains full size

## Accessibility Features

### ARIA Labels

```typescript
<button
  className="mdj-pin-toggle"
  onClick={handlePinToggle}
  aria-label={isPinned ? "Hide action buttons" : "Show action buttons"}
  aria-expanded={isPinned}
  aria-controls="action-buttons"
>
  📌
</button>

<div id="action-buttons" role="group" aria-label="Session actions">
  <button
    className="btn-action-compact danger"
    onClick={handleShutdown}
    aria-label="Shutdown application"
  >
    ⏻ Shutdown
  </button>
  
  <button
    className="btn-action-compact"
    onClick={handleLogout}
    aria-label="Logout from current session"
  >
    🚪 Logout
  </button>
</div>
```

### Keyboard Navigation

- Tab order: Pin Toggle → Shutdown → Logout → User Display
- Enter/Space: Activate buttons
- Escape: Close pinned buttons (when focused)
- Focus visible indicators on all interactive elements

## Performance Considerations

### Optimization Strategies

1. **Conditional Rendering:** Only render action buttons when `isPinned` is true
2. **CSS Animations:** Use GPU-accelerated transforms for smooth transitions
3. **Event Debouncing:** Not needed (simple toggle, no rapid firing)
4. **Memoization:** Not needed (simple component, minimal re-renders)

### Bundle Size Impact

- New code: ~150 lines TypeScript
- New CSS: ~80 lines
- No new dependencies
- Estimated impact: < 2KB gzipped

## Security Considerations

### Logout Security

1. **Session Cleanup:** Clear all tokens and session data
2. **API Call:** Invalidate server-side session
3. **Redirect:** Force navigation to login page
4. **Cache Clear:** Remove any cached user data

### Shutdown Security

1. **Confirmation:** Require user confirmation before shutdown
2. **Environment Check:** Only allow shutdown in Electron/desktop mode
3. **Graceful Exit:** Save any pending data before closing
4. **No Data Exposure:** Don't log sensitive information during shutdown

## Implementation Notes

### Electron Integration

For desktop app shutdown functionality:

```typescript
const handleShutdown = async () => {
  const confirmed = window.confirm('Are you sure you want to shutdown the application?');
  if (!confirmed) return;

  // Check if running in Electron
  if (typeof window !== 'undefined' && window.electron) {
    try {
      await window.electron.quit();
    } catch (error) {
      console.error('Shutdown failed:', error);
      alert('Unable to shutdown application');
    }
  } else {
    // Browser fallback
    alert('Please close the browser tab to exit');
  }
};
```

### Browser Fallback

In browser mode, the shutdown button will:
1. Show a message explaining to close the tab
2. Optionally trigger `window.close()` (may be blocked by browsers)
3. Log the user out as a secondary action

## Design Decisions and Rationales

### Why a Pin Toggle?

**Decision:** Use a toggleable pin button instead of always-visible buttons

**Rationale:**
- Reduces visual clutter in the navigation bar
- Provides progressive disclosure of advanced actions
- Maintains clean UI for primary workflows
- Follows common pattern in modern applications (e.g., VS Code, Slack)

### Why Red Pin Icon?

**Decision:** Use red color for the pin toggle

**Rationale:**
- Red indicates "important/system actions"
- Visually distinct from gold theme (won't be confused with primary actions)
- Matches the danger/warning nature of shutdown
- Provides clear visual affordance

### Why Sticky Instead of Static?

**Decision:** Keep existing fixed positioning (already sticky)

**Rationale:**
- Navigation bar is already `position: fixed`
- Provides consistent access to navigation
- Improves UX on long pages (clients, documents lists)
- Standard pattern in modern web applications

### Button Ordering

**Decision:** Pin Toggle → Shutdown → Logout → User Display

**Rationale:**
- Pin toggle first (controls visibility of others)
- Shutdown before logout (more destructive action, less common)
- Logout near user display (logical grouping)
- Left-to-right progression of severity

## Migration Path

### Phase 1: Core Implementation
1. Add pin toggle button
2. Add state management
3. Add logout button with AuthContext integration

### Phase 2: Shutdown Feature
1. Add shutdown button
2. Implement Electron detection
3. Add confirmation dialog

### Phase 3: Polish
1. Add CSS animations
2. Implement responsive behavior
3. Add accessibility features

### Phase 4: Testing
1. Write unit tests
2. Perform manual testing
3. Gather user feedback
