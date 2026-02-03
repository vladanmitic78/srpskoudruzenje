import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

/**
 * User Impersonation Component
 * Allows Super Admins to log in as any user to troubleshoot issues
 */
const UserImpersonation = ({
  users,
  currentUser,
  onImpersonate,
  t = (key) => key
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Only show for superadmin
  if (currentUser?.role !== 'superadmin') {
    return null;
  }

  const filteredUsers = users.filter(user => {
    if (user.role === 'superadmin') return false; // Can't impersonate superadmins
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );
  });

  const handleImpersonate = async (user) => {
    setIsLoading(true);
    try {
      await onImpersonate(user.id);
      setIsOpen(false);
      toast.success(`Now viewing as ${user.fullName || user.email}`);
    } catch (error) {
      toast.error('Failed to impersonate user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
        title="View site as another user"
      >
        👤 Impersonate User
      </button>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔐 User Impersonation
            </DialogTitle>
            <p className="text-sm text-gray-500">
              View the site as another user to troubleshoot issues. This action is logged.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Warning Banner */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Important:</strong> All impersonation sessions are logged for security. 
                You will be logged in as the selected user until you log out.
              </p>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            />

            {/* User List */}
            <div className="flex-1 overflow-y-auto border rounded-lg divide-y dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <p className="p-4 text-gray-500 text-center">No users found</p>
              ) : (
                filteredUsers.slice(0, 50).map(user => (
                  <div 
                    key={user.id} 
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{user.fullName || user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        user.role === 'admin' 
                          ? 'bg-blue-100 text-blue-800' 
                          : user.role === 'moderator'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleImpersonate(user)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'View As'}
                    </button>
                  </div>
                ))
              )}
            </div>

            {filteredUsers.length > 50 && (
              <p className="text-xs text-gray-500 text-center">
                Showing first 50 results. Use search to find specific users.
              </p>
            )}
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserImpersonation;
