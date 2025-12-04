import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { storiesAPI } from '../services/api';

const STORIES_PER_PAGE = 6;

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

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-300">{t('common.loading') || 'Loading stories...'}</p>
        ) : stories.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-300">{t('common.noData') || 'No stories available yet.'}</p>
        ) : (
          <>
            {/* 3x3 Grid of Stories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-8">
              {currentStories.map((story) => (
                <Card key={story.id} className="overflow-hidden border-2 border-[var(--color-primary)]/20 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                  {story.image && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={story.image}
                        alt={story.title[language]}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-[var(--color-button-primary)] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        {story.date}
                      </div>
                    </div>
                  )}
                  
                  <CardContent className="p-4 flex flex-col flex-grow">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                      {story.title[language]}
                    </h2>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 text-justify line-clamp-4 flex-grow">
                      {story.text[language]}
                    </p>
                    
                    <div className="space-y-2">
                      {story.video && (
                        <Button 
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-button-primary)] hover:text-white w-full"
                        >
                          <a href={story.video} target="_blank" rel="noopener noreferrer">
                            {t('common.watchVideo') || '🎬 Watch Video'}
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      
                      {story.url && (
                        <Button 
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-button-primary)] hover:text-white w-full"
                        >
                          <a href={story.url} target="_blank" rel="noopener noreferrer">
                            {t('common.learnMore') || 'Learn More'}
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {/* Previous Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={currentPage === 1}
                  className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-button-primary)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page Numbers */}
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className={
                        currentPage === page
                          ? "bg-[var(--color-button-primary)] text-white hover:bg-[var(--color-button-hover)]"
                          : "border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-button-primary)] hover:text-white"
                      }
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                {/* Next Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentPage === totalPages}
                  className="border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-button-primary)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Page Info */}
            {totalPages > 1 && (
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                {t('common.page') || 'Page'} {currentPage} {t('common.of') || 'of'} {totalPages}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SerbianStory;