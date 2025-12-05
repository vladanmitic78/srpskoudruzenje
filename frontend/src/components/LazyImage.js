import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage Component
 * Implements lazy loading for images to improve page performance
 * Images are only loaded when they enter the viewport
 */
const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholderClassName = '',
  onLoad,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let observer;
    
    // Only use IntersectionObserver if supported
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              if (observer && imgRef.current) {
                observer.unobserve(imgRef.current);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before image enters viewport
        }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      setImageSrc(src);
    }

    return () => {
      if (observer && imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <div ref={imgRef} className={`lazy-image-container ${className}`}>
      {!imageLoaded && (
        <div 
          className={`lazy-image-placeholder bg-gray-200 dark:bg-gray-700 animate-pulse ${placeholderClassName || className}`}
          style={{ minHeight: '100px' }}
        />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
