import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Calendar, MapPin, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { newsAPI, eventsAPI } from '../services/api';

const Home = () => {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
  const [newsPage, setNewsPage] = useState(1);
  const newsPerPage = 6;
  const [heroBackground, setHeroBackground] = useState({
    backgroundUrl: '',
    opacity: 0.15
  });

  const openNewsDialog = (newsItem) => {
    setSelectedNews(newsItem);
    setIsNewsDialogOpen(true);
  };

  const closeNewsDialog = () => {
    setIsNewsDialogOpen(false);
    setTimeout(() => setSelectedNews(null), 200);
  };

  const switchToSerbian = () => {
    setLanguage('sr-cyrillic');
  };

  const switchToSwedish = () => {
    setLanguage('sv');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsData, eventsData] = await Promise.all([
          newsAPI.getAll(10, 0),
          eventsAPI.getAll()
        ]);
        setNews(newsData.news || []);
        setEvents(eventsData.events || []);
        
        // Fetch hero background settings
        try {
          const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
          const heroResponse = await fetch(`${API_BASE}/api/settings/hero-background`);
          if (heroResponse.ok) {
            const heroData = await heroResponse.json();
            setHeroBackground(heroData);
          }
        } catch (heroError) {
          console.log('Using default hero background');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Pagination for news
  const totalNewsPages = Math.ceil(news.length / newsPerPage);
  const indexOfLastNews = newsPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const displayedNews = news.slice(indexOfFirstNews, indexOfLastNews);

  return (
    <div className="min-h-screen">
      {/* Hero Section with Dynamic Background */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 py-20 md:py-32 overflow-hidden">
        {/* Dynamic Background Pattern */}
        {heroBackground.backgroundUrl && (
          <div 
            className="absolute inset-0"
            style={{
              opacity: heroBackground.opacity || 0.15
            }}
          >
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `url(${heroBackground.backgroundUrl})`,
                backgroundSize: heroBackground.backgroundUrl.includes('logo') ? '200px' : 'cover',
                backgroundRepeat: heroBackground.backgroundUrl.includes('logo') ? 'repeat' : 'no-repeat',
                backgroundPosition: 'center'
              }} 
            />
          </div>
        )}
        
        {/* Fallback pattern if no background */}
        {!heroBackground.backgroundUrl && (
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url(/logo.jpg)`,
              backgroundSize: '200px',
              backgroundRepeat: 'repeat',
              backgroundPosition: 'center'
            }} />
          </div>
        )}
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Dark backdrop for flags and welcome text */}
            <div className="inline-block bg-black/60 backdrop-blur-sm rounded-2xl px-12 py-8 shadow-2xl">
              <div className="flex justify-center items-center space-x-6 mb-6">
                <button
                  onClick={switchToSerbian}
                  className="animate-wave cursor-pointer hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded-lg"
                  title={t('common.switchToSerbian') || 'Switch to Serbian'}
                  aria-label="Switch to Serbian"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/f/ff/Flag_of_Serbia.svg" 
                    alt="Serbian Flag" 
                    className={`h-20 w-32 object-cover rounded-lg shadow-lg border-4 transition-all ${
                      language === 'sr-cyrillic' ? 'border-[var(--color-primary)]' : 'border-white hover:border-[var(--color-primary)]/50'
                    }`}
                  />
                </button>
                <button
                  onClick={switchToSwedish}
                  className="animate-wave cursor-pointer hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded-lg"
                  style={{ animationDelay: '0.2s' }}
                  title={t('common.switchToSwedish') || 'Switch to Swedish'}
                  aria-label="Switch to Swedish"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/en/4/4c/Flag_of_Sweden.svg" 
                    alt="Swedish Flag" 
                    className={`h-20 w-32 object-cover rounded-lg shadow-lg border-4 transition-all ${
                      language === 'sv' ? 'border-[var(--color-primary)]' : 'border-white hover:border-[var(--color-primary)]/50'
                    }`}
                  />
                </button>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                {t('home.welcome')}
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 mt-4">
                {t('home.organizationName')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Button 
                asChild
                size="lg"
                className="bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)] text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="/contact">{t('home.contact')}</Link>
              </Button>
              <Button 
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-button-primary)] hover:text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="/register">{t('nav.register')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="news" className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-secondary)] dark:text-[var(--color-primary)]">
              {t('home.news')}
            </h2>
            {news.length > 6 && (
              <Button asChild variant="ghost" className="text-[var(--color-primary)] hover:bg-[var(--color-button-primary)]/10">
                <Link to="/news">
                  {t('home.viewAllNews') || 'View All News'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedNews.map((item) => (
              <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-[var(--color-primary)]/20 flex flex-col">
                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={item.image}
                    alt={item.title[language]}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-[var(--color-button-primary)] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                    {item.date}
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                    {item.title[language]}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-3 flex-grow">
                    {item.text[language]}
                  </p>
                  <button
                    onClick={() => openNewsDialog(item)}
                    className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] font-semibold text-sm mt-3 text-left hover:underline"
                  >
                    {t('common.readMore') || 'Read more...'}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* News Pagination */}
          {totalNewsPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('news.showing') || 'Showing'} {indexOfFirstNews + 1}-{Math.min(indexOfLastNews, news.length)} {t('news.of') || 'of'} {news.length} {t('news.articles') || 'articles'}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewsPage(prev => Math.max(prev - 1, 1))}
                  disabled={newsPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.previous') || 'Previous'}
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalNewsPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={newsPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewsPage(page)}
                      className={newsPage === page ? "bg-[var(--color-button-primary)]" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewsPage(prev => Math.min(prev + 1, totalNewsPages))}
                  disabled={newsPage === totalNewsPages}
                  className="flex items-center gap-1"
                >
                  {t('common.next') || 'Next'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-secondary)] dark:text-[var(--color-primary)]">
              {t('home.trainingsEvents')}
            </h2>
            <Button asChild variant="ghost" className="text-[var(--color-primary)] hover:bg-[var(--color-button-primary)]/10">
              <Link to="/contact">
                {t('home.contact')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <p className="text-gray-600 dark:text-gray-300">Loading events...</p>
            ) : events.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">No events scheduled yet.</p>
            ) : (
              events.map((event) => (
              <Card key={event.id} className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[var(--color-primary)]/20">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 text-[var(--color-primary)]">
                      <Calendar className="h-5 w-5" />
                      <span className="font-semibold">{event.date}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      {event.time}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {event.title[language]}
                  </h3>
                  
                  <div className="flex items-start space-x-2 text-gray-600 dark:text-gray-300">
                    <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {event.description[language]}
                  </p>
                  
                  <Button 
                    asChild
                    variant="link" 
                    className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] p-0 h-auto font-semibold"
                  >
                    <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                      {t('home.seeMore')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )))}
          </div>
        </div>
      </section>

      {/* News Detail Dialog */}
      <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedNews && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
                    {selectedNews.date}
                  </span>
                </div>
                <DialogTitle className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {selectedNews.title[language]}
                </DialogTitle>
              </DialogHeader>
              
              {selectedNews.image && (
                <div className="relative h-64 md:h-96 w-full overflow-hidden rounded-lg mb-6">
                  <img
                    src={selectedNews.image}
                    alt={selectedNews.title[language]}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <DialogDescription asChild>
                <div className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedNews.text[language]}
                </div>
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;