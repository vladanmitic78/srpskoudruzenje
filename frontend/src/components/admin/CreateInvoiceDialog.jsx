import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';

/**
 * Create Invoice Dialog Component
 * Supports multi-member invoice creation with search and quick select options
 */
const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  users,
  invoices,
  onCreateInvoice,
  t = (key) => key // Translation function with fallback
}) => {
  const [newInvoice, setNewInvoice] = useState({
    userIds: [],
    amount: '',
    dueDate: '',
    description: ''
  });
  const [memberSearch, setMemberSearch] = useState('');

  const handleCreate = async () => {
    await onCreateInvoice(newInvoice);
    // Reset form
    setNewInvoice({ userIds: [], amount: '', dueDate: '', description: '' });
    setMemberSearch('');
  };

  const filteredMembers = users
    .filter(u => u.role === 'user')
    .filter(u => {
      if (!memberSearch) return true;
      const search = memberSearch.toLowerCase();
      return u.fullName?.toLowerCase().includes(search) || 
             u.email?.toLowerCase().includes(search);
    });

  const selectAll = () => {
    const allIds = filteredMembers.map(u => u.id);
    setNewInvoice({ ...newInvoice, userIds: allIds });
  };

  const selectWithoutUnpaid = () => {
    const membersWithUnpaid = invoices
      .filter(inv => inv.status === 'unpaid')
      .map(inv => inv.userId);
    const eligible = filteredMembers
      .filter(u => !membersWithUnpaid.includes(u.id))
      .map(u => u.id);
    setNewInvoice({ ...newInvoice, userIds: eligible });
  };

  const toggleMember = (userId, checked) => {
    if (checked) {
      setNewInvoice({ ...newInvoice, userIds: [...newInvoice.userIds, userId] });
    } else {
      setNewInvoice({ ...newInvoice, userIds: newInvoice.userIds.filter(id => id !== userId) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <p className="text-sm text-gray-500">Select one or more members to create invoices</p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Members</label>
            
            <Input
              type="text"
              placeholder="Search members by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="mb-2"
            />
            
            {/* Selected count */}
            {newInvoice.userIds.length > 0 && (
              <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {newInvoice.userIds.length} member(s) selected
                </span>
                <button
                  onClick={() => setNewInvoice({ ...newInvoice, userIds: [] })}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
              </div>
            )}
            
            {/* Member checkboxes */}
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
              {filteredMembers.map(user => (
                <label 
                  key={user.id} 
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={newInvoice.userIds.includes(user.id)}
                    onChange={(e) => toggleMember(user.id, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{user.fullName}</span>
                    <span className="text-sm text-gray-500 ml-2">({user.email})</span>
                  </div>
                </label>
              ))}
              {filteredMembers.length === 0 && (
                <p className="text-gray-500 text-sm p-2">No members found</p>
              )}
            </div>
            
            {/* Quick select buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={selectWithoutUnpaid}
                className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200"
              >
                Select Without Unpaid
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <input
              type="text"
              value={newInvoice.description}
              onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
              placeholder="e.g., Članarina 2025 / Membership Fee 2025"
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount (SEK)</label>
              <input
                type="number"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                placeholder="500"
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleCreate}
              disabled={newInvoice.userIds.length === 0 || !newInvoice.amount || !newInvoice.dueDate || !newInvoice.description}
              className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {newInvoice.userIds.length > 1 
                ? `Create ${newInvoice.userIds.length} Invoices` 
                : 'Create Invoice'}
            </button>
            <button
              onClick={() => {
                onOpenChange(false);
                setNewInvoice({ userIds: [], amount: '', dueDate: '', description: '' });
                setMemberSearch('');
              }}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceDialog;
