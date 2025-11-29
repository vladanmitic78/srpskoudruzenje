import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { newsAPI, eventsAPI } from '../services/api';

const Home = () => {
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [showAllNews, setShowAllNews] = useState(false);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsData, eventsData] = await Promise.all([
          newsAPI.getAll(10, 0),
          eventsAPI.getAll()
        ]);
        setNews(newsData.news || []);
        setEvents(eventsData.events || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const displayedNews = showAllNews ? news : news.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section with Slider */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url(/logo.jpg)`,
            backgroundSize: '200px',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center'
          }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex justify-center items-center space-x-6 mb-8">
              <div className="animate-wave">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/f/ff/Flag_of_Serbia.svg" 
                  alt="Serbian Flag" 
                  className="h-20 w-32 object-cover rounded-lg shadow-lg border-2 border-white"
                />
              </div>
              <div className="animate-wave" style={{ animationDelay: '0.2s' }}>
                <img 
                  src="https://upload.wikimedia.org/wikipedia/en/4/4c/Flag_of_Sweden.svg" 
                  alt="Swedish Flag" 
                  className="h-20 w-32 object-cover rounded-lg shadow-lg border-2 border-white"
                />
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-[#8B1F1F] dark:text-[#C1272D] leading-tight">
              {t('home.welcome')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300">
              {t('home.organizationName')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Button 
                asChild
                size="lg"
                className="bg-[#C1272D] hover:bg-[#8B1F1F] text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="/contact">{t('home.contact')}</Link>
              </Button>
              <Button 
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-[#C1272D] text-[#C1272D] hover:bg-[#C1272D] hover:text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="#news">{t('home.mainEvents')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="news" className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#8B1F1F] dark:text-[#C1272D]">
              {t('home.news')}
            </h2>
            <Button
              variant="ghost"
              onClick={() => setShowAllNews(!showAllNews)}
              className="text-[#C1272D] hover:bg-[#C1272D]/10"
            >
              {showAllNews ? t('home.news') : t('home.expandAll')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedNews.map((item) => (
              <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-[#C1272D]/20">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title[language]}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-[#C1272D] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                    {item.date}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-[#C1272D] transition-colors">
                    {item.title[language]}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
                    {item.text[language]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#8B1F1F] dark:text-[#C1272D]">
              {t('home.trainingsEvents')}
            </h2>
            <Button asChild variant="ghost" className="text-[#C1272D] hover:bg-[#C1272D]/10">
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
              <Card key={event.id} className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#C1272D]/20">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 text-[#C1272D]">
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
                    className="text-[#C1272D] hover:text-[#8B1F1F] p-0 h-auto font-semibold"
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
    </div>
  );
};

export default Home;