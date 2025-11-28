import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Users, FileText, Calendar, Settings, BarChart } from 'lucide-react';
import { adminAPI, eventsAPI, invoicesAPI, newsAPI, contentAPI } from '../services/api';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
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
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyContent, setStoryContent] = useState({ 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' });
  const [storySourceLink, setStorySourceLink] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, usersData, eventsData, invoicesData, newsData] = await Promise.all([
          adminAPI.getStatistics(),
          adminAPI.getUsers(),
          eventsAPI.getAll(),
          invoicesAPI.getAll(),
          newsAPI.getAll(100, 0)
        ]);
        setStatistics(statsData);
        setUsers(usersData.users || []);
        setEvents(eventsData.events || []);
        setInvoices(invoicesData.invoices || []);
        setNews(newsData.news || []);
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

  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
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
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="content">
              <Settings className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
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

          {/* Invoices Tab */}
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
                                  const token = localStorage.getItem('token');
                                  await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/news/${item.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
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

              {/* Serbian Story */}
              <Card className="border-2 border-[#C1272D]/20">
                <CardHeader>
                  <CardTitle>Serbian Story Page</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Edit Serbian culture story with text, image, and source link.</p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/content/serbian-story`);
                        const data = await response.json();
                        setStoryContent(data.content || { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' });
                        setStorySourceLink(data.sourceLink || '');
                        setStoryModalOpen(true);
                      } catch (error) {
                        toast.error('Failed to load story content');
                      }
                    }}
                    className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                  >
                    ✏️ Edit Serbian Story
                  </button>
                </CardContent>
              </Card>

              {/* Gallery Management - Note for Future */}
              <Card className="border-2 border-[#C1272D]/20">
                <CardHeader>
                  <CardTitle>Gallery Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Gallery page uses data seeded in database. To update gallery images, modify the seed data or implement image upload feature.</p>
                  <p className="text-xs text-gray-500 mt-2">Current gallery items are managed through the database gallery collection.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>Association Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  General settings like contact info, social media, and bank details can be edited here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
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
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <input
                  type="text"
                  value={newsForm.image}
                  onChange={(e) => setNewsForm({...newsForm, image: e.target.value})}
                  placeholder="https://..."
                  className="w-full p-2 border rounded"
                />
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
                      const token = localStorage.getItem('token');
                      const url = editingNews 
                        ? `${process.env.REACT_APP_BACKEND_URL}/api/news/${editingNews.id}`
                        : `${process.env.REACT_APP_BACKEND_URL}/api/news`;
                      const method = editingNews ? 'PUT' : 'POST';

                      const response = await fetch(url, {
                        method,
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(newsForm)
                      });

                      if (response.ok) {
                        toast.success(editingNews ? 'News updated' : 'News created');
                        setNewsModalOpen(false);
                        // Refresh news list
                        const newsResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/news`);
                        const newsData = await newsResponse.json();
                        setNews(newsData.news || []);
                      } else {
                        toast.error('Failed to save news');
                      }
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
                      const token = localStorage.getItem('token');
                      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/content/about`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ content: aboutContent })
                      });

                      if (response.ok) {
                        toast.success('About content updated');
                        setAboutModalOpen(false);
                      } else {
                        toast.error('Failed to update about content');
                      }
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
              <DialogTitle>Edit Serbian Story Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {['sr-latin', 'sr-cyrillic', 'en', 'sv'].map(lang => (
                <div key={lang}>
                  <label className="block text-sm font-medium mb-2">
                    Story Content ({lang})
                  </label>
                  <textarea
                    value={storyContent[lang]}
                    onChange={(e) => setStoryContent({...storyContent, [lang]: e.target.value})}
                    rows={8}
                    className="w-full p-2 border rounded"
                    placeholder={`Enter story content in ${lang}...`}
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-2">Source Link (optional)</label>
                <input
                  type="text"
                  value={storySourceLink}
                  onChange={(e) => setStorySourceLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/content/serbian-story`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ content: storyContent, sourceLink: storySourceLink })
                      });

                      if (response.ok) {
                        toast.success('Serbian story updated');
                        setStoryModalOpen(false);
                      } else {
                        toast.error('Failed to update story');
                      }
                    } catch (error) {
                      toast.error('Failed to update story');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                >
                  Save Changes
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
      </div>
    </div>
  );
};

export default AdminDashboard;