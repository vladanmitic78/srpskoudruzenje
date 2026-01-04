import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { adminAPI } from '../../services/api';
import { toast } from 'sonner';

export const MembersTab = ({
  t,
  users,
  setUsers,
  loading,
  permissions,
  setSelectedUser,
  setUserDetailsOpen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 10;

  // Export handlers
  const handleExportPDF = async () => {
    try {
      const blob = await adminAPI.exportMembersPDF();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await adminAPI.exportMembersExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
    }
  };

  const handleExportXML = async () => {
    try {
      const blob = await adminAPI.exportMembersXML();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members_${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('XML exported successfully');
    } catch (error) {
      toast.error('Failed to export XML');
    }
  };

  const handleViewDetails = async (user) => {
    try {
      const details = await adminAPI.getUserDetails(user.id);
      setSelectedUser(details);
      setUserDetailsOpen(true);
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.fullName}?`)) {
      try {
        await adminAPI.deleteUser(user.id);
        toast.success('Member deleted successfully');
        const usersData = await adminAPI.getUsers();
        setUsers(usersData.users || []);
      } catch (error) {
        toast.error('Failed to delete member');
      }
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredUsers.slice(indexOfFirstMember, indexOfLastMember);
  const totalPages = Math.ceil(filteredUsers.length / membersPerPage);

  if (!permissions?.viewMembers) return null;

  return (
    <TabsContent value="members">
      <Card className="border-2 border-[var(--color-primary)]/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('admin.membersManagement')}</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] text-sm"
            >
              {t('admin.actions.exportPDF')}
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              {t('admin.actions.exportExcel')}
            </button>
            <button
              onClick={handleExportXML}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              {t('admin.actions.exportXML')}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Field */}
          <div className="mb-6">
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
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading members...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'No members found matching your search.' : 'No members yet.'}
              </p>
            ) : (
              <>
                {/* Member List */}
                {currentMembers.map((user) => (
                  <div key={user.id} className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{user.fullName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.phone || 'No phone'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          {t('admin.actions.viewDetails')}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          {t('admin.actions.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {indexOfFirstMember + 1} to {Math.min(indexOfLastMember, filteredUsers.length)} of {filteredUsers.length} members
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      
                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            return page === 1 || 
                                   page === totalPages || 
                                   (page >= currentPage - 1 && page <= currentPage + 1);
                          })
                          .map((page, index, array) => {
                            const prevPage = array[index - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;
                            
                            return (
                              <React.Fragment key={page}>
                                {showEllipsis && (
                                  <span className="px-3 py-1 text-gray-500">...</span>
                                )}
                                <Button
                                  onClick={() => setCurrentPage(page)}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  className={currentPage === page ? "bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]" : ""}
                                >
                                  {page}
                                </Button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default MembersTab;
