import React from 'react';

/**
 * Impersonation Banner Component
 * Shows a warning banner when Super Admin is viewing the site as another user
 */
const ImpersonationBanner = () => {
  const isImpersonating = localStorage.getItem('is_impersonating') === 'true';
  
  if (!isImpersonating) return null;

  const impersonatedUser = JSON.parse(localStorage.getItem('impersonated_user') || '{}');

  const handleExitImpersonation = () => {
    // Restore original admin token
    const originalToken = localStorage.getItem('original_admin_token');
    
    if (originalToken) {
      localStorage.setItem('token', originalToken);
    }
    
    // Clear impersonation data
    localStorage.removeItem('original_admin_token');
    localStorage.removeItem('is_impersonating');
    localStorage.removeItem('impersonated_user');
    
    // Redirect to admin dashboard
    window.location.href = '/admin';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-purple-600 text-white py-2 px-4 flex items-center justify-between shadow-lg" data-testid="impersonation-banner">
      <div className="flex items-center gap-2">
        <span className="text-lg">👤</span>
        <span className="font-medium">
          Viewing as: <strong>{impersonatedUser.fullName || impersonatedUser.email}</strong>
        </span>
        <span className="text-xs opacity-75 ml-2">
          ({impersonatedUser.role})
        </span>
      </div>
      <button
        onClick={handleExitImpersonation}
        className="px-4 py-1 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors text-sm"
      >
        ✕ Exit Impersonation
      </button>
    </div>
  );
};

export default ImpersonationBanner;
