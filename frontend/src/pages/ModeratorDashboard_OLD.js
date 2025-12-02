import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminAPI, eventsAPI, contentAPI, galleryAPI } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, FileText, Image } from 'lucide-react';

const ModeratorDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  // Fetch moderator permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const permsData = await adminAPI.getMyPermissions();
        setPermissions(permsData.permissions);
        
        // Set default active tab to first available permission
        if (permsData.permissions.manageEvents) {
          setActiveTab('events');
        } else if (permsData.permissions.manageContent) {
          setActiveTab('content');
        } else if (permsData.permissions.manageGallery) {
          setActiveTab('gallery');
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        toast.error(t('dashboard.permissionsError') || 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

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
              {permissions.manageEvents && (
                <option value="events">📅 {t('admin.tabs.events')}</option>
              )}
              {permissions.manageContent && (
                <option value="content">📝 {t('admin.tabs.content')}</option>
              )}
              {permissions.manageGallery && (
                <option value="gallery">🖼️ {t('moderator.tabs.gallery') || 'Gallery'}</option>
              )}
            </select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden lg:flex">
            {permissions.manageEvents && (
              <TabsTrigger value="events">
                <Calendar className="h-4 w-4 mr-2" />
                {t('admin.tabs.events')}
              </TabsTrigger>
            )}
            {permissions.manageContent && (
              <TabsTrigger value="content">
                <FileText className="h-4 w-4 mr-2" />
                {t('admin.tabs.content')}
              </TabsTrigger>
            )}
            {permissions.manageGallery && (
              <TabsTrigger value="gallery">
                <Image className="h-4 w-4 mr-2" />
                {t('moderator.tabs.gallery') || 'Gallery'}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Events Tab Content */}
          {permissions.manageEvents && (
            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.tabs.events')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('moderator.comingSoon') || 'Events management functionality will be loaded here.'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('moderator.redirectMessage') || 'This section will show the same events management interface as the admin dashboard.'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Content Tab Content */}
          {permissions.manageContent && (
            <TabsContent value="content">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.tabs.content')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('moderator.comingSoon') || 'Content management functionality will be loaded here.'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('moderator.redirectMessage') || 'This section will show the same content management interface as the admin dashboard.'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Gallery Tab Content */}
          {permissions.manageGallery && (
            <TabsContent value="gallery">
              <Card>
                <CardHeader>
                  <CardTitle>{t('moderator.tabs.gallery') || 'Gallery'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('moderator.comingSoon') || 'Gallery management functionality will be loaded here.'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('moderator.redirectMessage') || 'This section will show the same gallery management interface as the admin dashboard.'}
                  </p>
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
    </div>
  );
};

export default ModeratorDashboard;
