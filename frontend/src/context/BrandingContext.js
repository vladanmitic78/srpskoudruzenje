import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext();

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    colors: {
      primary: '#C1272D',
      secondary: '#8B1F1F',
      buttonPrimary: '#C1272D',
      buttonHover: '#8B1F1F'
    },
    logo: '',
    language: {
      default: 'sr',
      supported: ['sr', 'en', 'sv']
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/branding`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setBranding(data);
            // Apply colors to CSS variables
            applyColors(data.colors);
          }
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  const applyColors = (colors) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-button-primary', colors.buttonPrimary);
      root.style.setProperty('--color-button-hover', colors.buttonHover);
    }
  };

  const updateBranding = (newBranding) => {
    setBranding(newBranding);
    applyColors(newBranding.colors);
  };

  return (
    <BrandingContext.Provider value={{ branding, loading, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};
