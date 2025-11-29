import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Users, FileText, Calendar, Settings, BarChart } from 'lucide-react';
import { adminAPI, eventsAPI, invoicesAPI, newsAPI, contentAPI, storiesAPI, galleryAPI, settingsAPI } from '../services/api';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { isAdmin, isSuperAdmin, isModerator, user } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
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
        
        // Super Admin only: fetch platform settings
        if (user?.role === 'superadmin') {
          const token = localStorage.getItem('token');
          apiCalls.push(
            fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/platform-settings`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json())
          );
        }
        
        const results = await Promise.all(apiCalls);
        const [statsData, usersData, eventsData, invoicesData, newsData, storiesData, galleryData, settingsData, platformSettingsData] = results;
        setStatistics(statsData);
        setUsers(usersData.users || []);
        setEvents(eventsData.events || []);
        setInvoices(invoicesData.invoices || []);
        setNews(newsData.news || []);
        setStories(storiesData.stories || []);
        setAlbums(galleryData.items || []);
        if (settingsData) {
          setSettings(settingsData);
        }
        if (platformSettingsData && user?.role === 'superadmin') {
          setPlatformSettings(platformSettingsData);
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
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      await eventsAPI.delete(eventId);
      toast.success('Event deleted successfully');
      // Refresh events
      const eventsData = await eventsAPI.getAll();
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error('Failed to delete event');
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
          <h1 className="text-4xl font-bold text-[#8B1F1F] dark:text-[#C1272D]">
            {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-[#C1272D]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {loading ? '...' : statistics?.totalMembers || 0}
                  </p>
                </div>
                <Users className="h-12 w-12 text-[#C1272D]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[#C1272D]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Paid Invoices</p>
                  <p className="text-3xl font-bold text-green-600">
                    {loading ? '...' : statistics?.paidInvoices || 0}
                  </p>
                </div>
                <FileText className="h-12 w-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[#C1272D]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Unpaid Invoices</p>
                  <p className="text-3xl font-bold text-red-600">
                    {loading ? '...' : statistics?.unpaidInvoices || 0}
                  </p>
                </div>
                <FileText className="h-12 w-12 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[#C1272D]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-3xl font-bold text-[#C1272D]">
                    {loading ? '...' : `${statistics?.totalRevenue || 0} SEK`}
                  </p>
                </div>
                <BarChart className="h-12 w-12 text-[#C1272D]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue={isModerator ? "events" : "members"} className="space-y-6">
          <TabsList className={`grid w-full ${
            isSuperAdmin ? 'grid-cols-7 max-w-5xl' : 
            isModerator ? 'grid-cols-2 max-w-xl' : 
            'grid-cols-5 max-w-3xl'
          }`}>
            {/* Members tab - Only Admin and Super Admin */}
            {(isAdmin && !isModerator) && (
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
            )}
            {/* Invoices tab - Only Admin and Super Admin */}
            {(isAdmin && !isModerator) && (
              <TabsTrigger value="invoices">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
            )}
            {/* Events tab - All roles */}
            <TabsTrigger value="events">
              <Calendar className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
            {/* Content tab - All roles */}
            <TabsTrigger value="content">
              <Settings className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            {/* Settings tab - Only Admin and Super Admin */}
            {(isAdmin && !isModerator) && (
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            )}
            {/* Users & Roles tab - Only Super Admin */}
            {isSuperAdmin && (
              <TabsTrigger value="user-management">
                <Users className="h-4 w-4 mr-2" />
                Users & Roles
              </TabsTrigger>
            )}
            {/* Platform Settings tab - Only Super Admin */}
            {isSuperAdmin && (
              <TabsTrigger value="platform-settings">
                <Settings className="h-4 w-4 mr-2" />
                Platform
              </TabsTrigger>
            )}
          </TabsList>

          {/* Members Tab - Only Admin and Super Admin */}
          {(isAdmin && !isModerator) && (
            <TabsContent value="members">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Members Management</CardTitle>
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
                    className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F] text-sm"
                  >
                    Export PDF
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
                    Export Excel
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
                    Export XML
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-gray-600 dark:text-gray-400">Loading members...</p>
                  ) : users.filter(u => u.role === 'user').length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No members yet.</p>
                  ) : (
                    users.filter(u => u.role === 'user').map((user) => (
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
                              View Details
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
                              Delete
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
          )}

          {/* Invoices Tab - Only Admin and Super Admin */}
          {(isAdmin && !isModerator) && (
          <TabsContent value="invoices">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invoices Management</CardTitle>
                <button
                  onClick={() => setCreateInvoiceOpen(true)}
                  className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                >
                  Create Invoice
                </button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-gray-600 dark:text-gray-400">Loading invoices...</p>
                  ) : invoices.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No invoices found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800">
                            <th className="p-3 text-left">Member</th>
                            <th className="p-3 text-left">Description</th>
                            <th className="p-3 text-left">Amount</th>
                            <th className="p-3 text-left">Due Date</th>
                            <th className="p-3 text-left">Payment Date</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">File</th>
                            <th className="p-3 text-left">Actions</th>
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
                                  {invoice.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  {invoice.fileUrl ? (
                                    <>
                                      <a
                                        href={`${process.env.REACT_APP_BACKEND_URL}${invoice.fileUrl}`}
                                        download
                                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 text-center"
                                      >
                                        📄 Download
                                      </a>
                                      <button
                                        onClick={() => handleDeleteInvoiceFile(invoice.id)}
                                        className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                      >
                                        🗑️ Remove
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
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      if (invoice.status === 'paid') {
                                        toast.error('This invoice is paid, you cannot change paid invoice');
                                      } else {
                                        setEditingInvoice(invoice);
                                        setEditInvoiceOpen(true);
                                      }
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  {invoice.status === 'unpaid' && (
                                    <button
                                      onClick={() => handleMarkPaid(invoice.id)}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    >
                                      Mark Paid
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
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  >
                                    Delete
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
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Events & Training Management</CardTitle>
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
                  className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F] transition-colors"
                >
                  + Add Event
                </button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No events scheduled. Click &quot;Add Event&quot; to create one.
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
                                  CANCELLED
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              📅 {event.date} at {event.time}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              📍 {event.location}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {event.description['en']}
                            </p>
                            {event.status === 'cancelled' && event.cancellationReason && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                <strong>Reason:</strong> {event.cancellationReason}
                              </p>
                            )}
                            {event.participants && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                👥 {event.participants.length} participant(s) confirmed
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
                              Edit
                            </button>
                            {event.status === 'active' && (
                              <button
                                onClick={() => handleCancelEvent(event)}
                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                              Delete
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
              <Card className="border-2 border-[#C1272D]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>News Management (Home Page)</CardTitle>
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
                    className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                  >
                    ➕ Add News
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
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete this news item?')) {
                                try {
                                  await newsAPI.delete(item.id);
                                  setNews(news.filter(n => n.id !== item.id));
                                  toast.success('News deleted');
                                } catch (error) {
                                  toast.error('Failed to delete news');
                                }
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* About Page */}
              <Card className="border-2 border-[#C1272D]/20">
                <CardHeader>
                  <CardTitle>About Page Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Edit the about page content in all languages.</p>
                  <button
                    onClick={async () => {
                      try {
                        const data = await contentAPI.getAbout();
                        setAboutContent(data.content || { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' });
                        setAboutModalOpen(true);
                      } catch (error) {
                        toast.error('Failed to load about content');
                      }
                    }}
                    className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                  >
                    ✏️ Edit About Content
                  </button>
                </CardContent>
              </Card>

              {/* Serbian Story Management */}
              <Card className="border-2 border-[#C1272D]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Serbian Story Management</CardTitle>
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
                    className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                  >
                    ➕ Add Story
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
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete this story?')) {
                                try {
                                  await storiesAPI.delete(item.id);
                                  setStories(stories.filter(s => s.id !== item.id));
                                  toast.success('Story deleted');
                                } catch (error) {
                                  toast.error('Failed to delete story');
                                }
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gallery Management */}
              <Card className="border-2 border-[#C1272D]/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Gallery Management (Albums)</CardTitle>
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
                    className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                  >
                    ➕ Create Album
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {albums.map((album) => (
                      <div key={album.id} className="p-4 border rounded">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold">{album.title?.en || album.description?.en || album.description?.['sr-latin']}</h4>
                            <p className="text-sm text-gray-500">{album.date} • {album.place || 'No location'}</p>
                            <p className="text-sm text-gray-600 mt-1">{album.images?.length || 0} photos</p>
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
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this album and all its photos?')) {
                                  try {
                                    await galleryAPI.delete(album.id);
                                    setAlbums(albums.filter(a => a.id !== album.id));
                                    toast.success('Album deleted');
                                  } catch (error) {
                                    toast.error('Failed to delete album');
                                  }
                                }
                              }}
                              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Delete
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
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>Association Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await settingsAPI.update(settings);
                    toast.success('Settings updated successfully');
                  } catch (error) {
                    toast.error('Failed to update settings');
                  }
                }} className="space-y-6">
                  
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Contact Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Address</label>
                        <input
                          type="text"
                          value={settings.address}
                          onChange={(e) => setSettings({...settings, address: e.target.value})}
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Contact Email</label>
                          <input
                            type="email"
                            value={settings.contactEmail}
                            onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                            className="w-full p-3 border rounded-md"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Contact Phone</label>
                          <input
                            type="tel"
                            value={settings.contactPhone}
                            onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                            className="w-full p-3 border rounded-md"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Social Media Links</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Facebook URL</label>
                        <input
                          type="url"
                          value={settings.socialMedia.facebook}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, facebook: e.target.value}
                          })}
                          placeholder="https://facebook.com/..."
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Instagram URL</label>
                        <input
                          type="url"
                          value={settings.socialMedia.instagram}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, instagram: e.target.value}
                          })}
                          placeholder="https://instagram.com/..."
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">YouTube URL</label>
                        <input
                          type="url"
                          value={settings.socialMedia.youtube}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, youtube: e.target.value}
                          })}
                          placeholder="https://youtube.com/..."
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Snapchat URL</label>
                        <input
                          type="url"
                          value={settings.socialMedia.snapchat}
                          onChange={(e) => setSettings({
                            ...settings,
                            socialMedia: {...settings.socialMedia, snapchat: e.target.value}
                          })}
                          placeholder="https://snapchat.com/add/..."
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Organization Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Organization Number (Org. nr)</label>
                        <input
                          type="text"
                          value={settings.registrationNumber}
                          onChange={(e) => setSettings({...settings, registrationNumber: e.target.value})}
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">VAT Number</label>
                        <input
                          type="text"
                          value={settings.vatNumber}
                          onChange={(e) => setSettings({...settings, vatNumber: e.target.value})}
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Bank Account</label>
                        <input
                          type="text"
                          value={settings.bankAccount}
                          onChange={(e) => setSettings({...settings, bankAccount: e.target.value})}
                          className="w-full p-3 border rounded-md"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-[#C1272D] text-white rounded-md hover:bg-[#8B1F1F] font-semibold"
                  >
                    Save Settings
                  </button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Super Admin - User Management Tab */}
          {isSuperAdmin && (
            <TabsContent value="user-management" className="space-y-6">
              {/* Permission Management Card */}
              <Card className="border-2 border-[#C1272D]/20">
                <CardHeader>
                  <CardTitle>Role Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Admin Permissions */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-red-700 dark:text-red-400">Admin Permissions</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> View Members
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Events
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Invoices
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Content
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Gallery
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Settings
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">✗</span> Manage Users
                        </div>
                      </div>
                    </div>

                    {/* Moderator Permissions */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400">Moderator Permissions</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">✗</span> View Members
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Events
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">✗</span> Manage Invoices
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Content
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Gallery
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">✗</span> Manage Settings
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">✗</span> Manage Users
                        </div>
                      </div>
                    </div>

                    {/* User Permissions */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-400">User Permissions</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> View Profile
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Edit Profile
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> View Events
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Join Events
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> View Invoices
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">✗</span> Access Dashboard
                        </div>
                      </div>
                    </div>

                    {/* Super Admin Note */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-700 dark:text-purple-400">Super Admin</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> All Permissions
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Manage Users
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Assign Roles
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> Delete Users
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span> System Config
                        </div>
                        <p className="text-xs text-gray-500 mt-2 italic">Full system access</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Management Card */}
              <Card className="border-2 border-[#C1272D]/20">
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
                    className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
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
              <Card className="border-2 border-[#C1272D]/20">
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
              <Card className="border-2 border-[#C1272D]/20">
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
              <Card className="border-2 border-[#C1272D]/20">
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
              <Card className="border-2 border-[#C1272D]/20">
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
                  className="px-8 py-3 bg-[#C1272D] text-white rounded-lg hover:bg-[#8B1F1F] font-semibold"
                >
                  Save All Platform Settings
                </button>
              </div>
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
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F] disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {editingInvoice.status.toUpperCase()}
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
                    className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <h3 className="text-lg font-semibold mb-3 text-[#C1272D]">Personal Information</h3>
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
                    <h3 className="text-lg font-semibold mb-3 text-[#C1272D]">Parent/Guardian Information</h3>
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
                  <h3 className="text-lg font-semibold mb-3 text-[#C1272D]">
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
                                {invoice.status.toUpperCase()}
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
              <DialogTitle>Create New Event/Training</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time *</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location *</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  placeholder="e.g., Täby Sportshall"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (English) *</label>
                <input
                  type="text"
                  value={eventForm.title.en}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, en: e.target.value}})}
                  placeholder="Training Session"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (Serbian Latin)</label>
                <input
                  type="text"
                  value={eventForm.title['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-latin': e.target.value}})}
                  placeholder="Trening"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (Serbian Cyrillic)</label>
                <input
                  type="text"
                  value={eventForm.title['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-cyrillic': e.target.value}})}
                  placeholder="Тренинг"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (Swedish)</label>
                <input
                  type="text"
                  value={eventForm.title.sv}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, sv: e.target.value}})}
                  placeholder="Träning"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (English) *</label>
                <textarea
                  value={eventForm.description.en}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, en: e.target.value}})}
                  placeholder="Details about the event..."
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Serbian Latin)</label>
                <textarea
                  value={eventForm.description['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-latin': e.target.value}})}
                  placeholder="Detalji o događaju..."
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Serbian Cyrillic)</label>
                <textarea
                  value={eventForm.description['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-cyrillic': e.target.value}})}
                  placeholder="Детаљи о догађају..."
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Swedish)</label>
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
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                >
                  Create Event
                </button>
                <button
                  onClick={() => setCreateEventOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={editEventOpen} onOpenChange={setEditEventOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Event/Training</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time *</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location *</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  placeholder="e.g., Täby Sportshall"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (English) *</label>
                <input
                  type="text"
                  value={eventForm.title.en}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, en: e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (Serbian Latin)</label>
                <input
                  type="text"
                  value={eventForm.title['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-latin': e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (Serbian Cyrillic)</label>
                <input
                  type="text"
                  value={eventForm.title['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, 'sr-cyrillic': e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title (Swedish)</label>
                <input
                  type="text"
                  value={eventForm.title.sv}
                  onChange={(e) => setEventForm({...eventForm, title: {...eventForm.title, sv: e.target.value}})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (English) *</label>
                <textarea
                  value={eventForm.description.en}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, en: e.target.value}})}
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Serbian Latin)</label>
                <textarea
                  value={eventForm.description['sr-latin']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-latin': e.target.value}})}
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Serbian Cyrillic)</label>
                <textarea
                  value={eventForm.description['sr-cyrillic']}
                  onChange={(e) => setEventForm({...eventForm, description: {...eventForm.description, 'sr-cyrillic': e.target.value}})}
                  rows="3"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Swedish)</label>
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
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                >
                  Update Event
                </button>
                <button
                  onClick={() => setEditEventOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
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
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
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
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
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
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
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
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
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
                    className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
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
                    className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
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