import { lazy } from 'react';

// Lazy load page components
export const LazyDashboard = lazy(() => import('../app/dashboard/page'));
export const LazyClients = lazy(() => import('../app/clients/page'));
export const LazyClientDetail = lazy(() => import('../app/clients/[id]/page'));
export const LazyClientNew = lazy(() => import('../app/clients/new/page'));
export const LazyPeople = lazy(() => import('../app/people/page'));
export const LazyPeopleNew = lazy(() => import('../app/people/new/page'));
export const LazyServices = lazy(() => import('../app/services/page'));
export const LazyServiceDetail = lazy(() => import('../app/services/[id]/page'));
export const LazyServiceNew = lazy(() => import('../app/services/new/page'));
export const LazyTasks = lazy(() => import('../app/tasks/page'));
export const LazyTaskDetail = lazy(() => import('../app/tasks/[id]/page'));
export const LazyTaskNew = lazy(() => import('../app/tasks/new/page'));
export const LazyCompliance = lazy(() => import('../app/compliance/page'));
export const LazyComplianceDetail = lazy(() => import('../app/compliance/[id]/page'));
export const LazyComplianceNew = lazy(() => import('../app/compliance/new/page'));
export const LazyDocuments = lazy(() => import('../app/documents/page'));
export const LazyDocumentDetail = lazy(() => import('../app/documents/[id]/page'));
export const LazyDocumentReports = lazy(() => import('../app/documents/reports/page'));
export const LazyCalendar = lazy(() => import('../app/calendar/page'));
export const LazyCalendarEventDetail = lazy(() => import('../app/calendar/events/[id]/page'));
export const LazyCalendarEventEdit = lazy(() => import('../app/calendar/events/[id]/edit/page'));
export const LazyCalendarEventNew = lazy(() => import('../app/calendar/new/page'));
export const LazyCompaniesHouse = lazy(() => import('../app/companies-house/page'));
export const LazyCompaniesHouseSync = lazy(() => import('../app/companies-house/sync/page'));
export const LazySettings = lazy(() => import('../app/settings/page'));
export const LazyAudit = lazy(() => import('../app/audit/page'));

// Lazy load UI components
export const LazyMDJAssist = lazy(() => import('./mdj-ui/MDJAssist').then(module => ({ default: module.MDJAssist })));
export const LazyMDJAssistDrawer = lazy(() => import('./mdj-ui/MDJAssistDrawer').then(module => ({ default: module.MDJAssistDrawer })));
export const LazyMDJAssistChat = lazy(() => import('./mdj-ui/MDJAssistChat').then(module => ({ default: module.MDJAssistChat })));
export const LazyMDJReportsPanel = lazy(() => import('./mdj-ui/MDJReportsPanel').then(module => ({ default: module.MDJReportsPanel })));
export const LazyMDJPriorityRecommendations = lazy(() => import('./mdj-ui/MDJPriorityRecommendations').then(module => ({ default: module.MDJPriorityRecommendations })));
export const LazyMDJWeekAheadView = lazy(() => import('./mdj-ui/MDJWeekAheadView').then(module => ({ default: module.MDJReportsPanel as any })));
export const LazyMDJQueryTemplates = lazy(() => import('./mdj-ui/MDJQueryTemplates').then(module => ({ default: module.MDJQueryTemplates })));

// Loading component
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
    <span className="ml-2 text-text-secondary">Loading...</span>
  </div>
);

// Error boundary component
export const LazyErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="p-4">
      {children}
    </div>
  );
};
