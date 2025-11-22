import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { User, FileText, Calendar, AlertCircle } from 'lucide-react';
import { userAPI, invoicesAPI, eventsAPI } from '../services/api';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [userData, setUserData] = useState(user || {});
  const [invoices, setInvoices] = useState([]);
  const [events, setEvents] = useState([]);
  const [confirmedEvents, setConfirmedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoicesData, eventsData] = await Promise.all([
          invoicesAPI.getMy(),
          eventsAPI.getAll()
        ]);
        setInvoices(invoicesData.invoices || []);
        setEvents(eventsData.events || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    try {
      await userAPI.updateProfile(userData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleConfirmEvent = async (eventId) => {
    try {
      if (confirmedEvents.includes(eventId)) {
        await eventsAPI.cancelParticipation(eventId);
        setConfirmedEvents(confirmedEvents.filter(id => id !== eventId));
        toast.info('Event participation cancelled');
      } else {
        await eventsAPI.confirmParticipation(eventId);
        setConfirmedEvents([...confirmedEvents, eventId]);
        toast.success('Event participation confirmed!');
      }
    } catch (error) {
      toast.error('Failed to update participation');
    }
  };

  const isOverdue = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  return (
    <div className="min-h-screen py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-[#8B1F1F] dark:text-[#C1272D] mb-8">
          {t('dashboard.title')}
        </h1>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="personal">
              <User className="h-4 w-4 mr-2" />
              {t('dashboard.personalData')}
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              {t('dashboard.invoices')}
            </TabsTrigger>
            <TabsTrigger value="trainings">
              <Calendar className="h-4 w-4 mr-2" />
              {t('dashboard.trainings')}
            </TabsTrigger>
            <TabsTrigger value="membership">
              <AlertCircle className="h-4 w-4 mr-2" />
              {t('dashboard.membership')}
            </TabsTrigger>
          </TabsList>

          {/* Personal Data Tab */}
          <TabsContent value="personal">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>{t('dashboard.personalData')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input 
                        value={userData.fullName || ''}
                        onChange={(e) => setUserData({...userData, fullName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year of Birth</Label>
                      <Input 
                        type="number"
                        placeholder="1990"
                        value={userData.yearOfBirth || ''}
                        onChange={(e) => setUserData({...userData, yearOfBirth: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={userData.email || ''}
                        onChange={(e) => setUserData({...userData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        type="tel"
                        value={userData.phone || ''}
                        onChange={(e) => setUserData({...userData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Street Address</Label>
                      <Input 
                        value={userData.address || ''}
                        onChange={(e) => setUserData({...userData, address: e.target.value})}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="bg-[#C1272D] hover:bg-[#8B1F1F]">
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>{t('dashboard.invoices')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-gray-600 dark:text-gray-300">Loading invoices...</p>
                  ) : invoices.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-300">No invoices yet.</p>
                  ) : (
                    invoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className={`p-4 border-2 rounded-lg ${
                        invoice.status === 'paid' 
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                          : isOverdue(invoice.dueDate)
                          ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                          : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {invoice.description}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Due: {invoice.dueDate}
                          </p>
                          {invoice.paymentDate && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Paid: {invoice.paymentDate}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {invoice.amount} {invoice.currency}
                          </p>
                          <Badge 
                            variant={invoice.status === 'paid' ? 'default' : 'destructive'}
                            className={invoice.status === 'paid' ? 'bg-green-600' : isOverdue(invoice.dueDate) ? 'bg-red-600' : 'bg-yellow-600'}
                          >
                            {invoice.status === 'paid' ? t('dashboard.paid') : isOverdue(invoice.dueDate) ? t('dashboard.overdue') : t('dashboard.unpaid')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trainings Tab */}
          <TabsContent value="trainings">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>{t('dashboard.trainings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-gray-600 dark:text-gray-300">Loading trainings...</p>
                  ) : events.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-300">No trainings scheduled.</p>
                  ) : (
                    events.map((event) => (
                    <div key={event.id} className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {event.title[language]}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {event.date} at {event.time}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {event.location}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleConfirmEvent(event.id)}
                          variant={confirmedEvents.includes(event.id) ? 'default' : 'outline'}
                          className={confirmedEvents.includes(event.id) ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {confirmedEvents.includes(event.id) ? '✓ Confirmed' : t('dashboard.confirmParticipation')}
                        </Button>
                      </div>
                    </div>
                  )))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Membership Tab */}
          <TabsContent value="membership">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>{t('dashboard.membership')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    You are an active member of Srpsko Kulturno Udruženje Täby.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('dashboard.cancelMembership')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    If you wish to cancel your membership, please provide a reason:
                  </p>
                  <textarea 
                    className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg min-h-[100px] bg-white dark:bg-gray-800"
                    placeholder="Please tell us why you want to cancel..."
                  />
                  <Button 
                    variant="destructive" 
                    className="mt-4"
                    onClick={() => toast.info('Membership cancellation will be implemented in Phase 2')}
                  >
                    Submit Cancellation Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;