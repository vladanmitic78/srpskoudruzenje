import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Menu, X, Globe, Sun, Moon, Facebook, Instagram, Youtube } from 'lucide-react';
import { settingsAPI } from '../services/api';

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const languages = [
    { code: 'sr-latin', label: 'Srpski' },
    { code: 'sr-cyrillic', label: 'Српски' },
    { code: 'en', label: 'English' },
    { code: 'sv', label: 'Svenska' }
  ];

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/gallery', label: t('nav.gallery') },
    { path: '/about', label: t('nav.about') },
    { path: '/serbian-story', label: t('nav.serbianStory') },
    { path: '/contact', label: t('nav.contact') }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#FFF5F5] dark:bg-gray-900 border-b border-[#C1272D]/20 shadow-sm transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/logo.jpg" 
              alt="SKUD Täby Logo" 
              className="h-16 w-16 object-contain rounded-full border-2 border-[#C1272D] group-hover:scale-105 transition-transform duration-300"
            />
            <span className="font-bold text-lg text-[#8B1F1F] dark:text-[#C1272D] hidden md:block">
              SKUD TÄBY
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-[#C1272D] text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-[#C1272D]/10 dark:hover:bg-[#C1272D]/20'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-[#C1272D]/10">
                  <Globe className="h-5 w-5 text-[#8B1F1F] dark:text-[#C1272D]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? 'bg-[#C1272D]/10' : ''}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Social Media */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-[#C1272D]/10 hidden md:flex">
                  <Facebook className="h-5 w-5 text-[#8B1F1F] dark:text-[#C1272D]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={mockSettings.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2">
                    <Facebook className="h-4 w-4" />
                    <span>Facebook</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={mockSettings.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2">
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={mockSettings.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2">
                    <Youtube className="h-4 w-4" />
                    <span>YouTube</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="hover:bg-[#C1272D]/10"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-[#8B1F1F] dark:text-[#C1272D]" />
              ) : (
                <Sun className="h-5 w-5 text-[#8B1F1F] dark:text-[#C1272D]" />
              )}
            </Button>

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="hidden md:flex bg-[#C1272D] hover:bg-[#8B1F1F] text-white">
                    {user?.fullName || user?.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">{t('nav.dashboard')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button asChild variant="ghost" className="hover:bg-[#C1272D]/10">
                  <Link to="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild className="bg-[#C1272D] hover:bg-[#8B1F1F] text-white">
                  <Link to="/register">{t('nav.register')}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-[#8B1F1F]" />
              ) : (
                <Menu className="h-6 w-6 text-[#8B1F1F]" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#C1272D]/20 animate-in slide-in-from-top">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-[#C1272D] text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-[#C1272D]/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#C1272D]/10"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium text-left text-gray-700 dark:text-gray-200 hover:bg-[#C1272D]/10"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#C1272D]/10"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-[#C1272D] text-white hover:bg-[#8B1F1F]"
                  >
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;