import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { storiesAPI } from '../services/api';

const STORIES_PER_PAGE = 9;

const SerbianStory = () => {
  const { language, t } = useLanguage();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await storiesAPI.getAll();
        setStories(data.stories || []);
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStories();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(stories.length / STORIES_PER_PAGE);
  const startIndex = (currentPage - 1) * STORIES_PER_PAGE;
  const endIndex = startIndex + STORIES_PER_PAGE;
  const currentStories = stories.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-secondary)] dark:text-[var(--color-primary)] mb-12 text-center">
          {t('nav.serbianStory')}
        </h1>

        <div className="max-w-4xl mx-auto space-y-8">
          {loading ? (
            <p className="text-center text-gray-600 dark:text-gray-300">{t('common.loading') || 'Loading stories...'}</p>
          ) : stories.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-300">{t('common.noData') || 'No stories available yet.'}</p>
          ) : (
            stories.map((story) => (
            <Card key={story.id} className="overflow-hidden border-2 border-[var(--color-primary)]/20 hover:shadow-xl transition-all duration-300">
              {story.image && (
                <div className="relative h-64 md:h-96 overflow-hidden">
                  <img
                    src={story.image}
                    alt={story.title[language]}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-[var(--color-button-primary)] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    {story.date}
                  </div>
                </div>
              )}
              
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  {story.title[language]}
                </h2>
                
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-justify">
                  {story.text[language]}
                </p>
                
                {story.url && (
                  <Button 
                    asChild
                    variant="outline"
                    className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-button-primary)] hover:text-white"
                  >
                    <a href={story.url} target="_blank" rel="noopener noreferrer">
                      {t('common.learnMore') || 'Learn More'}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )))}
        </div>
      </div>
    </div>
  );
};

export default SerbianStory;