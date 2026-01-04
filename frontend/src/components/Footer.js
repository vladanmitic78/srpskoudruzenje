import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { settingsAPI } from '../services/api';

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsAPI.get();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    fetchSettings();
  }, []);

  const quickLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/gallery', label: t('nav.gallery') },
    { path: '/about', label: t('nav.about') },
    { path: '/serbian-story', label: t('nav.serbianStory') },
    { path: '/contact', label: t('nav.contact') }
  ];

  return (
    <footer className="bg-[#8B1F1F] dark:bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <img 
              src="/logo.jpg" 
              alt="SKUD Täby Logo" 
              className="h-20 w-20 object-contain rounded-full border-2 border-white"
            />
            <p className="text-sm text-gray-200">
              Srpsko Kulturno Udruženje Täby
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-200 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.contactInfo')}</h3>
            <ul className="space-y-3">
              {settings?.visibility?.address !== false && settings?.address && (
                <li className="flex items-start space-x-2 text-sm text-gray-200">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings?.visibility?.contactEmail !== false && settings?.contactEmail && (
                <li className="flex items-center space-x-2 text-sm text-gray-200">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-white transition-colors">
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings?.visibility?.contactPhone !== false && settings?.contactPhone && (
                <li className="flex items-center space-x-2 text-sm text-gray-200">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <a href={`tel:${settings.contactPhone}`} className="hover:text-white transition-colors">
                    {settings.contactPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Social Media and Organization Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.followUs')}</h3>
            {settings?.socialMedia && (
              <div className="flex space-x-4 mb-6">
                {settings?.visibility?.socialMediaFacebook !== false && settings.socialMedia.facebook && (
                  <a
                    href={settings.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:scale-110 transition-transform duration-200"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-6 w-6" />
                  </a>
                )}
                {settings?.visibility?.socialMediaInstagram !== false && settings.socialMedia.instagram && (
                  <a
                    href={settings.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:scale-110 transition-transform duration-200"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-6 w-6" />
                  </a>
                )}
                {settings?.visibility?.socialMediaYoutube !== false && settings.socialMedia.youtube && (
                  <a
                    href={settings.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:scale-110 transition-transform duration-200"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-6 w-6" />
                  </a>
                )}
                {settings?.visibility?.socialMediaSnapchat !== false && settings.socialMedia.snapchat && (
                  <a
                    href={settings.socialMedia.snapchat}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:scale-110 transition-transform duration-200"
                    aria-label="Snapchat"
                  >
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
            <div className="text-xs text-gray-300 space-y-1">
              {settings?.visibility?.orgNumber !== false && settings?.registrationNumber && (
                <p>Org. nr: {settings.registrationNumber}</p>
              )}
              {settings?.visibility?.vatNumber !== false && settings?.vatNumber && (
                <p>VAT: {settings.vatNumber}</p>
              )}
              {settings?.visibility?.bankAccount !== false && settings?.bankAccount && (
                <p>Bank: {settings.bankAccount}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-8 pt-8 text-center space-y-2">
          <p className="text-sm text-gray-200">
            © {currentYear} Srpsko Kulturno Udruženje Täby. {t('footer.rights')}.
          </p>
          <p className="text-xs text-gray-300">
            {t('footer.designedBy')}{' '}
            <a
              href="https://www.mitaict.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors font-medium"
            >
              MITA ICT AB
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;