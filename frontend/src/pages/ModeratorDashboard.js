import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminAPI, eventsAPI, contentAPI, galleryAPI, newsAPI, storiesAPI, userAPI, invoicesAPI } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Calendar, FileText, Image, X, User, CreditCard, Shield } from 'lucide-react';

const ModeratorDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  // User data state
  const [userData, setUserData] = useState(null);
  const [userInvoices, setUserInvoices] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Events state
  const [events, setEvents] = useState([]);
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

  // Content state (News & Stories)
  const [news, setNews] = useState([]);
  const [stories, setStories] = useState([]);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [editingStory, setEditingStory] = useState(null);
  const [newsForm, setNewsForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    text: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    image: '',
    video: ''
  });
  const [storyForm, setStoryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    text: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    image: '',
    video: '',
    url: ''
  });

  // Gallery state
  const [albums, setAlbums] = useState([]);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [albumForm, setAlbumForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    description: { 'sr-latin': '', 'sr-cyrillic': '', 'en': '', 'sv': '' },
    place: '',
    images: [],
    videos: []
  });

  // Fetch moderator permissions and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch permissions
        const permsData = await adminAPI.getMyPermissions();
        setPermissions(permsData.permissions);
        
        // Fetch user's personal data
        const userDataResponse = await userAPI.getProfile();
        setUserData(userDataResponse);

        // Fetch user's invoices
        const invoicesResponse = await invoicesAPI.getUserInvoices();
        setUserInvoices(invoicesResponse.items || []);

        // Fetch user's registered events
        const eventsResponse = await eventsAPI.getAll();
        setUserEvents(eventsResponse.items || []);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(t('dashboard.permissionsError') || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch data based on permissions
  useEffect(() => {
    if (!permissions) return;

    const fetchData = async () => {
      try {
        if (permissions.manageEvents) {
          const eventsData = await eventsAPI.getAll();
          setEvents(eventsData.items || []);
        }
        if (permissions.manageContent) {
          const newsData = await newsAPI.getAll();
          const storiesData = await storiesAPI.getAll();
          setNews(newsData.items || []);
          setStories(storiesData.items || []);
        }
        if (permissions.manageGallery) {
          const galleryData = await galleryAPI.getAll();
          setAlbums(galleryData.items || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };

    fetchData();
  }, [permissions]);

  // Event handlers
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const newEvent = await eventsAPI.create(eventForm);
      setEvents([...events, newEvent]);
      setCreateEventOpen(false);
      toast.success(t('admin.events.eventCreated'));
    } catch (error) {
      toast.error(t('admin.events.eventCreateFailed'));
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      await eventsAPI.update(selectedEvent.id, eventForm);
      const updatedEvents = events.map(evt => 
        evt.id === selectedEvent.id ? { ...evt, ...eventForm } : evt
      );
      setEvents(updatedEvents);
      setEditEventOpen(false);
      toast.success(t('admin.events.eventUpdated'));
    } catch (error) {
      toast.error(t('admin.events.eventUpdateFailed'));
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm(t('admin.events.deleteEventConfirm'))) {
      try {
        await eventsAPI.delete(eventId);
        setEvents(events.filter(evt => evt.id !== eventId));
        toast.success(t('admin.events.eventDeleted'));
      } catch (error) {
        toast.error(t('admin.events.eventDeleteFailed'));
      }
    }
  };

  const handleCancelEvent = async (event) => {
    const reason = window.prompt(t('admin.events.cancelReasonPrompt'));
    if (reason) {
      try {
        await eventsAPI.update(event.id, {
          ...event,
          status: 'cancelled',
          cancellationReason: reason
        });
        const updatedEvents = events.map(evt => 
          evt.id === event.id ? { ...evt, status: 'cancelled', cancellationReason: reason } : evt
        );
        setEvents(updatedEvents);
        toast.success(t('admin.events.eventCancelled'));
      } catch (error) {
        toast.error(t('admin.events.eventCancelFailed'));
      }
    }
  };

  // News handlers
  const handleSaveNews = async (e) => {
    e.preventDefault();
    try {
      if (editingNews) {
        await newsAPI.update(editingNews.id, newsForm);
        setNews(news.map(item => item.id === editingNews.id ? { ...item, ...newsForm } : item));
        toast.success(t('admin.content.newsUpdateSuccess'));
      } else {
        const newItem = await newsAPI.create(newsForm);
        setNews([...news, newItem]);
        toast.success(t('admin.content.newsCreateSuccess'));
      }
      setNewsModalOpen(false);
    } catch (error) {
      toast.error(t('admin.content.newsSaveFailed'));
    }
  };

  // Story handlers
  const handleSaveStory = async (e) => {
    e.preventDefault();
    try {
      if (editingStory) {
        await storiesAPI.update(editingStory.id, storyForm);
        setStories(stories.map(item => item.id === editingStory.id ? { ...item, ...storyForm } : item));
        toast.success(t('admin.content.storyUpdateSuccess'));
      } else {
        const newItem = await storiesAPI.create(storyForm);
        setStories([...stories, newItem]);
        toast.success(t('admin.content.storyCreateSuccess'));
      }
      setStoryModalOpen(false);
    } catch (error) {
      toast.error(t('admin.content.storySaveFailed'));
    }
  };

  // Album handlers
  const handleSaveAlbum = async (e) => {
    e.preventDefault();
    try {
      if (editingAlbum) {
        await galleryAPI.update(editingAlbum.id, albumForm);
        setAlbums(albums.map(album => album.id === editingAlbum.id ? { ...album, ...albumForm } : album));
        toast.success(t('admin.content.albumUpdateSuccess'));
      } else {
        const newAlbum = await galleryAPI.create(albumForm);
        setAlbums([...albums, newAlbum]);
        toast.success(t('admin.content.albumCreateSuccess'));
      }
      setAlbumModalOpen(false);
    } catch (error) {
      toast.error(t('admin.content.albumSaveFailed'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">{t('dashboard.loading') || 'Loading...'}</p>
      </div>
    );
  }

  if (!permissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-red-600">{t('dashboard.noPermissions') || 'No permissions assigned. Contact administrator.'}</p>
        </Card>
      </div>
    );
  }

  // Check if moderator has any permissions
  const hasAnyPermission = permissions.manageEvents || permissions.manageContent || permissions.manageGallery;

  if (!hasAnyPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>{t('dashboard.noAccess') || 'No Access'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('dashboard.noPermissionsMessage') || 'You do not have any permissions assigned. Please contact a Super Administrator.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('moderator.dashboard.title') || 'Moderator Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('moderator.dashboard.welcome') || 'Welcome'}, {user?.fullName || user?.email}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile Dropdown */}
          <div className="lg:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
            >
              <option value="personal">👤 {t('dashboard.personalDataTab')}</option>
              <option value="invoices">💳 {t('dashboard.invoicesTab')}</option>
              <option value="trainings">📅 {t('dashboard.trainingsTab')}</option>
              <option value="membership">🎫 {t('dashboard.membershipTab')}</option>
              {permissions.manageEvents && (
                <option value="manage-events">📅 {t('admin.tabs.events')} (Manage)</option>
              )}
              {permissions.manageContent && (
                <option value="manage-content">📝 {t('admin.tabs.content')} (Manage)</option>
              )}
              {permissions.manageGallery && (
                <option value="manage-gallery">🖼️ {t('moderator.tabs.gallery')} (Manage)</option>
              )}
            </select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden lg:flex">
            {/* User Tabs */}
            <TabsTrigger value="personal">
              <User className="h-4 w-4 mr-2" />
              {t('dashboard.personalDataTab')}
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <CreditCard className="h-4 w-4 mr-2" />
              {t('dashboard.invoicesTab')}
            </TabsTrigger>
            <TabsTrigger value="trainings">
              <Calendar className="h-4 w-4 mr-2" />
              {t('dashboard.trainingsTab')}
            </TabsTrigger>
            <TabsTrigger value="membership">
              <Shield className="h-4 w-4 mr-2" />
              {t('dashboard.membershipTab')}
            </TabsTrigger>
            
            {/* Management Tabs (based on permissions) */}
            {permissions.manageEvents && (
              <TabsTrigger value="manage-events">
                <Calendar className="h-4 w-4 mr-2" />
                {t('admin.tabs.events')}
              </TabsTrigger>
            )}
            {permissions.manageContent && (
              <TabsTrigger value="manage-content">
                <FileText className="h-4 w-4 mr-2" />
                {t('admin.tabs.content')}
              </TabsTrigger>
            )}
            {permissions.manageGallery && (
              <TabsTrigger value="manage-gallery">
                <Image className="h-4 w-4 mr-2" />
                {t('moderator.tabs.gallery')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Events Tab Content */}
          {permissions.manageEvents && (
            <TabsContent value="manage-events">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.events.title')}</CardTitle>
                  <Button
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
                    className="bg-[#C1272D] hover:bg-[#8B1F1F]"
                  >
                    {t('admin.events.addEvent')}
                  </Button>
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
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
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
                                className="bg-blue-600 hover:bg-blue-700"
                                size="sm"
                              >
                                {t('admin.actions.edit')}
                              </Button>
                              {event.status === 'active' && (
                                <Button
                                  onClick={() => handleCancelEvent(event)}
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                  size="sm"
                                >
                                  {t('admin.events.cancelEvent')}
                                </Button>
                              )}
                              <Button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="bg-red-600 hover:bg-red-700"
                                size="sm"
                              >
                                {t('admin.actions.delete')}
                              </Button>
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

          {/* Content Tab Content */}
          {permissions.manageContent && (
            <TabsContent value="manage-content">
              <div className="space-y-6">
                {/* News Management */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t('admin.content.newsTitle')}</CardTitle>
                    <Button
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
                      className="bg-[#C1272D] hover:bg-[#8B1F1F]"
                    >
                      {t('admin.content.addNews')}
                    </Button>
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
                            <Button
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
                              className="bg-blue-500 hover:bg-blue-600"
                              size="sm"
                            >
                              {t('admin.actions.edit')}
                            </Button>
                            <Button
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
                              className="bg-red-500 hover:bg-red-600"
                              size="sm"
                            >
                              {t('admin.actions.delete')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Stories Management */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t('admin.content.storyTitle')}</CardTitle>
                    <Button
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
                      className="bg-[#C1272D] hover:bg-[#8B1F1F]"
                    >
                      {t('admin.content.addStory')}
                    </Button>
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
                            <Button
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
                              className="bg-blue-500 hover:bg-blue-600"
                              size="sm"
                            >
                              {t('admin.actions.edit')}
                            </Button>
                            <Button
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
                              className="bg-red-500 hover:bg-red-600"
                              size="sm"
                            >
                              {t('admin.actions.delete')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Gallery Tab Content */}
          {permissions.manageGallery && (
            <TabsContent value="manage-gallery">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.content.galleryTitle')}</CardTitle>
                  <Button
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
                    className="bg-[#C1272D] hover:bg-[#8B1F1F]"
                  >
                    {t('admin.content.createAlbum')}
                  </Button>
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
                            <Button
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
                              className="bg-blue-500 hover:bg-blue-600"
                              size="sm"
                            >
                              {t('admin.actions.edit')}
                            </Button>
                            <Button
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
                              className="bg-red-500 hover:bg-red-600"
                              size="sm"
                            >
                              {t('admin.actions.delete')}
                            </Button>
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
            </TabsContent>
          )}
        </Tabs>

        {/* Info Card */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{t('moderator.info.title') || 'ℹ️ Moderator Access'}:</strong> {t('moderator.info.message') || 'Your access is limited based on permissions set by the Super Administrator. If you need additional access, please contact them.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Event Dialog */}
      <Dialog open={createEventOpen || editEventOpen} onOpenChange={(open) => {
        setCreateEventOpen(false);
        setEditEventOpen(false);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {createEventOpen ? t('admin.events.addEvent') : t('admin.events.editEvent')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={createEventOpen ? handleCreateEvent : handleUpdateEvent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.events.date')}</Label>
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>{t('admin.events.time')}</Label>
                <Input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label>{t('admin.events.location')}</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('admin.events.titleEn')}</Label>
              <Input
                value={eventForm.title.en}
                onChange={(e) => setEventForm({
                  ...eventForm, 
                  title: {...eventForm.title, en: e.target.value}
                })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('admin.events.descriptionEn')}</Label>
              <textarea
                value={eventForm.description.en}
                onChange={(e) => setEventForm({
                  ...eventForm, 
                  description: {...eventForm.description, en: e.target.value}
                })}
                className="w-full p-2 border rounded-md"
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setCreateEventOpen(false);
                  setEditEventOpen(false);
                }}
              >
                {t('admin.actions.cancel')}
              </Button>
              <Button type="submit" className="bg-[#C1272D] hover:bg-[#8B1F1F]">
                {createEventOpen ? t('admin.actions.create') : t('admin.actions.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* News Dialog */}
      <Dialog open={newsModalOpen} onOpenChange={setNewsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNews ? t('admin.content.editNews') : t('admin.content.addNews')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNews} className="space-y-4">
            <div>
              <Label>{t('admin.content.date')}</Label>
              <Input
                type="date"
                value={newsForm.date}
                onChange={(e) => setNewsForm({...newsForm, date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label>{t('admin.content.titleEn')}</Label>
              <Input
                value={newsForm.title.en}
                onChange={(e) => setNewsForm({
                  ...newsForm,
                  title: {...newsForm.title, en: e.target.value}
                })}
                required
              />
            </div>

            <div>
              <Label>{t('admin.content.textEn')}</Label>
              <textarea
                value={newsForm.text.en}
                onChange={(e) => setNewsForm({
                  ...newsForm,
                  text: {...newsForm.text, en: e.target.value}
                })}
                className="w-full p-2 border rounded-md"
                rows={4}
                required
              />
            </div>

            <div>
              <Label>{t('admin.content.imageUrl')} {t('admin.content.optional')}</Label>
              <Input
                value={newsForm.image}
                onChange={(e) => setNewsForm({...newsForm, image: e.target.value})}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewsModalOpen(false)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button type="submit" className="bg-[#C1272D] hover:bg-[#8B1F1F]">
                {t('admin.actions.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Story Dialog */}
      <Dialog open={storyModalOpen} onOpenChange={setStoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStory ? t('admin.content.editStory') : t('admin.content.addStory')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStory} className="space-y-4">
            <div>
              <Label>{t('admin.content.date')}</Label>
              <Input
                type="date"
                value={storyForm.date}
                onChange={(e) => setStoryForm({...storyForm, date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label>{t('admin.content.titleEn')}</Label>
              <Input
                value={storyForm.title.en}
                onChange={(e) => setStoryForm({
                  ...storyForm,
                  title: {...storyForm.title, en: e.target.value}
                })}
                required
              />
            </div>

            <div>
              <Label>{t('admin.content.textEn')}</Label>
              <textarea
                value={storyForm.text.en}
                onChange={(e) => setStoryForm({
                  ...storyForm,
                  text: {...storyForm.text, en: e.target.value}
                })}
                className="w-full p-2 border rounded-md"
                rows={4}
                required
              />
            </div>

            <div>
              <Label>{t('admin.content.imageUrl')} {t('admin.content.optional')}</Label>
              <Input
                value={storyForm.image}
                onChange={(e) => setStoryForm({...storyForm, image: e.target.value})}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStoryModalOpen(false)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button type="submit" className="bg-[#C1272D] hover:bg-[#8B1F1F]">
                {t('admin.actions.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Album Dialog */}
      <Dialog open={albumModalOpen} onOpenChange={setAlbumModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAlbum ? t('admin.content.editAlbum') : t('admin.content.createAlbum')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAlbum} className="space-y-4">
            <div>
              <Label>{t('admin.content.date')}</Label>
              <Input
                type="date"
                value={albumForm.date}
                onChange={(e) => setAlbumForm({...albumForm, date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label>{t('admin.content.place')}</Label>
              <Input
                value={albumForm.place}
                onChange={(e) => setAlbumForm({...albumForm, place: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>{t('admin.content.titleEn')}</Label>
              <Input
                value={albumForm.title.en}
                onChange={(e) => setAlbumForm({
                  ...albumForm,
                  title: {...albumForm.title, en: e.target.value}
                })}
              />
            </div>

            <div>
              <Label>{t('admin.content.descriptionEn')}</Label>
              <textarea
                value={albumForm.description.en}
                onChange={(e) => setAlbumForm({
                  ...albumForm,
                  description: {...albumForm.description, en: e.target.value}
                })}
                className="w-full p-2 border rounded-md"
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAlbumModalOpen(false)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button type="submit" className="bg-[#C1272D] hover:bg-[#8B1F1F]">
                {t('admin.actions.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorDashboard;
