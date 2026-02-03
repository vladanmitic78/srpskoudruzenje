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

// Future components to be extracted from AdminDashboard.js:
// - InvoiceTable
// - MemberCard
// - BankDetailsForm
// - EventManagement
// - NewsManagement
// - GalleryManagement
// - PlatformSettings
// - BrandingSettings
