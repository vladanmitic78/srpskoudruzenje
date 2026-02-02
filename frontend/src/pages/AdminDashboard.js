import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useBranding } from '../context/BrandingContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Users, FileText, Calendar, Settings, BarChart, Palette, Upload, Mail, BookOpen, Server, UserCog, UsersRound } from 'lucide-react';
import { adminAPI, eventsAPI, invoicesAPI, newsAPI, contentAPI, storiesAPI, galleryAPI, settingsAPI, userAPI } from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import AdminFamilyManagement from '../components/AdminFamilyManagement';

// Admin Password Change Component
const AdminPasswordChangeForm = ({ t }) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('admin.settings.passwordMismatch'));
      return;
    }

    // Validate password length
    if (passwordData.newPassword.length < 8) {
      toast.error(t('admin.settings.passwordTooShort'));
      return;
    }

    try {
      const response = await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.success) {
        toast.success(t('admin.settings.passwordSuccess'));
        // Reset form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || t('admin.settings.passwordError');
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>{t('admin.settings.currentPassword')}</Label>
        <Input
          type={showPasswords ? "text" : "password"}
          value={passwordData.currentPassword}
          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t('admin.settings.newPassword')}</Label>
        <Input
          type={showPasswords ? "text" : "password"}
          value={passwordData.newPassword}
          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
          required
          minLength={8}
        />
        <p className="text-xs text-gray-500">{t('admin.settings.passwordMinLength')}</p>
      </div>
      <div className="space-y-2">
        <Label>{t('admin.settings.confirmPassword')}</Label>
        <Input
          type={showPasswords ? "text" : "password"}
          value={passwordData.confirmPassword}
          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
          required
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="showPasswordsAdmin"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="showPasswordsAdmin" className="text-sm text-gray-600 dark:text-gray-400">
          {t('admin.settings.showPasswords')}
        </label>
      </div>
      <Button type="submit" className="bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]">
        {t('admin.settings.changePasswordButton')}
      </Button>
    </form>
  );
};


// Admin Management Panel Component
const AdminManagementPanel = ({ t }) => {
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    fullName: '',
    role: 'admin'
  });

  // Load admins
  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllAdmins();
      setAdmins(response.admins || []);
      setFilteredAdmins(response.admins || []);
    } catch (error) {
      toast.error(t('admin.adminManagement.loadError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // Filter admins
  useEffect(() => {
    let filtered = [...admins];
    
    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(admin => admin.role === roleFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(admin =>
        admin.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredAdmins(filtered);
  }, [roleFilter, searchTerm, admins]);

  // Create admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createAdmin(newAdmin);
      toast.success(t('admin.adminManagement.createSuccess'));
      setCreateModalOpen(false);
      setNewAdmin({ email: '', fullName: '', role: 'admin' });
      loadAdmins();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('admin.adminManagement.createError');
      toast.error(errorMsg);
    }
  };

  // Update admin
  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateAdmin(selectedAdmin.id, {
        fullName: selectedAdmin.fullName,
        role: selectedAdmin.role,
        status: selectedAdmin.status
      });
      toast.success(t('admin.adminManagement.updateSuccess'));
      setEditModalOpen(false);
      setSelectedAdmin(null);
      loadAdmins();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('admin.adminManagement.updateError');
      toast.error(errorMsg);
    }
  };

  // Reset password
  const handleResetPassword = async (adminId) => {
    if (!window.confirm(t('admin.adminManagement.resetPasswordConfirm'))) return;
    
    try {
      await adminAPI.resetAdminPassword(adminId);
      toast.success(t('admin.adminManagement.resetPasswordSuccess'));
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('admin.adminManagement.resetPasswordError');
      toast.error(errorMsg);
    }
  };

  // Delete admin
  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm(t('admin.adminManagement.deleteConfirm'))) return;
    
    try {
      await adminAPI.deleteAdmin(adminId);
      toast.success(t('admin.adminManagement.deleteSuccess'));
      loadAdmins();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || t('admin.adminManagement.deleteError');
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]"
        >
          + {t('admin.adminManagement.createButton')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('admin.adminManagement.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="all">{t('admin.adminManagement.allRoles')}</option>
          <option value="admin">{t('admin.adminManagement.adminRole')}</option>
          <option value="moderator">{t('admin.adminManagement.moderatorRole')}</option>
          <option value="superadmin">{t('admin.adminManagement.superadminRole')}</option>
        </select>
      </div>

      {/* Admin List */}
      {loading ? (
        <p className="text-center py-8">{t('admin.adminManagement.loading')}</p>
      ) : filteredAdmins.length === 0 ? (
        <p className="text-center py-8 text-gray-500">{t('admin.adminManagement.noAdmins')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">{t('admin.adminManagement.name')}</th>
                <th className="text-left py-3 px-4">{t('admin.adminManagement.email')}</th>
                <th className="text-left py-3 px-4">{t('admin.adminManagement.role')}</th>
                <th className="text-left py-3 px-4">{t('admin.adminManagement.status')}</th>
                <th className="text-left py-3 px-4">{t('admin.adminManagement.createdAt')}</th>
                <th className="text-right py-3 px-4">{t('admin.adminManagement.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{admin.fullName}</td>
                  <td className="py-3 px-4">{admin.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      admin.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                      admin.role === 'admin' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {admin.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      admin.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {admin.status || 'active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    {admin.role !== 'superadmin' && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setEditModalOpen(true);
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          {t('admin.actions.edit')}
                        </Button>
                        <Button
                          onClick={() => handleResetPassword(admin.id)}
                          className="text-xs bg-yellow-600 hover:bg-yellow-700"
                        >
                          {t('admin.adminManagement.resetPassword')}
                        </Button>
                        <Button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="text-xs bg-red-600 hover:bg-red-700"
                        >
                          {t('admin.actions.delete')}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Admin Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.adminManagement.createTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.adminManagement.fullName')} *</Label>
              <Input
                required
                value={newAdmin.fullName}
                onChange={(e) => setNewAdmin({...newAdmin, fullName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.adminManagement.email')} *</Label>
              <Input
                type="email"
                required
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.adminManagement.role')} *</Label>
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="admin">{t('admin.adminManagement.adminRole')}</option>
                <option value="moderator">{t('admin.adminManagement.moderatorRole')}</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">
              {t('admin.adminManagement.createInfo')}
            </p>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]">
                {t('admin.adminManagement.createSubmit')}
              </Button>
              <Button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700"
              >
                {t('admin.actions.cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Modal */}
      {selectedAdmin && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.adminManagement.editTitle')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('admin.adminManagement.fullName')} *</Label>
                <Input
                  required
                  value={selectedAdmin.fullName}
                  onChange={(e) => setSelectedAdmin({...selectedAdmin, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.adminManagement.email')}</Label>
                <Input
                  type="email"
                  value={selectedAdmin.email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">{t('admin.adminManagement.emailNotEditable')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.adminManagement.role')} *</Label>
                <select
                  value={selectedAdmin.role}
                  onChange={(e) => setSelectedAdmin({...selectedAdmin, role: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="admin">{t('admin.adminManagement.adminRole')}</option>
                  <option value="moderator">{t('admin.adminManagement.moderatorRole')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.adminManagement.status')}</Label>
                <select
                  value={selectedAdmin.status || 'active'}
                  onChange={(e) => setSelectedAdmin({...selectedAdmin, status: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="active">{t('admin.adminManagement.statusActive')}</option>
                  <option value="inactive">{t('admin.adminManagement.statusInactive')}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)]">
                  {t('admin.adminManagement.updateSubmit')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700"
                >
                  {t('admin.actions.cancel')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};


const AdminDashboard = () => {
  const { isAdmin, isSuperAdmin, isModerator, user } = useAuth();
  const { t } = useLanguage();
  const { updateBranding } = useBranding();
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [activeTab, setActiveTab] = useState(isModerator ? "events" : "members");
  
  // Search and Pagination state for Members
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 10;
  const [invoices, setInvoices] = useState([]);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    userId: '',
    amount: '',
    dueDate: '',
    description: ''
  });
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    date: '',
    time: '',
    title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    location: '',
    description: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    status: 'active',
    cancellationReason: ''
  });

  // CMS State
  const [news, setNews] = useState([]);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [newsForm, setNewsForm] = useState({
    date: '',
    title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    text: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    image: '',
    video: ''
  });
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [aboutContent, setAboutContent] = useState({ 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' });
  const [stories, setStories] = useState([]);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [storyForm, setStoryForm] = useState({
    date: '',
    title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    text: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    image: '',
    video: '',
    url: ''
  });
  
  // Gallery State
  const [albums, setAlbums] = useState([]);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [albumForm, setAlbumForm] = useState({
    date: '',
    title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    description: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    place: '',
    images: [],
    videos: []
  });
  const [uploadingToAlbum, setUploadingToAlbum] = useState(null);
  
  // Settings State
  const [settings, setSettings] = useState({
    address: '',
    bankAccount: '',
    vatNumber: '',
    registrationNumber: '',
    contactEmail: '',
    contactPhone: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      youtube: '',
      snapchat: ''
    },
    visibility: {
      contactEmail: true,
      contactPhone: true,
      address: true,
      socialMediaFacebook: false,
      socialMediaInstagram: false,
      socialMediaYoutube: false,
      socialMediaSnapchat: false,
      orgNumber: true,
      vatNumber: true,
      bankAccount: true
    }
  });

  // Super Admin - User Management State
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    phone: '',
    address: '',
    yearOfBirth: ''
  });

  // Super Admin - Role Permissions State
  const [rolePermissions, setRolePermissions] = useState({
    admin: {
      viewMembers: true,
      manageEvents: true,
      manageInvoices: true,
      manageContent: true,
      manageGallery: true,
      manageSettings: true,
      manageUsers: false,
      accessDashboard: true
    },
    moderator: {
      viewMembers: false,
      manageEvents: true,
      manageInvoices: false,
      manageContent: true,
      manageGallery: true,
      manageSettings: false,
      manageUsers: false,
      accessDashboard: true
    },
    user: {
      viewMembers: false,
      manageEvents: false,
      manageInvoices: false,
      manageContent: false,
      manageGallery: false,
      manageSettings: false,
      manageUsers: false,
      accessDashboard: false
    }
  });

  // Super Admin - Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    siteName: 'Serbian Cultural Association',
    maintenanceMode: false,
    timezone: 'Europe/Stockholm',
    security: {
      minPasswordLength: 6,
      requireUppercase: false,
      requireNumbers: false,
      sessionTimeout: 7200,
      maxLoginAttempts: 5
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: ''
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      notifyAdminOnNewUser: true,
      notifyUserOnInvoice: true
    }
  });

  // Super Admin - Branding Settings State
  const [brandingSettings, setBrandingSettings] = useState({
    logo: '',
    heroBackground: {
      type: 'pattern',
      selectedId: 'serbian_swedish_2',
      customUrl: '',
      opacity: 0.15,
      availableBackgrounds: []
    },
    colors: {
      primary: '#C1272D',
      secondary: '#8B1F1F',
      buttonPrimary: '#C1272D',
      buttonHover: '#8B1F1F'
    },
    language: {
      default: 'sr',
      supported: ['sr', 'en', 'sv']
    },
    emailTemplates: {
      welcome: { subject: '', body: '' },
      invoice: { subject: '', body: '' },
      passwordReset: { subject: '', body: '' },
      eventRegistration: { subject: '', body: '' }
    }
  });

  // Super Admin - Bank Details for PDF Invoices
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountHolder: 'Srpsko Kulturno Udruženje Täby',
    iban: '',
    bicSwift: '',
    bankgiro: '',
    orgNumber: '',
    swish: ''
  });

  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiCalls = [
          adminAPI.getStatistics(),
          adminAPI.getUsers(),
          eventsAPI.getAll(),
          invoicesAPI.getAll(),
          newsAPI.getAll(100, 0),
          storiesAPI.getAll(),
          galleryAPI.getAll(),
          settingsAPI.get()
        ];
        
        // Super Admin only: fetch platform settings, branding, and permissions
        if (user?.role === 'superadmin') {
          const token = localStorage.getItem('token');
          apiCalls.push(
            fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/platform-settings`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/branding`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/permissions`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json())
          );
        }
        
        const results = await Promise.all(apiCalls);
        const [statsData, usersData, eventsData, invoicesData, newsData, storiesData, galleryData, settingsData, platformSettingsData, brandingSettingsData, permissionsData] = results;
        setStatistics(statsData);
        setUsers(usersData.users || []);
        setEvents(eventsData.events || []);
        setInvoices(invoicesData.invoices || []);
        setNews(newsData.news || []);
        setStories(storiesData.stories || []);
        setAlbums(galleryData.items || []);
        if (settingsData) {
          // Ensure visibility field exists with defaults
          setSettings({
            ...settingsData,
            visibility: settingsData.visibility || {
              contactEmail: true,
              contactPhone: true,
              address: true,
              socialMediaFacebook: false,
              socialMediaInstagram: false,
              socialMediaYoutube: false,
              socialMediaSnapchat: false,
              orgNumber: true,
              vatNumber: true,
              bankAccount: true
            }
          });
        }
        if (platformSettingsData && user?.role === 'superadmin') {
          setPlatformSettings(platformSettingsData);
        }
        if (brandingSettingsData && user?.role === 'superadmin') {
          setBrandingSettings(brandingSettingsData);
          if (brandingSettingsData.logo) {
            setLogoPreview(`${process.env.REACT_APP_BACKEND_URL}${brandingSettingsData.logo}`);
          }
        }
        if (permissionsData && user?.role === 'superadmin') {
          setRolePermissions(permissionsData);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const permsData = await adminAPI.getMyPermissions();
        setPermissions(permsData.permissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        // Set default permissions based on role
        if (isSuperAdmin) {
          setPermissions({
            viewMembers: true,
            manageEvents: true,
            manageInvoices: true,
            manageContent: true,
            manageGallery: true,
            manageSettings: true,
            manageUsers: true,
            accessDashboard: true
          });
        } else if (isModerator) {
          setPermissions({
            viewMembers: false,
            manageEvents: true,
            manageInvoices: false,
            manageContent: true,
            manageGallery: true,
            manageSettings: false,
            manageUsers: false,
            accessDashboard: true
          });
        }
      }
    };

    if (isAdmin || isModerator) {
      fetchPermissions();
    }
  }, [isAdmin, isModerator, isSuperAdmin]);

  const handleCreateInvoice = async () => {
    try {
      await invoicesAPI.create(newInvoice);
      toast.success('Invoice created successfully');
      setCreateInvoiceOpen(false);
      setNewInvoice({ userId: '', amount: '', dueDate: '', description: '' });
      // Refresh invoices
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      const paymentDate = new Date().toISOString().split('T')[0];
      await invoicesAPI.markPaid(invoiceId, paymentDate);
      toast.success('Invoice marked as paid');
      // Refresh invoices
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };


  const handleUploadInvoiceFile = async (invoiceId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/invoices/${invoiceId}/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast.success('Invoice file uploaded successfully');
      // Refresh invoices
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
    }
  };

  const handleDeleteInvoiceFile = async (invoiceId) => {
    if (!window.confirm('Remove this invoice file?')) return;

    try {
      await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/invoices/${invoiceId}/file`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      toast.success('Invoice file removed');
      // Refresh invoices
      const invoicesData = await invoicesAPI.getAll();
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      toast.error('Failed to remove file');
    }
  };


  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : 'Unknown User';
  };

  const handleCreateEvent = async () => {
    try {
      if (!eventForm.date || !eventForm.time || !eventForm.location) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (!eventForm.title.en || !eventForm.description.en) {
        toast.error('Please provide at least English title and description');
        return;
      }
      
      await eventsAPI.create(eventForm);
      toast.success('Event created successfully');
      setCreateEventOpen(false);
      // Refresh events
      const eventsData = await eventsAPI.getAll();
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error('Failed to create event');
      console.error(error);
    }
  };

  const handleUpdateEvent = async () => {
    try {
      if (!eventForm.date || !eventForm.time || !eventForm.location) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      await eventsAPI.update(selectedEvent.id, eventForm);
      toast.success('Event updated successfully');
      setEditEventOpen(false);
      setSelectedEvent(null);
      // Refresh events
      const eventsData = await eventsAPI.getAll();
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error('Failed to update event');
      console.error(error);
    }
  };

  const handleCancelEvent = async (event) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) {
      toast.error('Cancellation reason is required');
      return;
    }
    
    try {
      await eventsAPI.update(event.id, {
        status: 'cancelled',
        cancellationReason: reason
      });
      toast.success('Event cancelled and participants notified via email');
      // Refresh events
      const eventsData = await eventsAPI.getAll();
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error('Failed to cancel event');
      console.error(error);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm(t('admin.events.deleteConfirmation'))) {
      return;
    }
    
    try {
      await eventsAPI.delete(eventId);
      toast.success(t('admin.events.deleteSuccess'));
      // Refresh events
      const eventsData = await eventsAPI.getAll();
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error(t('admin.events.deleteFailed'));
      console.error(error);
    }
  };

  // Allow Admin, Super Admin, and Moderator access
  if (!isAdmin && !isModerator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-semibold">Access Denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-[var(--color-secondary)] dark:text-[var(--color-primary)]">
            {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-[var(--color-primary)]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.totalMembers')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {loading ? '...' : statistics?.totalMembers || 0}
                  </p>
                </div>
                <Users className="h-12 w-12 text-[var(--color-primary)]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[var(--color-primary)]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.paidInvoices')}</p>
                  <p className="text-3xl font-bold text-green-600">
                    {loading ? '...' : statistics?.paidInvoices || 0}
                  </p>
                </div>
                <FileText className="h-12 w-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[var(--color-primary)]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.unpaidInvoices')}</p>
                  <p className="text-3xl font-bold text-red-600">
                    {loading ? '...' : statistics?.unpaidInvoices || 0}
                  </p>
                </div>
                <FileText className="h-12 w-12 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[var(--color-primary)]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.stats.totalRevenue')}</p>
                  <p className="text-3xl font-bold text-[var(--color-primary)]">
                    {loading ? '...' : `${statistics?.totalRevenue || 0} SEK`}
                  </p>
                </div>
                <BarChart className="h-12 w-12 text-[var(--color-primary)]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile Dropdown - Show on mobile and tablet */}
          <div className="block lg:hidden mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Section</label>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 border-2 border-[var(--color-primary)]/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
            >
              {permissions?.viewMembers && <option value="members">👥 {t('admin.tabs.members')}</option>}
              {permissions?.viewMembers && <option value="family">👨‍👩‍👧‍👦 {t('admin.tabs.family') || 'Family'}</option>}
              {permissions?.manageInvoices && <option value="invoices">📄 {t('admin.tabs.invoices')}</option>}
              {permissions?.manageEvents && <option value="events">📅 {t('admin.tabs.events')}</option>}
              {permissions?.manageContent && <option value="content">📝 {t('admin.tabs.content')}</option>}
              {permissions?.manageSettings && <option value="settings">⚙️ {t('admin.tabs.settings')}</option>}
              {isSuperAdmin && <option value="user-management">👤 Users & Roles</option>}
              {isSuperAdmin && <option value="platform-settings">🔧 Platform</option>}
              {isSuperAdmin && <option value="branding">🎨 Branding</option>}
              {isSuperAdmin && <option value="admin-management">👥 {t('admin.tabs.adminManagement')}</option>}
            </select>
          </div>

          {/* Desktop Tabs - Show on large screens */}
          <TabsList className={`hidden lg:grid w-full ${
            isSuperAdmin ? 'grid-cols-9 max-w-7xl' : 
            isModerator ? 'grid-cols-2 max-w-xl' : 
            'grid-cols-6 max-w-4xl'
          }`}>
            {/* Members tab */}
            {permissions?.viewMembers && (
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                {t('admin.tabs.members')}
              </TabsTrigger>
            )}
            {/* Family tab - for managing family members */}
            {permissions?.viewMembers && (
              <TabsTrigger value="family" data-testid="admin-family-tab">
                <UsersRound className="h-4 w-4 mr-2" />
                {t('admin.tabs.family') || 'Family'}
              </TabsTrigger>
            )}
            {/* Invoices tab */}
            {permissions?.manageInvoices && (
              <TabsTrigger value="invoices">
                <FileText className="h-4 w-4 mr-2" />
                {t('admin.tabs.invoices')}
              </TabsTrigger>
            )}
            {/* Events tab */}
            {permissions?.manageEvents && (
              <TabsTrigger value="events">
                <Calendar className="h-4 w-4 mr-2" />
                {t('admin.tabs.events')}
              </TabsTrigger>
            )}
            {/* Content tab */}
            {permissions?.manageContent && (
              <TabsTrigger value="content">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('admin.tabs.content')}
              </TabsTrigger>
            )}
            {/* Settings tab */}
            {permissions?.manageSettings && (
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                {t('admin.tabs.settings')}
              </TabsTrigger>
            )}
            {/* Users & Roles tab - Only Super Admin */}
            {isSuperAdmin && (
              <TabsTrigger value="user-management">
                <UserCog className="h-4 w-4 mr-2" />
                Users & Roles
              </TabsTrigger>
            )}
            {/* Platform Settings tab - Only Super Admin */}
            {isSuperAdmin && (
              <TabsTrigger value="platform-settings">
                <Server className="h-4 w-4 mr-2" />
                Platform
              </TabsTrigger>
            )}
            {/* Branding tab - Only Super Admin */}
            {isSuperAdmin && (
              <TabsTrigger value="branding">
                <Palette className="h-4 w-4 mr-2" />
                Branding
              </TabsTrigger>
            )}
            {/* Admin Management tab - Only Super Admin */}
            {isSuperAdmin && (
              <TabsTrigger value="admin-management">
                <Mail className="h-4 w-4 mr-2" />
                {t('admin.tabs.adminManagement')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Members Tab */}
          {permissions?.viewMembers && (
            <TabsContent value="members">
            <Card className="border-2 border-[var(--color-primary)]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('admin.membersManagement')}</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
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
                    }}
                    className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] text-sm"
                  >
                    {t('admin.actions.exportPDF')}
                  </button>
                  <button
                    onClick={async () => {
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
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    {t('admin.actions.exportExcel')}
                  </button>
                  <button
                    onClick={async () => {
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
                    }}
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
                      setCurrentPage(1); // Reset to first page when searching
                    }}
                    className="max-w-md"
                  />
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <p className="text-gray-600 dark:text-gray-400">Loading members...</p>
                  ) : (() => {
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

                    if (filteredUsers.length === 0) {
                      return <p className="text-gray-600 dark:text-gray-400">
                        {searchQuery ? 'No members found matching your search.' : 'No members yet.'}
                      </p>;
                    }

                    return (
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
                              onClick={async () => {
                                try {
                                  const details = await adminAPI.getUserDetails(user.id);
                                  setSelectedUser(details);
                                  setUserDetailsOpen(true);
                                } catch (error) {
                                  toast.error('Failed to load user details');
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              {t('admin.actions.viewDetails')}
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete ${user.fullName}?`)) {
                                  try {
                                    await adminAPI.deleteUser(user.id);
                                    toast.success('Member deleted successfully');
                                    // Refresh users list
                                    const usersData = await adminAPI.getUsers();
                                    setUsers(usersData.users || []);
                                  } catch (error) {
                                    toast.error('Failed to delete member');
                                  }
                                }
                              }}
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
                                    // Show first page, last page, current page, and pages around current
                                    return page === 1 || 
                                           page === totalPages || 
                                           (page >= currentPage - 1 && page <= currentPage + 1);
                                  })
                                  .map((page, index, array) => {
                                    // Add ellipsis if there's a gap
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
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Family Tab - Admin Family Management */}
          {permissions?.viewMembers && (
          <TabsContent value="family">
            <AdminFamilyManagement t={t} users={users} />
          </TabsContent>
          )}

          {/* Invoices Tab */}
          {permissions?.manageInvoices && (
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
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-gray-600 dark:text-gray-400">{t('admin.loadingInvoices')}</p>
                  ) : invoices.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">{t('admin.noInvoicesFound')}</p>
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
                          {invoices.map((invoice) => (
                            <tr key={invoice.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium">{getUserName(invoice.userId)}</p>
                                  <p className="text-xs text-gray-500">{invoice.userId}</p>
                                </div>
                              </td>
                              <td className="p-3">{invoice.description}</td>
                              <td className="p-3 font-semibold">{invoice.amount} {invoice.currency}</td>
                              <td className="p-3">{invoice.dueDate}</td>
                              <td className="p-3">{invoice.paymentDate || '-'}</td>
                              <td className="p-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  invoice.status === 'paid' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {invoice.status === 'paid' ? t('admin.status.paid') : t('admin.status.unpaid')}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  {invoice.fileUrl ? (
                                    <>
                                      <a
                                        href={`${process.env.REACT_APP_BACKEND_URL}${invoice.fileUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 text-center"
                                      >
                                        👁️ View
                                      </a>
                                      <a
                                        href={`${process.env.REACT_APP_BACKEND_URL}${invoice.fileUrl}`}
                                        download
                                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 text-center"
                                      >
                                        📥 Download
                                      </a>
                                      <button
                                        onClick={() => handleDeleteInvoiceFile(invoice.id)}
                                        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                                      >
                                        ✕ Remove
                                      </button>
                                    </>
                                  ) : (
                                    <label className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 cursor-pointer text-center">
                                      📤 Upload
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                                        onChange={(e) => handleUploadInvoiceFile(invoice.id, e)}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1 flex-wrap">
                                  <button
                                    onClick={() => setViewingInvoice(invoice)}
                                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                                    title="View invoice details"
                                  >
                                    👁️
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (invoice.status === 'paid') {
                                        toast.error('This invoice is paid, you cannot change paid invoice');
                                      } else {
                                        setEditingInvoice(invoice);
                                        setEditInvoiceOpen(true);
                                      }
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                    title="Edit invoice"
                                  >
                                    ✏️
                                  </button>
                                  {invoice.status === 'unpaid' && (
                                    <button
                                      onClick={() => handleMarkPaid(invoice.id)}
                                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                      title="Mark as paid"
                                    >
                                      ✅
                                    </button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('Delete this invoice?')) {
                                        try {
                                          await invoicesAPI.delete(invoice.id);
                                          toast.success('Invoice deleted');
                                          const invoicesData = await invoicesAPI.getAll();
                                          setInvoices(invoicesData.invoices || []);
                                        } catch (error) {
                                          toast.error('Failed to delete invoice');
                                        }
                                      }
                                    }}
                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                    title="Delete invoice"
                                  >
                                    🗑️
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
          </TabsContent>
          )}

          {/* Events Tab */}
          <TabsContent value="events">
            <Card className="border-2 border-[var(--color-primary)]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('admin.events.title')}</CardTitle>
                <button
                  onClick={() => {
                    setEventForm({
                      date: '',
                      time: '',
                      title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                      location: '',
                      description: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                      status: 'active',
                      cancellationReason: ''
                    });
                    setCreateEventOpen(true);
                  }}
                  className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] transition-colors"
                >
                  {t('admin.events.addEvent')}
                </button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      {t('admin.events.noEvents')}
                    </p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className={`p-4 border-2 rounded-lg ${
                        event.status === 'cancelled' 
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/10' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-lg text-gray-900 dark:text-white">
                                {event.title['en']}
                              </p>
                              {event.status === 'cancelled' && (
                                <span className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
                                  {t('admin.events.cancelled')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              📅 {event.date} {t('admin.events.at')} {event.time}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              📍 {event.location}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {event.description['en']}
                            </p>
                            {event.status === 'cancelled' && event.cancellationReason && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                <strong>{t('admin.events.reason')}:</strong> {event.cancellationReason}
                              </p>
                            )}
                            {event.participants && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                👥 {event.participants.length} {t('admin.events.participantsConfirmed')}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setEventForm({
                                  date: event.date,
                                  time: event.time,
                                  title: event.title,
                                  location: event.location,
                                  description: event.description,
                                  status: event.status,
                                  cancellationReason: event.cancellationReason || ''
                                });
                                setEditEventOpen(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              {t('admin.actions.edit')}
                            </button>
                            {event.status === 'active' && (
                              <button
                                onClick={() => handleCancelEvent(event)}
                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                              >
                                {t('admin.events.cancelEvent')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                              {t('admin.actions.delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              {/* News Management (Home Page) */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.content.newsTitle')}</CardTitle>
                  <button
                    onClick={() => {
                      setEditingNews(null);
                      setNewsForm({
                        date: new Date().toISOString().split('T')[0],
                        title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                        text: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                        image: '',
                        video: ''
                      });
                      setNewsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                  >
                    {t('admin.content.addNews')}
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {news.map((item) => (
                      <div key={item.id} className="p-4 border rounded flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{item.title.en || item.title['sr-latin']}</h4>
                          <p className="text-sm text-gray-500">{item.date}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingNews(item);
                              setNewsForm({
                                date: item.date,
                                title: item.title,
                                text: item.text,
                                image: item.image || '',
                                video: item.video || ''
                              });
                              setNewsModalOpen(true);
                            }}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            {t('admin.actions.edit')}
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(t('admin.content.deleteNewsConfirm'))) {
                                try {
                                  await newsAPI.delete(item.id);
                                  setNews(news.filter(n => n.id !== item.id));
                                  toast.success(t('admin.content.newsDeleteSuccess'));
                                } catch (error) {
                                  toast.error(t('admin.content.newsDeleteFailed'));
                                }
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            {t('admin.actions.delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* About Page */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>{t('admin.content.aboutTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{t('admin.content.aboutDescription')}</p>
                  <button
                    onClick={async () => {
                      try {
                        const data = await contentAPI.getAbout();
                        setAboutContent(data.content || { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' });
                        setAboutModalOpen(true);
                      } catch (error) {
                        toast.error(t('admin.content.aboutLoadFailed'));
                      }
                    }}
                    className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                  >
                    {t('admin.content.editAbout')}
                  </button>
                </CardContent>
              </Card>

              {/* Serbian Story Management */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.content.storyTitle')}</CardTitle>
                  <button
                    onClick={() => {
                      setEditingStory(null);
                      setStoryForm({
                        date: new Date().toISOString().split('T')[0],
                        title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                        text: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                        image: '',
                        video: '',
                        url: ''
                      });
                      setStoryModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                  >
                    {t('admin.content.addStory')}
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stories.map((item) => (
                      <div key={item.id} className="p-4 border rounded flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{item.title.en || item.title['sr-latin']}</h4>
                          <p className="text-sm text-gray-500">{item.date}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingStory(item);
                              setStoryForm({
                                date: item.date,
                                title: item.title,
                                text: item.text,
                                image: item.image || '',
                                video: item.video || '',
                                url: item.url || ''
                              });
                              setStoryModalOpen(true);
                            }}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            {t('admin.actions.edit')}
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(t('admin.content.deleteStoryConfirm'))) {
                                try {
                                  await storiesAPI.delete(item.id);
                                  setStories(stories.filter(s => s.id !== item.id));
                                  toast.success(t('admin.content.storyDeleteSuccess'));
                                } catch (error) {
                                  toast.error(t('admin.content.storyDeleteFailed'));
                                }
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            {t('admin.actions.delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gallery Management */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.content.galleryTitle')}</CardTitle>
                  <button
                    onClick={() => {
                      setEditingAlbum(null);
                      setAlbumForm({
                        date: new Date().toISOString().split('T')[0],
                        title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                        description: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                        place: '',
                        images: [],
                        videos: []
                      });
                      setAlbumModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                  >
                    {t('admin.content.createAlbum')}
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {albums.map((album) => (
                      <div key={album.id} className="p-4 border rounded">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold">{album.title?.en || album.description?.en || album.description?.['sr-latin']}</h4>
                            <p className="text-sm text-gray-500">{album.date} • {album.place || t('admin.content.noLocation')}</p>
                            <p className="text-sm text-gray-600 mt-1">{album.images?.length || 0} {t('admin.content.photos')}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingAlbum(album);
                                setAlbumForm({
                                  date: album.date,
                                  title: album.title || { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
                                  description: album.description,
                                  place: album.place || '',
                                  images: album.images || [],
                                  videos: album.videos || []
                                });
                                setAlbumModalOpen(true);
                              }}
                              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              {t('admin.actions.edit')}
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(t('admin.content.deleteAlbumConfirm'))) {
                                  try {
                                    await galleryAPI.delete(album.id);
                                    setAlbums(albums.filter(a => a.id !== album.id));
                                    toast.success(t('admin.content.albumDeleteSuccess'));
                                  } catch (error) {
                                    toast.error(t('admin.content.albumDeleteFailed'));
                                  }
                                }
                              }}
                              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              {t('admin.actions.delete')}
                            </button>
                          </div>
                        </div>
                        {album.images && album.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-3">
                            {album.images.slice(0, 4).map((img, idx) => (
                              <img 
                                key={idx} 
                                src={img} 
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-20 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab - Only Admin and Super Admin */}
          {(isAdmin && !isModerator) && (
            <TabsContent value="settings">
            <Card className="border-2 border-[var(--color-primary)]/20">
              <CardHeader>
                <CardTitle>{t('admin.settings.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await settingsAPI.update(settings);
                    toast.success(t('admin.settings.updateSuccess'));
                  } catch (error) {
                    toast.error(t('admin.settings.updateFailed'));
                  }
                }} className="space-y-6">
                  
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('admin.settings.contactInfo')}</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.address')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.address !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, address: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.showOnFrontend')}</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={settings.address}
                          onChange={(e) => setSettings({...settings, address: e.target.value})}
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">{t('admin.settings.contactEmail')}</label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={settings.visibility?.contactEmail !== false}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  visibility: {...settings.visibility, contactEmail: e.target.checked}
                                })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                              />
                              <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                            </label>
                          </div>
                          <input
                            type="email"
                            value={settings.contactEmail}
                            onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                            className="w-full p-3 border rounded-md"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">{t('admin.settings.contactPhone')}</label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={settings.visibility?.contactPhone !== false}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  visibility: {...settings.visibility, contactPhone: e.target.checked}
                                })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                              />
                              <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                            </label>
                          </div>
                          <input
                            type="tel"
                            value={settings.contactPhone}
                            onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                            className="w-full p-3 border rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('admin.settings.socialMedia')}</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.facebookUrl')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.socialMediaFacebook !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, socialMediaFacebook: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                          </label>
                        </div>
                        <input
                          type="url"
                          value={settings.socialMedia.facebook}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, facebook: e.target.value}
                          })}
                          placeholder="https://facebook.com/..."
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.instagramUrl')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.socialMediaInstagram !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, socialMediaInstagram: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                          </label>
                        </div>
                        <input
                          type="url"
                          value={settings.socialMedia.instagram}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, instagram: e.target.value}
                          })}
                          placeholder="https://instagram.com/..."
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.youtubeUrl')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.socialMediaYoutube !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, socialMediaYoutube: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                          </label>
                        </div>
                        <input
                          type="url"
                          value={settings.socialMedia.youtube}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, youtube: e.target.value}
                          })}
                          placeholder="https://youtube.com/..."
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.snapchatUrl')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.socialMediaSnapchat !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, socialMediaSnapchat: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                          </label>
                        </div>
                        <input
                          type="url"
                          value={settings.socialMedia.snapchat}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, snapchat: e.target.value}
                          })}
                          placeholder="https://snapchat.com/add/..."
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('admin.settings.orgDetails')}</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.orgNumber')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.orgNumber !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, orgNumber: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={settings.registrationNumber}
                          onChange={(e) => setSettings({...settings, registrationNumber: e.target.value})}
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.vatNumber')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.vatNumber !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, vatNumber: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={settings.vatNumber}
                          onChange={(e) => setSettings({...settings, vatNumber: e.target.value})}
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">{t('admin.settings.bankAccount')}</label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.visibility?.bankAccount !== false}
                              onChange={(e) => setSettings({
                                ...settings,
                                visibility: {...settings.visibility, bankAccount: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{t('admin.settings.show')}</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={settings.bankAccount}
                          onChange={(e) => setSettings({...settings, bankAccount: e.target.value})}
                          className="w-full p-3 border rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-[var(--color-button-primary)] text-white rounded-md hover:bg-[var(--color-button-hover)] font-semibold"
                  >
                    {t('admin.settings.saveButton')}
                  </button>
                </form>
              </CardContent>
            </Card>

            {/* Password Change Card */}
            <Card className="border-2 border-[var(--color-primary)]/20 mt-6">
              <CardHeader>
                <CardTitle>{t('admin.settings.passwordChangeTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminPasswordChangeForm t={t} />
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Super Admin - User Management Tab */}
          {isSuperAdmin && (
            <TabsContent value="user-management" className="space-y-6">
              {/* Permission Management Card - Editable */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>Role Permissions (Editable)</CardTitle>
                  <p className="text-sm text-gray-600">Check or uncheck permissions for each role</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="w-full border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-2 px-2 sm:py-3 sm:px-4 font-semibold text-xs sm:text-sm">Permission</th>
                          <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-semibold text-red-700 text-xs sm:text-sm">Admin</th>
                          <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-semibold text-blue-700 text-xs sm:text-sm">Moderator</th>
                          <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">User</th>
                          <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-semibold text-purple-700 text-xs sm:text-sm">Super Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'viewMembers', label: 'View Members' },
                          { key: 'manageEvents', label: 'Manage Events' },
                          { key: 'manageInvoices', label: 'Manage Invoices' },
                          { key: 'manageContent', label: 'Manage Content (News/Stories)' },
                          { key: 'manageGallery', label: 'Manage Gallery' },
                          { key: 'manageSettings', label: 'Manage Settings' },
                          { key: 'manageUsers', label: 'Manage Users & Roles' },
                          { key: 'accessDashboard', label: 'Access Admin Dashboard' }
                        ].map((permission) => (
                          <tr key={permission.key} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-2 sm:py-3 sm:px-4 text-xs sm:text-sm">{permission.label}</td>
                            
                            {/* Admin */}
                            <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">
                              <input
                                type="checkbox"
                                checked={rolePermissions.admin?.[permission.key] || false}
                                onChange={(e) => setRolePermissions({
                                  ...rolePermissions,
                                  admin: { ...rolePermissions.admin, [permission.key]: e.target.checked }
                                })}
                                className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                              />
                            </td>
                            
                            {/* Moderator */}
                            <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">
                              <input
                                type="checkbox"
                                checked={rolePermissions.moderator?.[permission.key] || false}
                                onChange={(e) => setRolePermissions({
                                  ...rolePermissions,
                                  moderator: { ...rolePermissions.moderator, [permission.key]: e.target.checked }
                                })}
                                className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                              />
                            </td>
                            
                            {/* User */}
                            <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">
                              <input
                                type="checkbox"
                                checked={rolePermissions.user?.[permission.key] || false}
                                onChange={(e) => setRolePermissions({
                                  ...rolePermissions,
                                  user: { ...rolePermissions.user, [permission.key]: e.target.checked }
                                })}
                                className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                              />
                            </td>
                            
                            {/* Super Admin - Always checked, disabled */}
                            <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">
                              <input
                                type="checkbox"
                                checked={true}
                                disabled
                                className="w-4 h-4 sm:w-5 sm:h-5 opacity-50"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Save Permissions Button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/permissions`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(rolePermissions)
                          });
                          toast.success('Permissions saved successfully');
                        } catch (error) {
                          toast.error('Failed to save permissions');
                        }
                      }}
                      className="px-6 py-2 bg-[var(--color-button-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] font-semibold"
                    >
                      Save Permissions
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* User Management Card */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>User & Role Management</CardTitle>
                  <button
                    onClick={() => {
                      setNewUser({
                        username: '',
                        email: '',
                        password: '',
                        fullName: '',
                        role: 'user',
                        phone: '',
                        address: '',
                        yearOfBirth: ''
                      });
                      setCreateUserModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                  >
                    ➕ Create User
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="p-3 text-left">Name / Email</th>
                          <th className="p-3 text-left">Role</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Registered</th>
                          <th className="p-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{user.fullName || user.username}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                user.role === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                user.role === 'moderator' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {user.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                user.suspended 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {user.suspended ? 'SUSPENDED' : 'ACTIVE'}
                              </span>
                            </td>
                            <td className="p-3 text-sm">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditUserModalOpen(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Edit
                                </button>
                                {user.role !== 'superadmin' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`${user.suspended ? 'Activate' : 'Suspend'} ${user.fullName}?`)) {
                                          try {
                                            const token = localStorage.getItem('token');
                                            await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users/${user.id}/suspend`, {
                                              method: 'POST',
                                              headers: {
                                                'Authorization': `Bearer ${token}`,
                                                'Content-Type': 'application/json'
                                              },
                                              body: JSON.stringify({ suspended: !user.suspended })
                                            });
                                            const usersData = await adminAPI.getUsers();
                                            setUsers(usersData.users || []);
                                            toast.success(`User ${user.suspended ? 'activated' : 'suspended'}`);
                                          } catch (error) {
                                            toast.error('Failed to update user status');
                                          }
                                        }
                                      }}
                                      className={`px-3 py-1 text-white text-xs rounded ${
                                        user.suspended 
                                          ? 'bg-green-600 hover:bg-green-700' 
                                          : 'bg-orange-600 hover:bg-orange-700'
                                      }`}
                                    >
                                      {user.suspended ? 'Activate' : 'Suspend'}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`Permanently delete ${user.fullName}? This cannot be undone!`)) {
                                          try {
                                            const token = localStorage.getItem('token');
                                            await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users/${user.id}`, {
                                              method: 'DELETE',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            const usersData = await adminAPI.getUsers();
                                            setUsers(usersData.users || []);
                                            toast.success('User deleted');
                                          } catch (error) {
                                            toast.error('Failed to delete user');
                                          }
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Super Admin - Platform Settings Tab */}
          {isSuperAdmin && (
            <TabsContent value="platform-settings" className="space-y-6">
              {/* System Configuration */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Site Name</label>
                      <input
                        type="text"
                        value={platformSettings.siteName}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          siteName: e.target.value
                        })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Timezone</label>
                      <select
                        value={platformSettings.timezone}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          timezone: e.target.value
                        })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="Europe/Stockholm">Europe/Stockholm</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="America/New_York">America/New York</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <input
                      type="checkbox"
                      checked={platformSettings.maintenanceMode}
                      onChange={(e) => setPlatformSettings({
                        ...platformSettings,
                        maintenanceMode: e.target.checked
                      })}
                      className="h-5 w-5"
                    />
                    <div>
                      <p className="font-semibold">Maintenance Mode</p>
                      <p className="text-sm text-gray-600">Enable to show maintenance page to regular users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Policies */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>Security Policies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Minimum Password Length</label>
                      <input
                        type="number"
                        value={platformSettings.security.minPasswordLength}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          security: {
                            ...platformSettings.security,
                            minPasswordLength: parseInt(e.target.value)
                          }
                        })}
                        min="6"
                        max="20"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Login Attempts</label>
                      <input
                        type="number"
                        value={platformSettings.security.maxLoginAttempts}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          security: {
                            ...platformSettings.security,
                            maxLoginAttempts: parseInt(e.target.value)
                          }
                        })}
                        min="3"
                        max="10"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Session Timeout (seconds)</label>
                    <input
                      type="number"
                      value={platformSettings.security.sessionTimeout}
                      onChange={(e) => setPlatformSettings({
                        ...platformSettings,
                        security: {
                          ...platformSettings.security,
                          sessionTimeout: parseInt(e.target.value)
                        }
                      })}
                      min="600"
                      max="86400"
                      className="w-full p-2 border rounded"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 7200 (2 hours)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={platformSettings.security.requireUppercase}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          security: {
                            ...platformSettings.security,
                            requireUppercase: e.target.checked
                          }
                        })}
                        className="h-4 w-4"
                      />
                      <label className="text-sm">Require uppercase letter in password</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={platformSettings.security.requireNumbers}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          security: {
                            ...platformSettings.security,
                            requireNumbers: e.target.checked
                          }
                        })}
                        className="h-4 w-4"
                      />
                      <label className="text-sm">Require numbers in password</label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Configuration */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>Email Configuration (SMTP)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Host</label>
                      <input
                        type="text"
                        value={platformSettings.email.smtpHost}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          email: {
                            ...platformSettings.email,
                            smtpHost: e.target.value
                          }
                        })}
                        placeholder="smtp.gmail.com"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Port</label>
                      <input
                        type="number"
                        value={platformSettings.email.smtpPort}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          email: {
                            ...platformSettings.email,
                            smtpPort: parseInt(e.target.value)
                          }
                        })}
                        placeholder="587"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Username</label>
                      <input
                        type="text"
                        value={platformSettings.email.smtpUser}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          email: {
                            ...platformSettings.email,
                            smtpUser: e.target.value
                          }
                        })}
                        placeholder="your-email@gmail.com"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Password</label>
                      <input
                        type="password"
                        value={platformSettings.email.smtpPassword}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          email: {
                            ...platformSettings.email,
                            smtpPassword: e.target.value
                          }
                        })}
                        placeholder="••••••••"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">From Email</label>
                      <input
                        type="email"
                        value={platformSettings.email.fromEmail}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          email: {
                            ...platformSettings.email,
                            fromEmail: e.target.value
                          }
                        })}
                        placeholder="noreply@srpskoudruzenjetaby.se"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">From Name</label>
                      <input
                        type="text"
                        value={platformSettings.email.fromName}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          email: {
                            ...platformSettings.email,
                            fromName: e.target.value
                          }
                        })}
                        placeholder="Serbian Cultural Association"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <input
                        type="checkbox"
                        checked={platformSettings.notifications.emailEnabled}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          notifications: {
                            ...platformSettings.notifications,
                            emailEnabled: e.target.checked
                          }
                        })}
                        className="h-5 w-5"
                      />
                      <div>
                        <p className="font-semibold">Email Notifications</p>
                        <p className="text-sm text-gray-600">Enable all email notifications</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <input
                        type="checkbox"
                        checked={platformSettings.notifications.smsEnabled}
                        onChange={(e) => setPlatformSettings({
                          ...platformSettings,
                          notifications: {
                            ...platformSettings.notifications,
                            smsEnabled: e.target.checked
                          }
                        })}
                        className="h-5 w-5"
                      />
                      <div>
                        <p className="font-semibold">SMS Notifications</p>
                        <p className="text-sm text-gray-600">Enable SMS notifications (requires Twilio setup)</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Specific Notifications</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={platformSettings.notifications.notifyAdminOnNewUser}
                          onChange={(e) => setPlatformSettings({
                            ...platformSettings,
                            notifications: {
                              ...platformSettings.notifications,
                              notifyAdminOnNewUser: e.target.checked
                            }
                          })}
                          className="h-4 w-4"
                        />
                        <label className="text-sm">Notify admin on new user registration</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={platformSettings.notifications.notifyUserOnInvoice}
                          onChange={(e) => setPlatformSettings({
                            ...platformSettings,
                            notifications: {
                              ...platformSettings.notifications,
                              notifyUserOnInvoice: e.target.checked
                            }
                          })}
                          className="h-4 w-4"
                        />
                        <label className="text-sm">Notify user on new invoice</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/platform-settings`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(platformSettings)
                      });
                      toast.success('Platform settings saved successfully');
                    } catch (error) {
                      toast.error('Failed to save platform settings');
                    }
                  }}
                  className="px-8 py-3 bg-[var(--color-button-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] font-semibold"
                >
                  Save All Platform Settings
                </button>
              </div>
            </TabsContent>
          )}

          {/* Super Admin - Branding Tab */}
          {isSuperAdmin && (
            <TabsContent value="branding" className="space-y-6">
              {/* Logo Upload Section */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Logo Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain p-4" />
                        ) : (
                          <div className="text-center text-gray-400">
                            <Upload className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">No logo uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">Upload New Logo</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            
                            setUploadingLogo(true);
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              
                              const token = localStorage.getItem('token');
                              const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/branding/logo`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` },
                                body: formData
                              });
                              
                              const data = await response.json();
                              if (data.success) {
                                setLogoPreview(`${process.env.REACT_APP_BACKEND_URL}${data.logo}`);
                                setBrandingSettings({...brandingSettings, logo: data.logo});
                                toast.success('Logo uploaded successfully!');
                              } else {
                                toast.error('Failed to upload logo');
                              }
                            } catch (error) {
                              toast.error('Error uploading logo');
                            } finally {
                              setUploadingLogo(false);
                            }
                          }}
                          className="w-full p-2 border rounded"
                          disabled={uploadingLogo}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Supported formats: PNG, JPG, SVG. Max size: 2MB. Logo appears in header, footer, and login page.
                        </p>
                      </div>
                      {uploadingLogo && (
                        <p className="text-sm text-blue-600">Uploading logo...</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Color Customization Section */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Color Customization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Primary Brand Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={brandingSettings.colors.primary}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, primary: e.target.value}
                          })}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingSettings.colors.primary}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, primary: e.target.value}
                          })}
                          className="flex-1 p-2 border rounded font-mono text-sm"
                          placeholder="#C1272D"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Main brand color used across the site</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Secondary Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={brandingSettings.colors.secondary}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, secondary: e.target.value}
                          })}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingSettings.colors.secondary}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, secondary: e.target.value}
                          })}
                          className="flex-1 p-2 border rounded font-mono text-sm"
                          placeholder="#8B1F1F"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Used for accents and highlights</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Button Primary Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={brandingSettings.colors.buttonPrimary}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, buttonPrimary: e.target.value}
                          })}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingSettings.colors.buttonPrimary}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, buttonPrimary: e.target.value}
                          })}
                          className="flex-1 p-2 border rounded font-mono text-sm"
                          placeholder="#C1272D"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Button Hover Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={brandingSettings.colors.buttonHover}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, buttonHover: e.target.value}
                          })}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingSettings.colors.buttonHover}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            colors: {...brandingSettings.colors, buttonHover: e.target.value}
                          })}
                          className="flex-1 p-2 border rounded font-mono text-sm"
                          placeholder="#8B1F1F"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Color Preview */}
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm font-medium mb-3">Preview:</p>
                    <div className="flex gap-3">
                      <button 
                        className="px-4 py-2 rounded text-white font-semibold"
                        style={{ backgroundColor: brandingSettings.colors.buttonPrimary }}
                      >
                        Primary Button
                      </button>
                      <div 
                        className="px-4 py-2 rounded border-2 font-semibold"
                        style={{ borderColor: brandingSettings.colors.primary, color: brandingSettings.colors.primary }}
                      >
                        Outline Style
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hero Background Section */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Homepage Hero Background
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Customize the background pattern below the welcome message and flags on the homepage.
                    Serbian-Swedish fusion patterns celebrate both cultural heritages.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Background Selection Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(brandingSettings.heroBackground?.availableBackgrounds || [
                      {
                        id: "serbian_nemanjic_1",
                        name: "Nemanjić Dynasty - Elegant Ribbon",
                        url: "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/2e2cc22b822d404f49e921fc571d5b5104a4cdfc089588c23bc6af341e34c02d.png",
                        description: "Serbian coat of arms with flag ribbon and golden fleur-de-lys"
                      },
                      {
                        id: "serbian_nemanjic_2",
                        name: "Nemanjić Dynasty - Royal Frame",
                        url: "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/0e43eb7909b6528221309751e09ce2d6d7f7549dc1bfe1590f6a7099fe6b0f4e.png",
                        description: "Royal design with Serbian crosses in corners"
                      },
                      {
                        id: "serbian_nemanjic_3",
                        name: "Nemanjić Dynasty - Watercolor",
                        url: "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/3233c779b5663f71e2a62d510b59bdc8a7b37f286fc59b5264cfde66a7c34a8d.png",
                        description: "Watercolor style with golden Nemanjić decorations"
                      },
                      {
                        id: "serbian_swedish_1",
                        name: "Serbian-Swedish Folk Art",
                        url: "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/55748851d8f8eae040b3b350010e2fd2d49583edf32844dafdb8fa5af6ff5d63.png",
                        description: "Serbian diamonds with Swedish Dala elements"
                      },
                      {
                        id: "serbian_swedish_2", 
                        name: "Cultural Heritage Pattern",
                        url: "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/00d305c9d7506067bfb941e1cb48738a1aeff07fdf2586daee6c638dd66097da.png",
                        description: "Serbian embroidery meets Swedish folk art"
                      },
                      {
                        id: "logo_pattern",
                        name: "Logo Pattern",
                        url: "/logo.jpg",
                        description: "Subtle repeating logo pattern"
                      },
                      {
                        id: "solid_gradient",
                        name: "Solid Gradient",
                        url: "",
                        description: "Clean gradient without pattern"
                      }
                    ]).map((bg) => (
                      <div
                        key={bg.id}
                        onClick={() => setBrandingSettings({
                          ...brandingSettings,
                          heroBackground: {
                            ...brandingSettings.heroBackground,
                            type: 'pattern',
                            selectedId: bg.id
                          }
                        })}
                        className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                          brandingSettings.heroBackground?.selectedId === bg.id
                            ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                            : 'border-gray-200 hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        <div className="aspect-video bg-gradient-to-br from-blue-50 to-white relative">
                          {bg.url && (
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage: `url(${bg.url})`,
                                backgroundSize: bg.url.includes('logo') ? '40px' : 'cover',
                                backgroundRepeat: bg.url.includes('logo') ? 'repeat' : 'no-repeat',
                                backgroundPosition: 'center',
                                opacity: 0.3
                              }}
                            />
                          )}
                          {brandingSettings.heroBackground?.selectedId === bg.id && (
                            <div className="absolute top-2 right-2 bg-[var(--color-primary)] text-white rounded-full p-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-white">
                          <p className="text-sm font-medium truncate">{bg.name}</p>
                          <p className="text-xs text-gray-500 truncate">{bg.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Opacity Control */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Background Opacity: {Math.round((brandingSettings.heroBackground?.opacity || 0.15) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.05"
                      value={brandingSettings.heroBackground?.opacity || 0.15}
                      onChange={(e) => setBrandingSettings({
                        ...brandingSettings,
                        heroBackground: {
                          ...brandingSettings.heroBackground,
                          opacity: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Adjust how visible the background pattern appears (5% - 50%)
                    </p>
                  </div>

                  {/* Live Preview */}
                  <div className="mt-4 p-4 border rounded-lg">
                    <p className="text-sm font-medium mb-3">Live Preview:</p>
                    <div className="relative h-32 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-lg overflow-hidden">
                      {brandingSettings.heroBackground?.selectedId && brandingSettings.heroBackground?.selectedId !== 'solid_gradient' && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `url(${
                              (brandingSettings.heroBackground?.availableBackgrounds || []).find(
                                b => b.id === brandingSettings.heroBackground?.selectedId
                              )?.url || ''
                            })`,
                            backgroundSize: brandingSettings.heroBackground?.selectedId === 'logo_pattern' ? '60px' : 'cover',
                            backgroundRepeat: brandingSettings.heroBackground?.selectedId === 'logo_pattern' ? 'repeat' : 'no-repeat',
                            backgroundPosition: 'center',
                            opacity: brandingSettings.heroBackground?.opacity || 0.15
                          }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="flex justify-center gap-2 mb-2">
                            <div className="w-8 h-5 bg-red-600 rounded shadow" title="Serbian flag" />
                            <div className="w-8 h-5 bg-blue-600 rounded shadow" title="Swedish flag" />
                          </div>
                          <p className="text-lg font-bold text-gray-800">Добродошли / Välkommen</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Language Settings Section */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>Language Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Language</label>
                    <select
                      value={brandingSettings.language.default}
                      onChange={(e) => setBrandingSettings({
                        ...brandingSettings,
                        language: {...brandingSettings.language, default: e.target.value}
                      })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="sr">🇷🇸 Serbian (Srpski)</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="sv">🇸🇪 Swedish (Svenska)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">This language will be used site-wide by default</p>
                  </div>
                </CardContent>
              </Card>

              {/* Email Templates Section */}
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Welcome Email */}
                  <div className="border-b pb-4">
                    <h4 className="font-semibold mb-3">Welcome Email</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <input
                          type="text"
                          value={brandingSettings.emailTemplates.welcome.subject}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              welcome: {...brandingSettings.emailTemplates.welcome, subject: e.target.value}
                            }
                          })}
                          className="w-full p-2 border rounded"
                          placeholder="Welcome to SKUD Täby!"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Body</label>
                        <textarea
                          value={brandingSettings.emailTemplates.welcome.body}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              welcome: {...brandingSettings.emailTemplates.welcome, body: e.target.value}
                            }
                          })}
                          rows="4"
                          className="w-full p-2 border rounded font-mono text-sm"
                          placeholder="Dear {userName}, ..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available variables: {'{userName}'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Email */}
                  <div className="border-b pb-4">
                    <h4 className="font-semibold mb-3">Invoice Notification</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <input
                          type="text"
                          value={brandingSettings.emailTemplates.invoice.subject}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              invoice: {...brandingSettings.emailTemplates.invoice, subject: e.target.value}
                            }
                          })}
                          className="w-full p-2 border rounded"
                          placeholder="New Invoice from SKUD Täby"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Body</label>
                        <textarea
                          value={brandingSettings.emailTemplates.invoice.body}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              invoice: {...brandingSettings.emailTemplates.invoice, body: e.target.value}
                            }
                          })}
                          rows="4"
                          className="w-full p-2 border rounded font-mono text-sm"
                          placeholder="Dear {userName}, ..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available variables: {'{userName}, {amount}, {dueDate}'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Password Reset Email */}
                  <div className="border-b pb-4">
                    <h4 className="font-semibold mb-3">Password Reset</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <input
                          type="text"
                          value={brandingSettings.emailTemplates.passwordReset.subject}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              passwordReset: {...brandingSettings.emailTemplates.passwordReset, subject: e.target.value}
                            }
                          })}
                          className="w-full p-2 border rounded"
                          placeholder="Password Reset Request"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Body</label>
                        <textarea
                          value={brandingSettings.emailTemplates.passwordReset.body}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              passwordReset: {...brandingSettings.emailTemplates.passwordReset, body: e.target.value}
                            }
                          })}
                          rows="4"
                          className="w-full p-2 border rounded font-mono text-sm"
                          placeholder="Dear {userName}, ..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available variables: {'{userName}, {resetLink}'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Registration Email */}
                  <div>
                    <h4 className="font-semibold mb-3">Event Registration Confirmation</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <input
                          type="text"
                          value={brandingSettings.emailTemplates.eventRegistration.subject}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              eventRegistration: {...brandingSettings.emailTemplates.eventRegistration, subject: e.target.value}
                            }
                          })}
                          className="w-full p-2 border rounded"
                          placeholder="Event Registration Confirmation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Body</label>
                        <textarea
                          value={brandingSettings.emailTemplates.eventRegistration.body}
                          onChange={(e) => setBrandingSettings({
                            ...brandingSettings,
                            emailTemplates: {
                              ...brandingSettings.emailTemplates,
                              eventRegistration: {...brandingSettings.emailTemplates.eventRegistration, body: e.target.value}
                            }
                          })}
                          rows="4"
                          className="w-full p-2 border rounded font-mono text-sm"
                          placeholder="Dear {userName}, ..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available variables: {'{userName}, {eventName}, {eventDate}, {eventLocation}'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/branding`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(brandingSettings)
                      });
                      // Update branding context to apply colors immediately
                      updateBranding(brandingSettings);
                      toast.success('Branding settings saved successfully! Colors will update across the site.');
                    } catch (error) {
                      toast.error('Failed to save branding settings');
                    }
                  }}
                  className="px-8 py-3 bg-[var(--color-button-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] font-semibold"
                >
                  Save All Branding Settings
                </button>
              </div>
            </TabsContent>
          )}


          {/* Admin Management Tab - Only Super Admin */}
          {isSuperAdmin && (
            <TabsContent value="admin-management" className="space-y-6">
              <Card className="border-2 border-[var(--color-primary)]/20">
                <CardHeader>
                  <CardTitle>{t('admin.adminManagement.title')}</CardTitle>
                  <p className="text-sm text-gray-600">{t('admin.adminManagement.description')}</p>
                </CardHeader>
                <CardContent>
                  <AdminManagementPanel t={t} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>

        {/* Create Invoice Dialog */}
        <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Member</label>
                <select
                  value={newInvoice.userId}
                  onChange={(e) => setNewInvoice({...newInvoice, userId: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="">Choose a member...</option>
                  {users.filter(u => u.role === 'user').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </select>
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
                  disabled={!newInvoice.userId || !newInvoice.amount || !newInvoice.dueDate || !newInvoice.description}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Invoice
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
                  <label className="block text-sm font-medium mb-2">Member</label>
                  <input
                    type="text"
                    value={getUserName(editingInvoice.userId)}
                    disabled
                    className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">Member cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={editingInvoice.description}
                    onChange={(e) => setEditingInvoice({...editingInvoice, description: e.target.value})}
                    placeholder="e.g., Membership Fee - January 2025"
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Amount (SEK)</label>
                  <input
                    type="number"
                    value={editingInvoice.amount}
                    onChange={(e) => setEditingInvoice({...editingInvoice, amount: e.target.value})}
                    placeholder="500"
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
                  <div className="p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      editingInvoice.status === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {editingInvoice.status === 'paid' ? t('admin.status.paid') : t('admin.status.unpaid')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Status cannot be changed here. Use &quot;Mark Paid&quot; button.</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={async () => {
                      try {
                        await invoicesAPI.update(editingInvoice.id, {
                          description: editingInvoice.description,
                          amount: parseFloat(editingInvoice.amount),
                          dueDate: editingInvoice.dueDate
                        });
                        
                        // Refresh invoices
                        const data = await invoicesAPI.getAll();
                        setInvoices(data.invoices || []);
                        
                        toast.success('Invoice updated successfully');
                        setEditInvoiceOpen(false);
                        setEditingInvoice(null);
                      } catch (error) {
                        toast.error('Failed to update invoice');
                      }
                    }}
                    disabled={!editingInvoice.amount || !editingInvoice.dueDate || !editingInvoice.description}
                    className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Invoice
                  </button>
                  <button
                    onClick={() => {
                      setEditInvoiceOpen(false);
                      setEditingInvoice(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Details/View Dialog */}
        <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                📄 Invoice Details
                {viewingInvoice?.status === 'paid' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">PAID</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">UNPAID</span>
                )}
              </DialogTitle>
            </DialogHeader>
            {viewingInvoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white p-6 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">SKUD Täby</h2>
                      <p className="text-sm opacity-90">Srpsko Kulturno Udruženje Täby</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-90">Invoice #</p>
                      <p className="font-mono font-bold">{viewingInvoice.id?.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Billed To</label>
                      <p className="font-semibold text-lg">{getUserName(viewingInvoice.userId)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
                      <p className="font-medium">{viewingInvoice.description}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Due Date</label>
                      <p className="font-semibold">{viewingInvoice.dueDate}</p>
                    </div>
                    {viewingInvoice.paymentDate && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide">Payment Date</label>
                        <p className="font-semibold text-green-600">{viewingInvoice.paymentDate}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Created</label>
                      <p className="text-sm">{new Date(viewingInvoice.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Amount</span>
                    <span className="text-3xl font-bold text-[var(--color-primary)]">
                      {viewingInvoice.amount} {viewingInvoice.currency || 'SEK'}
                    </span>
                  </div>
                </div>

                {/* File Section */}
                {viewingInvoice.fileUrl && (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Attached File</label>
                    <div className="flex gap-3 mt-2">
                      <a
                        href={`${process.env.REACT_APP_BACKEND_URL}${viewingInvoice.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
                      >
                        👁️ View File
                      </a>
                      <a
                        href={`${process.env.REACT_APP_BACKEND_URL}${viewingInvoice.fileUrl}`}
                        download
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                      >
                        📥 Download File
                      </a>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {viewingInvoice.status === 'unpaid' && (
                    <>
                      <button
                        onClick={() => {
                          setEditingInvoice(viewingInvoice);
                          setEditInvoiceOpen(true);
                          setViewingInvoice(null);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        ✏️ Edit Invoice
                      </button>
                      <button
                        onClick={async () => {
                          await handleMarkPaid(viewingInvoice.id);
                          setViewingInvoice(null);
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        ✅ Mark as Paid
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setViewingInvoice(null)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Member Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-[var(--color-primary)]">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">{selectedUser.user?.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedUser.user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedUser.user?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Year of Birth</p>
                      <p className="font-medium">{selectedUser.user?.yearOfBirth || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{selectedUser.user?.address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email Verified</p>
                      <p className="font-medium">{selectedUser.user?.emailVerified ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="font-medium">
                        {selectedUser.user?.createdAt ? new Date(selectedUser.user.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parent Information (if applicable) */}
                {(selectedUser.user?.parentName || selectedUser.user?.parentEmail) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-[var(--color-primary)]">Parent/Guardian Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Parent Name</p>
                        <p className="font-medium">{selectedUser.user?.parentName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Parent Email</p>
                        <p className="font-medium">{selectedUser.user?.parentEmail || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Parent Phone</p>
                        <p className="font-medium">{selectedUser.user?.parentPhone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoices */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-[var(--color-primary)]">
                    Invoices ({selectedUser.invoiceCount || 0})
                  </h3>
                  {selectedUser.invoices && selectedUser.invoices.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.invoices.map((invoice) => (
                        <div key={invoice._id} className="p-3 border rounded bg-gray-50 dark:bg-gray-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{invoice.description}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Due: {invoice.dueDate}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{invoice.amount} {invoice.currency}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                invoice.status === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {invoice.status === 'paid' ? t('admin.status.paid') : t('admin.status.unpaid')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No invoices found</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Event Dialog */}
        <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin.events.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('admin.events.form.date')} *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('admin.events.form.time')} *</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.location')} *</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  placeholder="e.g., Täby Sportshall"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleEn')} *</label>
                <input
                  type="text"
                  value={eventForm.title.en}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, en: e.target.value}})}
                  placeholder="Training Session"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleSrLatin')}</label>
                <input
                  type="text"
                  value={eventForm.title['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-latin': e.target.value}})}
                  placeholder="Trening"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleSrCyrillic')}</label>
                <input
                  type="text"
                  value={eventForm.title['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-cyrillic': e.target.value}})}
                  placeholder="Тренинг"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleSv')}</label>
                <input
                  type="text"
                  value={eventForm.title.sv}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, sv: e.target.value}})}
                  placeholder="Träning"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionEn')} *</label>
                <textarea
                  value={eventForm.description.en}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, en: e.target.value}})}
                  placeholder="Details about the event..."
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionSrLatin')}</label>
                <textarea
                  value={eventForm.description['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-latin': e.target.value}})}
                  placeholder="Detalji o događaju..."
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionSrCyrillic')}</label>
                <textarea
                  value={eventForm.description['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-cyrillic': e.target.value}})}
                  placeholder="Детаљи о догађају..."
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionSv')}</label>
                <textarea
                  value={eventForm.description.sv}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, sv: e.target.value}})}
                  placeholder="Information om evenemanget..."
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateEvent}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                >
                  {t('admin.events.createButton')}
                </button>
                <button
                  onClick={() => setCreateEventOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  {t('admin.actions.cancel')}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={editEventOpen} onOpenChange={setEditEventOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin.events.editTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('admin.events.form.date')} *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('admin.events.form.time')} *</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.location')} *</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  placeholder="e.g., Täby Sportshall"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleEn')} *</label>
                <input
                  type="text"
                  value={eventForm.title.en}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, en: e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleSrLatin')}</label>
                <input
                  type="text"
                  value={eventForm.title['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-latin': e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleSrCyrillic')}</label>
                <input
                  type="text"
                  value={eventForm.title['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-cyrillic': e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.titleSv')}</label>
                <input
                  type="text"
                  value={eventForm.title.sv}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, sv: e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionEn')} *</label>
                <textarea
                  value={eventForm.description.en}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, en: e.target.value}})}
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionSrLatin')}</label>
                <textarea
                  value={eventForm.description['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-latin': e.target.value}})}
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionSrCyrillic')}</label>
                <textarea
                  value={eventForm.description['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-cyrillic': e.target.value}})}
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.events.form.descriptionSv')}</label>
                <textarea
                  value={eventForm.description.sv}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, sv: e.target.value}})}
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdateEvent}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                >
                  {t('admin.events.updateButton')}
                </button>
                <button
                  onClick={() => setEditEventOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  {t('admin.actions.cancel')}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* News Edit/Create Modal */}
        <Dialog open={newsModalOpen} onOpenChange={setNewsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNews ? 'Edit News' : 'Create News'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={newsForm.date}
                  onChange={(e) => setNewsForm({...newsForm, date: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>

              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Title ({lang})
                  </label>
                  <input
                    type="text"
                    value={newsForm.title[lang]}
                    onChange={(e) => setNewsForm({
                      ...newsForm,
                      title: {...newsForm.title, [lang]: e.target.value}
                    })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}

              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Text ({lang})
                  </label>
                  <textarea
                    value={newsForm.text[lang]}
                    onChange={(e) => setNewsForm({
                      ...newsForm,
                      text: {...newsForm.text, [lang]: e.target.value}
                    })}
                    rows={4}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-2">Image</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const token = localStorage.getItem('token');
                          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/news/upload-image`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                          });
                          const data = await response.json();
                          if (data.success) {
                            setNewsForm({...newsForm, image: `${process.env.REACT_APP_BACKEND_URL}${data.imageUrl}`});
                            toast.success('Image uploaded');
                          }
                        } catch (error) {
                          toast.error('Failed to upload image');
                        }
                      }
                    }}
                    className="w-full p-2 border rounded"
                  />
                  <div className="text-xs text-gray-500">Or enter image URL:</div>
                  <input
                    type="text"
                    value={newsForm.image}
                    onChange={(e) => setNewsForm({...newsForm, image: e.target.value})}
                    placeholder="https://..."
                    className="w-full p-2 border rounded"
                  />
                  {newsForm.image && (
                    <img src={newsForm.image} alt="Preview" className="mt-2 max-h-32 rounded border" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video URL (optional)</label>
                <input
                  type="text"
                  value={newsForm.video}
                  onChange={(e) => setNewsForm({...newsForm, video: e.target.value})}
                  placeholder="https://..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
                    try {
                      if (editingNews) {
                        await newsAPI.update(editingNews.id, newsForm);
                        toast.success('News updated');
                      } else {
                        await newsAPI.create(newsForm);
                        toast.success('News created');
                      }
                      setNewsModalOpen(false);
                      // Refresh news list
                      const newsData = await newsAPI.getAll(100, 0);
                      setNews(newsData.news || []);
                    } catch (error) {
                      toast.error('Failed to save news');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                >
                  {editingNews ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => setNewsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* About Content Modal */}
        <Dialog open={aboutModalOpen} onOpenChange={setAboutModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit About Page Content</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Content ({lang})
                  </label>
                  <textarea
                    value={aboutContent[lang]}
                    onChange={(e) => setAboutContent({...aboutContent, [lang]: e.target.value})}
                    rows={8}
                    className="w-full p-2 border rounded"
                    placeholder={`Enter about content in ${lang}...`}
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
                    try {
                      await contentAPI.updateAbout({ content: aboutContent });
                      toast.success('About content updated');
                      setAboutModalOpen(false);
                    } catch (error) {
                      toast.error('Failed to update about content');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setAboutModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Serbian Story Modal */}
        <Dialog open={storyModalOpen} onOpenChange={setStoryModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStory ? 'Edit Story' : 'Create Story'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={storyForm.date}
                  onChange={(e) => setStoryForm({...storyForm, date: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>

              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Title ({lang})
                  </label>
                  <input
                    type="text"
                    value={storyForm.title[lang]}
                    onChange={(e) => setStoryForm({
                      ...storyForm,
                      title: {...storyForm.title, [lang]: e.target.value}
                    })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}

              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Text ({lang})
                  </label>
                  <textarea
                    value={storyForm.text[lang]}
                    onChange={(e) => setStoryForm({
                      ...storyForm,
                      text: {...storyForm.text, [lang]: e.target.value}
                    })}
                    rows={4}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-2">Image</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const token = localStorage.getItem('token');
                          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/stories/upload-image`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                          });
                          const data = await response.json();
                          if (data.success) {
                            setStoryForm({...storyForm, image: `${process.env.REACT_APP_BACKEND_URL}${data.imageUrl}`});
                            toast.success('Image uploaded');
                          }
                        } catch (error) {
                          toast.error('Failed to upload image');
                        }
                      }
                    }}
                    className="w-full p-2 border rounded"
                  />
                  <div className="text-xs text-gray-500">Or enter image URL:</div>
                  <input
                    type="text"
                    value={storyForm.image}
                    onChange={(e) => setStoryForm({...storyForm, image: e.target.value})}
                    placeholder="https://..."
                    className="w-full p-2 border rounded"
                  />
                  {storyForm.image && (
                    <img src={storyForm.image} alt="Preview" className="mt-2 max-h-32 rounded border" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video URL (optional)</label>
                <input
                  type="text"
                  value={storyForm.video}
                  onChange={(e) => setStoryForm({...storyForm, video: e.target.value})}
                  placeholder="https://..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Source Link (optional)</label>
                <input
                  type="text"
                  value={storyForm.url}
                  onChange={(e) => setStoryForm({...storyForm, url: e.target.value})}
                  placeholder="https://..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
                    try {
                      if (editingStory) {
                        await storiesAPI.update(editingStory.id, storyForm);
                        toast.success('Story updated');
                      } else {
                        await storiesAPI.create(storyForm);
                        toast.success('Story created');
                      }
                      setStoryModalOpen(false);
                      // Refresh stories list
                      const storiesData = await storiesAPI.getAll();
                      setStories(storiesData.stories || []);
                    } catch (error) {
                      toast.error('Failed to save story');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                >
                  {editingStory ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => setStoryModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Album Modal */}
        <Dialog open={albumModalOpen} onOpenChange={setAlbumModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAlbum ? 'Edit Album' : 'Create Album'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={albumForm.date}
                    onChange={(e) => setAlbumForm({...albumForm, date: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Place</label>
                  <input
                    type="text"
                    value={albumForm.place}
                    onChange={(e) => setAlbumForm({...albumForm, place: e.target.value})}
                    placeholder="Location..."
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Title ({lang})
                  </label>
                  <input
                    type="text"
                    value={albumForm.title[lang]}
                    onChange={(e) => setAlbumForm({
                      ...albumForm,
                      title: {...albumForm.title, [lang]: e.target.value}
                    })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}

              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Description ({lang})
                  </label>
                  <textarea
                    value={albumForm.description[lang]}
                    onChange={(e) => setAlbumForm({
                      ...albumForm,
                      description: {...albumForm.description, [lang]: e.target.value}
                    })}
                    rows={2}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}

              {editingAlbum && (
                <div>
                  <label className="block text-sm font-medium mb-2">Album Photos ({albumForm.images.length})</label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setUploadingToAlbum(editingAlbum.id);
                          try {
                            const token = localStorage.getItem('token');
                            for (const file of files) {
                              const formData = new FormData();
                              formData.append('file', file);
                              const response = await fetch(
                                `${process.env.REACT_APP_BACKEND_URL}/api/gallery/${editingAlbum.id}/upload-image`,
                                {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: formData
                                }
                              );
                              const data = await response.json();
                              if (data.success) {
                                // Don't manually update - the backend already saved it
                                // Just refresh the current album data to show the new image
                                const galleryData = await galleryAPI.getAll();
                                const updatedAlbum = galleryData.items.find(a => a.id === editingAlbum.id);
                                if (updatedAlbum) {
                                  setAlbumForm(prev => ({
                                    ...prev,
                                    images: updatedAlbum.images || []
                                  }));
                                }
                              }
                            }
                            toast.success(`${files.length} image(s) uploaded`);
                          } catch (error) {
                            toast.error('Failed to upload images');
                          } finally {
                            setUploadingToAlbum(null);
                          }
                        }
                      }}
                      className="w-full p-2 border rounded"
                      disabled={uploadingToAlbum === editingAlbum.id}
                    />
                    {uploadingToAlbum === editingAlbum?.id && (
                      <p className="text-sm text-blue-600">Uploading...</p>
                    )}
                    {albumForm.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {albumForm.images.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={img} 
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this photo?')) {
                                  try {
                                    const token = localStorage.getItem('token');
                                    await fetch(
                                      `${process.env.REACT_APP_BACKEND_URL}/api/gallery/${editingAlbum.id}/image?image_url=${encodeURIComponent(img)}`,
                                      {
                                        method: 'DELETE',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      }
                                    );
                                    setAlbumForm(prev => ({
                                      ...prev,
                                      images: prev.images.filter(i => i !== img)
                                    }));
                                    toast.success('Photo deleted');
                                  } catch (error) {
                                    toast.error('Failed to delete photo');
                                  }
                                }
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
                    try {
                      if (editingAlbum) {
                        // Don't send images array since they're already saved via upload endpoint
                        const updateData = {
                          date: albumForm.date,
                          title: albumForm.title,
                          description: albumForm.description,
                          place: albumForm.place,
                          videos: albumForm.videos
                        };
                        await galleryAPI.update(editingAlbum.id, updateData);
                        toast.success('Album updated');
                      } else {
                        await galleryAPI.create(albumForm);
                        toast.success('Album created');
                      }
                      setAlbumModalOpen(false);
                      // Refresh albums
                      const galleryData = await galleryAPI.getAll();
                      setAlbums(galleryData.items || []);
                    } catch (error) {
                      console.error('Save error:', error);
                      toast.error('Failed to save album');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                >
                  {editingAlbum ? 'Update Album' : 'Create Album'}
                </button>
                <button
                  onClick={() => setAlbumModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
              {!editingAlbum && (
                <p className="text-sm text-gray-500 text-center">
                  Note: Create the album first, then edit it to upload photos
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create User Modal */}
        {isSuperAdmin && (
          <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const token = localStorage.getItem('token');
                  await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(newUser)
                  });
                  const usersData = await adminAPI.getUsers();
                  setUsers(usersData.users || []);
                  toast.success('User created successfully');
                  setCreateUserModalOpen(false);
                } catch (error) {
                  toast.error('Failed to create user');
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Username *</label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Password *</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                      minLength="6"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Year of Birth</label>
                    <input
                      type="number"
                      value={newUser.yearOfBirth}
                      onChange={(e) => setNewUser({...newUser, yearOfBirth: e.target.value})}
                      className="w-full p-2 border rounded"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <input
                    type="text"
                    value={newUser.address}
                    onChange={(e) => setNewUser({...newUser, address: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateUserModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit User Modal */}
        {isSuperAdmin && editingUser && (
          <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User: {editingUser.fullName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.fullName || ''}
                    onChange={(e) => setEditingUser({...editingUser, fullName: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                {editingUser.role !== 'superadmin' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      className="w-full p-2 border rounded"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Reset Password (optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={editingUser.newPassword || ''}
                    onChange={(e) => setEditingUser({...editingUser, newPassword: e.target.value})}
                    className="w-full p-2 border rounded"
                    minLength="6"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter a new password only if you want to reset it</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Year of Birth</label>
                    <input
                      type="number"
                      value={editingUser.yearOfBirth || ''}
                      onChange={(e) => setEditingUser({...editingUser, yearOfBirth: e.target.value})}
                      className="w-full p-2 border rounded"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <input
                    type="text"
                    value={editingUser.address || ''}
                    onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const updateData = {
                          fullName: editingUser.fullName,
                          email: editingUser.email,
                          role: editingUser.role,
                          phone: editingUser.phone,
                          yearOfBirth: editingUser.yearOfBirth,
                          address: editingUser.address
                        };
                        if (editingUser.newPassword) {
                          updateData.password = editingUser.newPassword;
                        }
                        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users/${editingUser.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify(updateData)
                        });
                        const usersData = await adminAPI.getUsers();
                        setUsers(usersData.users || []);
                        toast.success('User updated successfully');
                        setEditUserModalOpen(false);
                        setEditingUser(null);
                      } catch (error) {
                        toast.error('Failed to update user');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-[var(--color-button-primary)] text-white rounded hover:bg-[var(--color-button-hover)]"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditUserModalOpen(false);
                      setEditingUser(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;