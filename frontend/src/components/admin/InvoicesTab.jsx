import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TabsContent } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { invoicesAPI } from '../../services/api';
import { toast } from 'sonner';

export const InvoicesTab = ({
  t,
  invoices,
  setInvoices,
  users,
  loading,
  permissions
}) => {
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    userIds: [],
    amount: '',
    dueDate: '',
    description: '',
    trainingGroup: ''
  });
  const [memberFilter, setMemberFilter] = useState({
    invoiceId: '',
    paymentStatus: 'all',
    trainingGroup: 'all'
  });
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);

  // Get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : 'Unknown User';
  };

  // Get names for multiple user IDs
  const getUserNames = (userIds) => {
    if (!userIds || userIds.length === 0) return 'No members';
    return userIds.map(id => getUserName(id)).join(', ');
  };

  // Get unique training groups from users
  const trainingGroups = [...new Set(users.filter(u => u.trainingGroup).map(u => u.trainingGroup))];

  // Filter invoices based on memberFilter
  const getFilteredInvoices = () => {
    let filtered = [...invoices];
    
    if (memberFilter.invoiceId) {
      filtered = filtered.filter(inv => inv.id === memberFilter.invoiceId);
    }
    
    if (memberFilter.paymentStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === memberFilter.paymentStatus);
    }
    
    if (memberFilter.trainingGroup !== 'all') {
      const usersInGroup = users.filter(u => u.trainingGroup === memberFilter.trainingGroup).map(u => u.id);
      filtered = filtered.filter(inv => {
        const invoiceUserIds = inv.userIds || (inv.userId ? [inv.userId] : []);
        return invoiceUserIds.some(uid => usersInGroup.includes(uid));
      });
    }
    
    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  // Handle member filter download
  const handleDownloadFilteredMembers = async () => {
    try {
      const params = new URLSearchParams();
      if (memberFilter.invoiceId) params.append('invoice_id', memberFilter.invoiceId);
      if (memberFilter.paymentStatus !== 'all') params.append('payment_status', memberFilter.paymentStatus);
      if (memberFilter.trainingGroup !== 'all') params.append('training_group', memberFilter.trainingGroup);
      params.append('export_format', 'excel');
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/members/filtered?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered_members_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Members exported successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download members');
    }
  };

  // Fetch filtered members when filter changes
  const fetchFilteredMembers = async () => {
    if (memberFilter.paymentStatus === 'all' && memberFilter.trainingGroup === 'all' && !memberFilter.invoiceId) {
      setFilteredMembers([]);
      return;
    }
    
    setFilterLoading(true);
    try {
      const params = new URLSearchParams();
      if (memberFilter.invoiceId) params.append('invoice_id', memberFilter.invoiceId);
      if (memberFilter.paymentStatus !== 'all') params.append('payment_status', memberFilter.paymentStatus);
      if (memberFilter.trainingGroup !== 'all') params.append('training_group', memberFilter.trainingGroup);
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/members/filtered?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setFilteredMembers(data.members || []);
      }
    } catch (error) {
      console.error('Filter error:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredMembers();
  }, [memberFilter]);

  // Handle create invoice
  const handleCreateInvoice = async () => {
    try {
      const invoiceData = {
        userIds: newInvoice.userIds,
        amount: parseFloat(newInvoice.amount),
        dueDate: newInvoice.dueDate,
        description: newInvoice.description,
        trainingGroup: newInvoice.trainingGroup || null
      };
      await invoicesAPI.create(invoiceData);
      toast.success('Invoice created successfully');
      setCreateInvoiceOpen(false);
      setNewInvoice({ userIds: [], amount: '', dueDate: '', description: '', trainingGroup: '' });
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  // Handle update invoice
  const handleUpdateInvoice = async () => {
    try {
      await invoicesAPI.update(editingInvoice.id, editingInvoice);
      toast.success('Invoice updated successfully');
      setEditInvoiceOpen(false);
      setEditingInvoice(null);
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = async (invoice) => {
    try {
      await invoicesAPI.update(invoice.id, { ...invoice, status: 'paid', paymentDate: new Date().toISOString().split('T')[0] });
      toast.success('Invoice marked as paid');
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to mark invoice as paid');
    }
  };

  // Handle delete invoice
  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoicesAPI.delete(invoiceId);
      toast.success('Invoice deleted successfully');
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  // Handle file upload
  const handleFileUpload = async (invoiceId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await invoicesAPI.uploadFile(invoiceId, formData);
      toast.success('File uploaded successfully');
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  if (!permissions?.manageInvoices) return null;

  return (
    <TabsContent value="invoices">
      <Card className="border-2 border-[var(--color-primary)]/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('admin.invoicesManagement')}</CardTitle>
          <button
            onClick={() => setCreateInvoiceOpen(true)}
            className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
          >
            {t('admin.createInvoice')}
          </button>
        </CardHeader>
        <CardContent>
          {/* Member Filter Section */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.filter.title')}</h4>
              {(memberFilter.invoiceId || memberFilter.paymentStatus !== 'all' || memberFilter.trainingGroup !== 'all') && (
                <button
                  onClick={() => setMemberFilter({ invoiceId: '', paymentStatus: 'all', trainingGroup: 'all' })}
                  className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                  ✕ {t('admin.filter.clearFilters')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('admin.filter.byInvoice')}</label>
                <select
                  value={memberFilter.invoiceId}
                  onChange={(e) => setMemberFilter({...memberFilter, invoiceId: e.target.value})}
                  className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">{t('admin.filter.allInvoices')}</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.description} ({inv.dueDate})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('admin.filter.paymentStatus')}</label>
                <select
                  value={memberFilter.paymentStatus}
                  onChange={(e) => setMemberFilter({...memberFilter, paymentStatus: e.target.value})}
                  className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">{t('admin.filter.all')}</option>
                  <option value="paid">{t('admin.filter.paid')}</option>
                  <option value="unpaid">{t('admin.filter.unpaid')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('admin.filter.trainingGroup')}</label>
                <select
                  value={memberFilter.trainingGroup}
                  onChange={(e) => setMemberFilter({...memberFilter, trainingGroup: e.target.value})}
                  className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">{t('admin.filter.allGroups')}</option>
                  {trainingGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleDownloadFilteredMembers}
                  disabled={filteredMembers.length === 0}
                  className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>📥</span> {t('admin.filter.downloadExcel')} ({filteredMembers.length})
                </button>
              </div>
            </div>
            
            {/* Filtered Members Preview */}
            {(memberFilter.paymentStatus !== 'all' || memberFilter.trainingGroup !== 'all' || memberFilter.invoiceId) && (
              <div className="mt-4 border-t pt-4">
                <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('admin.filter.filteredMembers') || 'Filtered Members'}: {filterLoading ? '...' : filteredMembers.length}
                </h5>
                {filterLoading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('admin.filter.noMembersFound') || 'No members match the selected filters'}</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {filteredMembers.map((member, index) => (
                        <span 
                          key={member.id || index} 
                          className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                        >
                          {member.fullName}
                          {member.trainingGroup && (
                            <span className="ml-1 text-blue-600 dark:text-blue-400">[{member.trainingGroup}]</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Invoice count indicator */}
          {(memberFilter.invoiceId || memberFilter.paymentStatus !== 'all' || memberFilter.trainingGroup !== 'all') && invoices.length > 0 && (
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              {t('admin.filter.showingFiltered')}: <span className="font-semibold">{filteredInvoices.length}</span> / {invoices.length} {t('admin.tabs.invoices').toLowerCase()}
            </div>
          )}
          
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-600 dark:text-gray-400">{t('admin.loadingInvoices')}</p>
            ) : invoices.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">{t('admin.noInvoicesFound')}</p>
            ) : filteredInvoices.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">{t('admin.filter.noInvoicesMatchFilter') || 'No invoices match the selected filters'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="p-3 text-left">{t('admin.tableHeaders.member')}</th>
                      <th className="p-3 text-left">{t('admin.tableHeaders.description')}</th>
                      <th className="p-3 text-left">{t('admin.tableHeaders.amount')}</th>
                      <th className="p-3 text-left">{t('admin.tableHeaders.dueDate')}</th>
                      <th className="p-3 text-left">{t('admin.tableHeaders.paymentDate')}</th>
                      <th className="p-3 text-left">{t('admin.tableHeaders.status')}</th>
                      <th className="p-3 text-left">{t('admin.tableHeaders.file')}</th>
                      <th className="p-3 text-left">{t('admin.tableHeaders.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">
                              {invoice.userIds && invoice.userIds.length > 0 
                                ? getUserNames(invoice.userIds)
                                : invoice.userId 
                                  ? getUserName(invoice.userId)
                                  : 'No members'
                              }
                            </p>
                            <p className="text-xs text-gray-500">
                              {invoice.userIds && invoice.userIds.length > 1 
                                ? `${invoice.userIds.length} members`
                                : invoice.userIds?.[0] || invoice.userId || ''
                              }
                            </p>
                          </div>
                        </td>
                        <td className="p-3">{invoice.description}</td>
                        <td className="p-3">{invoice.amount} {invoice.currency}</td>
                        <td className="p-3">{invoice.dueDate}</td>
                        <td className="p-3">{invoice.paymentDate || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {t(`admin.status.${invoice.status}`)}
                          </span>
                        </td>
                        <td className="p-3">
                          {invoice.fileUrl ? (
                            <a 
                              href={`${process.env.REACT_APP_BACKEND_URL}${invoice.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              📄 {t('admin.actions.download')}
                            </a>
                          ) : (
                            <label className="cursor-pointer text-blue-600 hover:underline text-sm">
                              📤 {t('admin.actions.upload')}
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(invoice.id, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingInvoice(invoice);
                                setEditInvoiceOpen(true);
                              }}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {t('admin.actions.edit')}
                            </button>
                            {invoice.status !== 'paid' && (
                              <button
                                onClick={() => handleMarkAsPaid(invoice)}
                                className="text-green-600 hover:underline text-sm"
                              >
                                {t('admin.actions.markPaid')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:underline text-sm"
                            >
                              {t('admin.actions.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Members (Multiple)</label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
                <div className="mb-2 pb-2 border-b text-sm text-gray-600 dark:text-gray-400">
                  {newInvoice.userIds.length} member(s) selected
                </div>
                <div className="mb-2 pb-2 border-b">
                  <label className="block text-xs font-medium mb-1 text-gray-500">Quick Select by Training Group:</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const groupUsers = users.filter(u => u.role === 'user' && u.trainingGroup === e.target.value);
                        const groupUserIds = groupUsers.map(u => u.id);
                        setNewInvoice({...newInvoice, userIds: [...new Set([...newInvoice.userIds, ...groupUserIds])], trainingGroup: e.target.value});
                      }
                    }}
                    className="w-full p-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select a group to add all members...</option>
                    {trainingGroups.map(group => (
                      <option key={group} value={group}>
                        {group} ({users.filter(u => u.role === 'user' && u.trainingGroup === group).length} members)
                      </option>
                    ))}
                  </select>
                </div>
                {users.filter(u => u.role === 'user').map(user => (
                  <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newInvoice.userIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewInvoice({...newInvoice, userIds: [...newInvoice.userIds, user.id]});
                        } else {
                          setNewInvoice({...newInvoice, userIds: newInvoice.userIds.filter(id => id !== user.id)});
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">
                      {user.fullName} 
                      <span className="text-gray-500 ml-1">({user.email})</span>
                      {user.trainingGroup && <span className="text-xs ml-1 text-blue-600">[{user.trainingGroup}]</span>}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewInvoice({...newInvoice, userIds: users.filter(u => u.role === 'user').map(u => u.id)})}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setNewInvoice({...newInvoice, userIds: []})}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                placeholder="e.g., Membership Fee - January 2025"
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Amount (SEK)</label>
              <input
                type="number"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                placeholder="500"
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleCreateInvoice}
                disabled={newInvoice.userIds.length === 0 || !newInvoice.amount || !newInvoice.dueDate || !newInvoice.description}
                className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Invoice ({newInvoice.userIds.length} members)
              </button>
              <button
                onClick={() => setCreateInvoiceOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editInvoiceOpen} onOpenChange={setEditInvoiceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          {editingInvoice && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Member(s)</label>
                <div className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 text-sm">
                  {editingInvoice.userIds && editingInvoice.userIds.length > 0 
                    ? getUserNames(editingInvoice.userIds)
                    : editingInvoice.userId 
                      ? getUserName(editingInvoice.userId)
                      : 'No members'
                  }
                </div>
                <p className="text-xs text-gray-500 mt-1">Members cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={editingInvoice.description}
                  onChange={(e) => setEditingInvoice({...editingInvoice, description: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Amount (SEK)</label>
                <input
                  type="number"
                  value={editingInvoice.amount}
                  onChange={(e) => setEditingInvoice({...editingInvoice, amount: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <input
                  type="date"
                  value={editingInvoice.dueDate}
                  onChange={(e) => setEditingInvoice({...editingInvoice, dueDate: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={editingInvoice.status}
                  onChange={(e) => setEditingInvoice({...editingInvoice, status: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdateInvoice}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditInvoiceOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
};

export default InvoicesTab;
