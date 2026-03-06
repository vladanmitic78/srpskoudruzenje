import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Upload, Palette, Image, Video, Monitor, Globe } from 'lucide-react';
import { toast } from 'sonner';

/**
 * BrandingTab - Manages logo, colors, hero background, and site-wide branding
 * Super Admin only
 */
const BrandingTab = ({ 
  brandingSettings, 
  setBrandingSettings, 
  updateBranding,
  logoPreview,
  setLogoPreview
}) => {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [heroBackgroundPreview, setHeroBackgroundPreview] = useState('');
  const [heroBackgroundType, setHeroBackgroundType] = useState('image');

  useEffect(() => {
    // Load hero background preview
    if (brandingSettings.heroBackground) {
      setHeroBackgroundPreview(`${process.env.REACT_APP_BACKEND_URL}${brandingSettings.heroBackground}`);
      setHeroBackgroundType(brandingSettings.heroBackgroundType || 'image');
    }
  }, [brandingSettings.heroBackground, brandingSettings.heroBackgroundType]);

  const handleLogoUpload = async (e) => {
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
  };

  const handleHeroBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingBackground(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', heroBackgroundType);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/branding/hero-background`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setHeroBackgroundPreview(`${process.env.REACT_APP_BACKEND_URL}${data.heroBackground}`);
        setBrandingSettings({
          ...brandingSettings, 
          heroBackground: data.heroBackground,
          heroBackgroundType: heroBackgroundType
        });
        toast.success('Hero background uploaded successfully!');
      } else {
        toast.error('Failed to upload hero background');
      }
    } catch (error) {
      toast.error('Error uploading hero background');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/branding`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(brandingSettings)
      });
      
      if (response.ok) {
        updateBranding(brandingSettings);
        toast.success('Branding settings saved successfully! Colors will update across the site.');
      } else {
        toast.error('Failed to save branding settings');
      }
    } catch (error) {
      toast.error('Failed to save branding settings');
    }
  };

  return (
    <div className="space-y-6">
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
                  onChange={handleLogoUpload}
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
                  value={brandingSettings.colors?.primary || '#C1272D'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, primary: e.target.value}
                  })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={brandingSettings.colors?.primary || '#C1272D'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, primary: e.target.value}
                  })}
                  className="flex-1 p-2 border rounded font-mono"
                  placeholder="#C1272D"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for headers, buttons, and accent elements</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Secondary Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={brandingSettings.colors?.secondary || '#1E3A8A'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, secondary: e.target.value}
                  })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={brandingSettings.colors?.secondary || '#1E3A8A'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, secondary: e.target.value}
                  })}
                  className="flex-1 p-2 border rounded font-mono"
                  placeholder="#1E3A8A"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for secondary elements and highlights</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Button Primary Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={brandingSettings.colors?.buttonPrimary || '#C1272D'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, buttonPrimary: e.target.value}
                  })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={brandingSettings.colors?.buttonPrimary || '#C1272D'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, buttonPrimary: e.target.value}
                  })}
                  className="flex-1 p-2 border rounded font-mono"
                  placeholder="#C1272D"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Default button background color</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Button Hover Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={brandingSettings.colors?.buttonHover || '#9B1B1B'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, buttonHover: e.target.value}
                  })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={brandingSettings.colors?.buttonHover || '#9B1B1B'}
                  onChange={(e) => setBrandingSettings({
                    ...brandingSettings,
                    colors: {...brandingSettings.colors, buttonHover: e.target.value}
                  })}
                  className="flex-1 p-2 border rounded font-mono"
                  placeholder="#9B1B1B"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Button color on hover</p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-3">Live Preview</h4>
            <div className="flex gap-4 items-center">
              <button 
                className="px-4 py-2 rounded text-white transition-colors"
                style={{ 
                  backgroundColor: brandingSettings.colors?.buttonPrimary || '#C1272D'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = brandingSettings.colors?.buttonHover || '#9B1B1B'}
                onMouseLeave={(e) => e.target.style.backgroundColor = brandingSettings.colors?.buttonPrimary || '#C1272D'}
              >
                Primary Button
              </button>
              <div 
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: brandingSettings.colors?.primary || '#C1272D' }}
              >
                Primary Color
              </div>
              <div 
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: brandingSettings.colors?.secondary || '#1E3A8A' }}
              >
                Secondary Color
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hero Background Section */}
      <Card className="border-2 border-[var(--color-primary)]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Hero Background
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setHeroBackgroundType('image')}
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                heroBackgroundType === 'image' 
                  ? 'bg-[var(--color-primary)] text-white' 
                  : 'bg-gray-200'
              }`}
            >
              <Image className="h-4 w-4" />
              Image
            </button>
            <button
              onClick={() => setHeroBackgroundType('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                heroBackgroundType === 'video' 
                  ? 'bg-[var(--color-primary)] text-white' 
                  : 'bg-gray-200'
              }`}
            >
              <Video className="h-4 w-4" />
              Video
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Preview */}
            <div className="flex-shrink-0">
              <div className="w-64 h-36 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-900 overflow-hidden">
                {heroBackgroundPreview ? (
                  heroBackgroundType === 'video' ? (
                    <video 
                      src={heroBackgroundPreview} 
                      className="w-full h-full object-cover"
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                    />
                  ) : (
                    <img 
                      src={heroBackgroundPreview} 
                      alt="Hero Background" 
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="text-center text-gray-400">
                    <Monitor className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No background</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload {heroBackgroundType === 'video' ? 'Video' : 'Image'}
                </label>
                <input
                  type="file"
                  accept={heroBackgroundType === 'video' ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/jpg,image/webp'}
                  onChange={handleHeroBackgroundUpload}
                  className="w-full p-2 border rounded"
                  disabled={uploadingBackground}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {heroBackgroundType === 'video' 
                    ? 'Supported: MP4, WebM. Recommended: 1920x1080, max 50MB. Will loop automatically.'
                    : 'Supported: PNG, JPG, WebP. Recommended: 1920x1080 or larger.'}
                </p>
              </div>
              {uploadingBackground && (
                <p className="text-sm text-blue-600">Uploading {heroBackgroundType}...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Website Texts Section */}
      <Card className="border-2 border-[var(--color-primary)]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Texts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Site Title</label>
            <input
              type="text"
              value={brandingSettings.siteTitle || ''}
              onChange={(e) => setBrandingSettings({...brandingSettings, siteTitle: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="Serbian Cultural Association Täby"
            />
            <p className="text-xs text-gray-500 mt-1">Displayed in browser tab and header</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Footer Copyright Text</label>
            <input
              type="text"
              value={brandingSettings.footerText || ''}
              onChange={(e) => setBrandingSettings({...brandingSettings, footerText: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="© 2025 Serbian Cultural Association Täby. All rights reserved."
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveBranding}
          className="px-8 py-3 bg-[var(--color-button-primary)] text-white rounded-lg hover:bg-[var(--color-button-hover)] font-semibold"
        >
          Save All Branding Settings
        </button>
      </div>
    </div>
  );
};

export default BrandingTab;
