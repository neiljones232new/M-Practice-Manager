# Implementation Plan

- [x] 1. Add CSS styles for pin toggle and action buttons
  - Add `.mdj-pin-toggle` styles with red theme and rotation animation
  - Add `.mdj-action-buttons` container with slide-in animation
  - Add `.btn-action-compact` styles for shutdown and logout buttons
  - Add responsive styles for mobile/tablet/desktop breakpoints
  - _Requirements: 1.1, 1.3, 2.4, 5.5_

- [x] 2. Implement pin toggle state management in MDJLayout
  - Add `useState` hook for `isPinned` boolean state
  - Create `handlePinToggle` function to toggle state
  - Import `useAuth` hook from AuthContext
  - Import `useRouter` from Next.js navigation
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Add pin toggle button to topbar
  - Add pin toggle button in `.mdj-topbar-right` section
  - Use 📌 emoji as icon
  - Add ARIA labels for accessibility (`aria-label`, `aria-expanded`, `aria-controls`)
  - Apply rotation transform when `isPinned` is true
  - Add keyboard support (Enter/Space key handlers)
  - _Requirements: 2.1, 2.4, 5.1, 5.3_

- [x] 4. Implement logout button functionality
  - Create `handleLogout` async function
  - Call `logout()` from AuthContext
  - Add error handling with try-catch
  - Redirect to `/login` using router.push
  - Add conditional rendering based on `isPinned` state
  - Add button with 🚪 icon and "Logout" label
  - Add ARIA label for screen readers
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.4_

- [x] 5. Implement shutdown button functionality
  - Create `handleShutdown` async function
  - Add confirmation dialog using `window.confirm`
  - Detect Electron environment (`window.electron`)
  - Call `window.electron.quit()` if available
  - Add browser fallback with alert message
  - Add conditional rendering based on `isPinned` state
  - Add button with ⏻ icon and "Shutdown" label
  - Apply danger styling (`.danger` class)
  - Add ARIA label for screen readers
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2, 5.4_

- [x] 6. Add action buttons container with animation
  - Wrap shutdown and logout buttons in container div
  - Add `id="action-buttons"` for ARIA reference
  - Add `role="group"` and `aria-label="Session actions"`
  - Apply slide-in animation on mount
  - Position between pin toggle and user display
  - _Requirements: 2.2, 2.3, 5.3_

- [x] 7. Verify sticky navigation behavior
  - Confirm `.mdj-topbar` has `position: fixed` (already exists)
  - Test scrolling behavior on long pages
  - Verify z-index stacking (topbar above content)
  - Check that content offset accounts for fixed header
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. Add responsive behavior for mobile devices
  - Update button labels to icons-only on mobile (< 768px)
  - Reduce spacing between buttons on tablet (768px - 1024px)
  - Test pin toggle remains functional on all screen sizes
  - Verify touch targets are adequate (min 44px)
  - _Requirements: 5.5_

- [ ] 9. Test keyboard navigation and accessibility
  - Verify Tab key navigation order (pin → shutdown → logout → user)
  - Test Enter and Space key activation on all buttons
  - Test Escape key to close pinned buttons (optional enhancement)
  - Verify focus visible indicators appear
  - Test with screen reader (VoiceOver/NVDA)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Add TypeScript type definitions
  - Define interface for component state if needed
  - Add proper typing for event handlers
  - Ensure AuthContext types are imported correctly
  - Add type guards for Electron environment detection
  - _Requirements: All (code quality)_
