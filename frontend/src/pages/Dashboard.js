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
  const { user, loginWithGoogle } = useAuth();
  const [userData, setUserData] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [events, setEvents] = useState([]);
  const [confirmedEvents, setConfirmedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showParentFields, setShowParentFields] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [trainingStats, setTrainingStats] = useState({
    totalTrainings: 0,
    attended: 0,
    cancelled: 0,
    trainingGroups: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    const processGoogleAuth = async () => {
      // Check if there's a session_id in URL fragment (from Google OAuth)
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        setLoading(true);
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          const result = await loginWithGoogle(sessionId);
          
          if (result.success) {
            setUserData(result.user);
            toast.success('Successfully signed in with Google!');
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            toast.error('Failed to authenticate with Google');
          }
        } catch (error) {
          console.error('Google auth error:', error);
          toast.error('Failed to authenticate with Google');
        }
      }
    };

    const fetchData = async () => {
      try {
        const [invoicesData, eventsData, statsData] = await Promise.all([
          invoicesAPI.getMy(),
          eventsAPI.getAll(),
          eventsAPI.getMyStats().catch(err => {
            console.error('Stats error:', err);
            return { totalTrainings: 0, attended: 0, cancelled: 0, trainingGroups: 0, attendanceRate: 0 };
          })
        ]);
        setInvoices(invoicesData.invoices || []);
        
        const allEvents = eventsData.events || [];
        setEvents(allEvents);
        
        // Set training statistics
        setTrainingStats(statsData);
        
        // Check which events the current user has confirmed
        // Use user from closure or check again
        const currentUser = user;
        if (currentUser && currentUser.id) {
          const confirmedIds = allEvents
            .filter(event => event.participants && event.participants.includes(currentUser.id))
            .map(event => event.id);
          setConfirmedEvents(confirmedIds);
          console.log('User confirmed events:', confirmedIds);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    // Process Google auth first, then fetch data
    processGoogleAuth().then(() => fetchData());
  }, [loginWithGoogle, user]);

  const calculateAge = (yearOfBirth) => {
    if (!yearOfBirth) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(yearOfBirth);
  };

  const handleYearOfBirthChange = (year) => {
    setUserData({...userData, yearOfBirth: year});
    const age = calculateAge(year);
    if (age !== null && age < 18) {
      setShowParentFields(true);
    } else {
      setShowParentFields(false);
    }
  };

  // Initialize userData and check age on mount or when user changes
  useEffect(() => {
    if (user) {
      setUserData(user);
      
      // Check age and show parent fields if needed
      if (user.yearOfBirth) {
        const age = calculateAge(user.yearOfBirth);
        console.log('User age on load:', age, 'Year of birth:', user.yearOfBirth);
        if (age !== null && age < 18) {
          setShowParentFields(true);
          console.log('Showing parent fields for user under 18');
        } else {
          setShowParentFields(false);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    // Check age when yearOfBirth changes
    if (userData.yearOfBirth) {
      const age = calculateAge(userData.yearOfBirth);
      if (age !== null && age < 18) {
        setShowParentFields(true);
      } else {
        setShowParentFields(false);
      }
    }
  }, [userData.yearOfBirth]);

  const handleSaveProfile = async () => {
    try {
      // Validation
      if (!userData.yearOfBirth) {
        toast.error('Year of birth is required');
        return;
      }
      
      const age = calculateAge(userData.yearOfBirth);
      if (age < 18 && (!userData.parentName || !userData.parentEmail)) {
        toast.error('Parent information is required for users under 18');
        return;
      }

      await userAPI.updateProfile(userData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleConfirmEvent = async (eventId, eventTitle) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to confirm your participation in "${eventTitle}"?\n\nClick OK to confirm or Cancel to go back.`
    );
    
    if (!confirmed) {
      return; // User clicked Cancel
    }
    
    try {
      await eventsAPI.confirmParticipation(eventId);
      setConfirmedEvents([...confirmedEvents, eventId]);
      toast.success('Training participation confirmed! Admin has been notified.');
      
      // Refresh events to get updated participant list
      const eventsData = await eventsAPI.getAll();
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error('Failed to confirm participation');
      console.error(error);
    }
  };

  const handleCancelEvent = async (eventId, eventTitle) => {
    const reason = prompt(
      `Please provide a reason for cancelling your participation in "${eventTitle}":\n\n(This is mandatory and will be sent to the admin)`
    );
    
    if (!reason || reason.trim() === '') {
      toast.error('Cancellation reason is required');
      return;
    }
    
    try {
      await eventsAPI.cancelParticipation(eventId, reason);
      setConfirmedEvents(confirmedEvents.filter(id => id !== eventId));
      toast.info('Training participation cancelled. Admin has been notified.');
      
      // Refresh events to get updated participant list
      const eventsData = await eventsAPI.getAll();
      setEvents(eventsData.events || []);
    } catch (error) {
      toast.error('Failed to cancel participation');
      console.error(error);
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

        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
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
            <TabsTrigger value="personal">
              <User className="h-4 w-4 mr-2" />
              {t('dashboard.personalData')}
            </TabsTrigger>
          </TabsList>

          {/* Personal Data Tab */}
          <TabsContent value="personal">
            <Card className="border-2 border-[#C1272D]/20">
              <CardHeader>
                <CardTitle>{t('dashboard.personalData')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input 
                        required
                        value={userData.fullName || ''}
                        onChange={(e) => setUserData({...userData, fullName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year of Birth *</Label>
                      <Input 
                        required
                        type="number"
                        placeholder="1990"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={userData.yearOfBirth || ''}
                        onChange={(e) => handleYearOfBirthChange(e.target.value)}
                      />
                      {userData.yearOfBirth && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Age: {calculateAge(userData.yearOfBirth)} years
                        </p>
                      )}
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

                  {/* Parent/Guardian Information - Only shown for users under 18 */}
                  {showParentFields && (
                    <div className="border-t-2 border-[#C1272D]/20 pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 text-[#C1272D]" />
                        Parent/Guardian Information (Required for users under 18)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Parent/Guardian Name *</Label>
                          <Input 
                            required={showParentFields}
                            value={userData.parentName || ''}
                            onChange={(e) => setUserData({...userData, parentName: e.target.value})}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Parent/Guardian Email *</Label>
                          <Input 
                            required={showParentFields}
                            type="email"
                            value={userData.parentEmail || ''}
                            onChange={(e) => setUserData({...userData, parentEmail: e.target.value})}
                            placeholder="parent@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Parent/Guardian Phone</Label>
                          <Input 
                            type="tel"
                            value={userData.parentPhone || ''}
                            onChange={(e) => setUserData({...userData, parentPhone: e.target.value})}
                            placeholder="+46 XX XXX XX XX"
                          />
                        </div>
                      </div>
                    </div>
                  )}

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
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
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
                          {invoice.fileUrl && (
                            <a
                              href={`${process.env.REACT_APP_BACKEND_URL}${invoice.fileUrl}`}
                              download
                              className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              📄 Download Invoice
                            </a>
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
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Trainings</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                      {trainingStats.totalTrainings}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Available to join</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attended</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                      {trainingStats.attended}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Confirmed participation</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 bg-red-50 dark:bg-red-900/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cancelled</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                      {trainingStats.cancelled}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Previously cancelled</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Training Groups</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                      {trainingStats.trainingGroups}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Different locations</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Rate Progress Bar */}
            <Card className="border-2 border-[#C1272D]/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Attendance Rate</p>
                  <p className="text-lg font-bold text-[#C1272D]">{trainingStats.attendanceRate}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                  <div 
                    className="bg-gradient-to-r from-[#C1272D] to-[#8B1F1F] h-4 rounded-full transition-all duration-500"
                    style={{ width: `${trainingStats.attendanceRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  You&apos;ve attended {trainingStats.attended} out of {trainingStats.totalTrainings} trainings
                </p>
              </CardContent>
            </Card>

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
                    <div key={event.id} className={`p-4 border-2 rounded-lg ${
                      confirmedEvents.includes(event.id) 
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {event.title[language]}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            📅 {event.date} at {event.time}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            📍 {event.location}
                          </p>
                          {confirmedEvents.includes(event.id) && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-semibold">
                              ✓ You confirmed participation
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!confirmedEvents.includes(event.id) ? (
                            <Button
                              onClick={() => handleConfirmEvent(event.id, event.title[language] || event.title['en'])}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              ✓ Confirm
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleCancelEvent(event.id, event.title[language] || event.title['en'])}
                              variant="destructive"
                              className="bg-red-600 hover:bg-red-700"
                            >
                              ✗ Cancel
                            </Button>
                          )}
                        </div>
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