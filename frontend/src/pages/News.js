import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { newsAPI } from '../services/api';

const News = () => {
  const { t, language } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
  
  const newsPerPage = 6;

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await newsAPI.getAll();
        // Sort by date descending (newest first)
        const sortedNews = (response.news || []).sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        setNews(sortedNews);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, []);

  // Pagination logic
  const indexOfLastNews = currentPage * newsPerPage;
  const indexOfFirstNews = indexOfLastNews - newsPerPage;
  const currentNews = news.slice(indexOfFirstNews, indexOfLastNews);
  const totalPages = Math.ceil(news.length / newsPerPage);

  const openNewsDialog = (newsItem) => {
    setSelectedNews(newsItem);
    setIsNewsDialogOpen(true);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-secondary)] dark:text-[var(--color-primary)] mb-4">
            {t('news.title') || 'News'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('news.subtitle') || 'Stay updated with the latest news and announcements from our association'}
          </p>
        </div>

        {/* News Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {t('news.noNews') || 'No news available at the moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {currentNews.map((item) => (
                <Card 
                  key={item.id} 
                  className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-[var(--color-primary)]/20 flex flex-col cursor-pointer"
                  onClick={() => openNewsDialog(item)}
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={item.image}
                      alt={item.title[language] || item.title['sr-cyrillic'] || 'News image'}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-[var(--color-button-primary)] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {item.date}
                    </div>
                  </div>
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                      {item.title[language] || item.title['sr-cyrillic'] || 'Untitled'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 line-clamp-3 flex-grow">
                      {item.text[language] || item.text['sr-cyrillic'] || ''}
                    </p>
                    <span className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] font-semibold text-sm mt-3 text-left hover:underline">
                      {t('common.readMore') || 'Read more...'}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('news.showing') || 'Showing'} {indexOfFirstNews + 1}-{Math.min(indexOfLastNews, news.length)} {t('news.of') || 'of'} {news.length} {t('news.articles') || 'articles'}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('common.previous') || 'Previous'}
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === 1 || 
                               page === totalPages || 
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, index, array) => {
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className={currentPage === page ? "bg-[var(--color-button-primary)]" : ""}
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    {t('common.next') || 'Next'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
                  {selectedNews.title[language] || selectedNews.title['sr-cyrillic'] || 'Untitled'}
                </DialogTitle>
              </DialogHeader>
              
              {selectedNews.image && (
                <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-lg my-4">
                  <img
                    src={selectedNews.image}
                    alt={selectedNews.title[language] || 'News image'}
                    className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800"
                  />
                </div>
              )}
              
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedNews.text[language] || selectedNews.text['sr-cyrillic'] || ''}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default News;
