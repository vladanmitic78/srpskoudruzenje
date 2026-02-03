import React from 'react';
import { Input } from '../ui/input';
import { toast } from 'sonner';

/**
 * Member Filters Component
 * Provides advanced filtering for member list with CSV download
 */
const MemberFilters = ({
  searchQuery,
  setSearchQuery,
  memberFilters,
  setMemberFilters,
  users,
  invoices,
  setCurrentPage,
  t = (key) => key
}) => {
  const hasActiveFilters = memberFilters.invoiceStatus !== 'all' || 
                           memberFilters.hasFamily !== 'all' || 
                           searchQuery;

  const clearFilters = () => {
    setMemberFilters({
      invoiceStatus: 'all',
      membershipType: 'all',
      trainingGroup: 'all',
      hasFamily: 'all'
    });
    setSearchQuery('');
    setCurrentPage(1);
  };

  const downloadFilteredList = () => {
    // Get filtered users based on current filters
    const filteredForDownload = users.filter(user => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (!(user.fullName?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.username?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      // Invoice status filter
      if (memberFilters.invoiceStatus !== 'all') {
        const userInvoices = invoices.filter(inv => inv.userId === user.id);
        if (memberFilters.invoiceStatus === 'paid' && !userInvoices.some(inv => inv.status === 'paid')) return false;
        if (memberFilters.invoiceStatus === 'unpaid' && !userInvoices.some(inv => inv.status === 'unpaid')) return false;
        if (memberFilters.invoiceStatus === 'none' && userInvoices.length > 0) return false;
      }
      // Family filter
      if (memberFilters.hasFamily !== 'all') {
        const hasFamily = user.familyMembers && user.familyMembers.length > 0;
        if (memberFilters.hasFamily === 'yes' && !hasFamily) return false;
        if (memberFilters.hasFamily === 'no' && hasFamily) return false;
      }
      return true;
    });
    
    // Create CSV
    const headers = ['Name', 'Email', 'Phone', 'Invoice Status', 'Family Members'];
    const rows = filteredForDownload.map(user => {
      const userInvoices = invoices.filter(inv => inv.userId === user.id);
      const hasUnpaid = userInvoices.some(inv => inv.status === 'unpaid');
      const invoiceStatus = userInvoices.length === 0 ? 'No invoices' : (hasUnpaid ? 'Has unpaid' : 'All paid');
      const familyCount = user.familyMembers?.length || 0;
      return [
        user.fullName || '',
        user.email || '',
        user.phone || '',
        invoiceStatus,
        familyCount
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filtered_members_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success(`Downloaded ${filteredForDownload.length} members`);
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search Field */}
      <Input
        type="text"
        placeholder={t('admin.searchMembers') || 'Search members by name, email, or username...'}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
        }}
        className="max-w-md"
      />
      
      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={memberFilters.invoiceStatus}
          onChange={(e) => {
            setMemberFilters({ ...memberFilters, invoiceStatus: e.target.value });
            setCurrentPage(1);
          }}
          className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="all">All Invoice Status</option>
          <option value="paid">✅ Paid</option>
          <option value="unpaid">⚠️ Unpaid</option>
          <option value="none">📭 No Invoices</option>
        </select>
        
        <select
          value={memberFilters.hasFamily}
          onChange={(e) => {
            setMemberFilters({ ...memberFilters, hasFamily: e.target.value });
            setCurrentPage(1);
          }}
          className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="all">All Members</option>
          <option value="yes">👨‍👩‍👧 Has Family</option>
          <option value="no">👤 Individual</option>
        </select>
        
        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕ Clear Filters
          </button>
        )}
        
        {/* Download Filtered List */}
        <button
          onClick={downloadFilteredList}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
        >
          📥 Download List
        </button>
      </div>
    </div>
  );
};

/**
 * Filter members based on search query and filter settings
 */
export const filterMembers = (users, invoices, searchQuery, memberFilters) => {
  return users.filter(user => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (!(user.fullName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    
    // Invoice status filter
    if (memberFilters.invoiceStatus !== 'all') {
      const userInvoices = invoices.filter(inv => inv.userId === user.id);
      if (memberFilters.invoiceStatus === 'paid') {
        if (!userInvoices.some(inv => inv.status === 'paid')) return false;
      }
      if (memberFilters.invoiceStatus === 'unpaid') {
        if (!userInvoices.some(inv => inv.status === 'unpaid')) return false;
      }
      if (memberFilters.invoiceStatus === 'none') {
        if (userInvoices.length > 0) return false;
      }
    }
    
    // Family filter
    if (memberFilters.hasFamily !== 'all') {
      const hasFamily = user.familyMembers && user.familyMembers.length > 0;
      if (memberFilters.hasFamily === 'yes' && !hasFamily) return false;
      if (memberFilters.hasFamily === 'no' && hasFamily) return false;
    }
    
    return true;
  });
};

export default MemberFilters;
