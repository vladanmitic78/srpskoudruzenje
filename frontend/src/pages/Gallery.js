import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { galleryAPI } from '../services/api';

const Gallery = () => {
  const { language } = useLanguage();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const data = await galleryAPI.getAll();
        setAlbums(data.items || []);
      } catch (error) {
        console.error('Error fetching gallery:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, []);

  const openLightbox = (album, index) => {
    setSelectedAlbum(album);
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setSelectedAlbum(null);
    setCurrentImageIndex(0);
  }, []);

  const nextImage = useCallback(() => {
    if (selectedAlbum && selectedAlbum.images) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedAlbum.images.length);
    }
  }, [selectedAlbum]);

  const prevImage = useCallback(() => {
    if (selectedAlbum && selectedAlbum.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedAlbum.images.length - 1 : prev - 1
      );
    }
  }, [selectedAlbum]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (lightboxOpen) {
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'Escape') closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lightboxOpen, selectedAlbum, nextImage, prevImage]);

  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[#8B1F1F] dark:text-[#C1272D] mb-12 text-center">
          Galerija / Gallery
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="col-span-full text-center text-gray-600 dark:text-gray-300">Loading gallery...</p>
          ) : albums.length === 0 ? (
            <p className="col-span-full text-center text-gray-600 dark:text-gray-300">No albums yet.</p>
          ) : (
            albums.map((album) => (
              <Card 
                key={album.id} 
                className="overflow-hidden border-2 border-[#C1272D]/20 hover:border-[#C1272D] transition-all cursor-pointer group"
                onClick={() => {
                  if (album.images && album.images.length > 0) {
                    openLightbox(album, 0);
                  }
                }}
              >
                <div className="relative aspect-video overflow-hidden">
                  {album.images && album.images.length > 0 ? (
                    <img
                      src={album.images[0]}
                      alt={album.title?.[language] || album.description?.[language]}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400">No photos</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {album.images?.length || 0} photos
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {album.title?.[language] || album.description?.[language]}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{album.date}</span>
                    {album.place && <span>📍 {album.place}</span>}
                  </div>
                  {album.description?.[language] && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {album.description[language]}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Lightbox Modal */}
        {lightboxOpen && selectedAlbum && selectedAlbum.images && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
            >
              ✕
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 text-white text-6xl hover:text-gray-300 z-10"
            >
              ‹
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 text-white text-6xl hover:text-gray-300 z-10"
            >
              ›
            </button>

            <div 
              className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center px-16"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedAlbum.images[currentImageIndex]}
                alt={`${selectedAlbum.title?.[language]} - Photo ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center">
              <p className="text-lg font-semibold mb-1">
                {selectedAlbum.title?.[language] || selectedAlbum.description?.[language]}
              </p>
              <p className="text-sm text-gray-300">
                {currentImageIndex + 1} / {selectedAlbum.images.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;