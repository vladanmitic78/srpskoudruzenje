/**
 * Admin Components Index
 * Central export point for all admin-related components
 * 
 * Usage: import { CreateInvoiceDialog, MemberFilters } from '../components/admin';
 */

export { default as CreateInvoiceDialog } from './CreateInvoiceDialog';
export { default as MemberFilters, filterMembers } from './MemberFilters';
export { default as StatisticsCards } from './StatisticsCards';
export { default as InvoiceDetailsModal } from './InvoiceDetailsModal';
export { default as UserImpersonation } from './UserImpersonation';

// New tab components - extracted from AdminDashboard.js
export { default as BrandingTab } from './BrandingTab';
export { default as EventsTab } from './EventsTab';

// Future components to be extracted:
// - MembersTab
// - InvoicesTab
// - ContentTab
// - SettingsTab
// - UserManagementTab
// - PlatformSettingsTab

