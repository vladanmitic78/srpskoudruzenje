import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Users, FileText, Calendar, Settings, BarChart } from 'lucide-react';
import { adminAPI, eventsAPI } from '../services/api';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, usersData, eventsData] = await Promise.all([
          adminAPI.getStatistics(),
          adminAPI.getUsers(),
          eventsAPI.getAll()
        ]);
        setStatistics(statsData);
        setUsers(usersData.users || []);
        setEvents(eventsData.events || []);
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
              <CardHeader>
                <CardTitle>Invoices Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Invoice management will be fully implemented in Phase 2 with backend integration.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>Events & Training Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Event management will be fully implemented in Phase 2 with CRUD operations.
                </p>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {event.title['en']}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {event.date} at {event.time} - {event.location}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>Content Management - Multi-Language Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Edit pages with support for Serbian Latin, Serbian Cyrillic, English, and Swedish.
                </p>
                <div className="space-y-4">
                  {['home', 'gallery', 'about', 'serbian-story'].map(pageId => (
                    <div key={pageId} className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                      <h3 className="font-semibold text-lg capitalize mb-2">{pageId.replace('-', ' ')}</h3>
                      <button
                        onClick={() => window.location.href = `/admin/content/${pageId}`}
                        className="px-4 py-2 bg-[#C1272D] text-white rounded hover:bg-[#8B1F1F]"
                      >
                        Edit Page Content
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
};

export default AdminDashboard;