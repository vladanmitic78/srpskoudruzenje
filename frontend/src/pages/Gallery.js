import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { galleryAPI } from '../services/api';

const Gallery = () => {
  const { language } = useLanguage();
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const data = await galleryAPI.getAll();
        setGallery(data.items || []);
      } catch (error) {
        console.error('Error fetching gallery:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, []);

  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[#8B1F1F] dark:text-[#C1272D] mb-12 text-center">
          Galerija / Gallery
        </h1>

        <div className="space-y-12">
          {mockGallery.map((item) => (
            <Card key={item.id} className="overflow-hidden border-2 border-[#C1272D]/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {item.description[language]}
                  </h2>
                  <span className="text-sm font-semibold text-[#C1272D] bg-[#C1272D]/10 px-4 py-2 rounded-full">
                    {item.date}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {item.images.map((image, index) => (
                    <div key={index} className="relative group overflow-hidden rounded-lg aspect-video">
                      <img
                        src={image}
                        alt={`${item.description[language]} ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;