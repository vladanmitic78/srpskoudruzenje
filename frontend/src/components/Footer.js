import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { settingsAPI } from '../services/api';

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

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
              <li className="flex items-start space-x-2 text-sm text-gray-200">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{mockSettings.address}</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-gray-200">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href={`mailto:${mockSettings.contactEmail}`} className="hover:text-white transition-colors">
                  {mockSettings.contactEmail}
                </a>
              </li>
              <li className="flex items-center space-x-2 text-sm text-gray-200">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href={`tel:${mockSettings.contactPhone}`} className="hover:text-white transition-colors">
                  {mockSettings.contactPhone}
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media and Organization Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.followUs')}</h3>
            <div className="flex space-x-4 mb-6">
              <a
                href={mockSettings.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href={mockSettings.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href={mockSettings.socialMedia.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
              >
                <Youtube className="h-6 w-6" />
              </a>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <p>Org. nr: {mockSettings.registrationNumber}</p>
              <p>VAT: {mockSettings.vatNumber}</p>
              <p>Bank: {mockSettings.bankAccount}</p>
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