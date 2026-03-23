import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

// SEO metadata for each language
const seoData = {
  'sr': {
    title: 'Srpsko Kulturno Udruženje Täby | SKUD Täby',
    description: 'Srpsko Kulturno Udruženje Täby (SKUD Täby) - Kulturna zajednica Srba u Täby, Stokholm, Švedska. Narodni ples, tradicija, događaji.',
    keywords: 'Srpsko Kulturno Udruženje Täby, SKUD Täby, srpsko udruženje Švedska, Srbi u Švedskoj, srpski narodni ples, srpska tradicija, srpski događaji Stokholm'
  },
  'sr-cyrillic': {
    title: 'Српско Културно Удружење Теби | СКУД Теби',
    description: 'Српско Културно Удружење Теби (СКУД Теби) - Културна заједница Срба у Теби, Стокхолм, Шведска. Народни плес, традиција, догађаји.',
    keywords: 'Српско Културно Удружење Теби, СКУД Теби, српско удружење Шведска, Срби у Шведској, српски народни плес, српска традиција'
  },
  'sv': {
    title: 'Serbiska Kulturföreningen i Täby | SKUD Täby',
    description: 'Serbiska Kulturföreningen i Täby (SKUD Täby) - Serbisk kulturförening i Stockholm/Täby, Sverige. Folkdans, traditioner, evenemang för den serbiska gemenskapen.',
    keywords: 'Serbiska Kulturföreningen i Täby, Serbiska Kulturföreningen Täby, SKUD Täby, serbisk förening Stockholm, serbisk kulturförening, serbisk folkdans, serbiska evenemang Stockholm, Serber i Sverige'
  },
  'en': {
    title: 'Serbian Cultural Association Täby | SKUD Täby',
    description: 'Serbian Cultural Association Täby (SKUD Täby) - Serbian cultural community in Täby, Stockholm, Sweden. Folk dance, traditions, events.',
    keywords: 'Serbian Cultural Association Täby, SKUD Täby, Serbian association Sweden, Serbs in Sweden, Serbian folk dance, Serbian traditions, Serbian events Stockholm'
  }
};

// Page-specific SEO data
const pageSeoData = {
  home: {
    'sr': { title: 'Početna', path: '/' },
    'sr-cyrillic': { title: 'Почетна', path: '/' },
    'sv': { title: 'Hem', path: '/' },
    'en': { title: 'Home', path: '/' }
  },
  about: {
    'sr': { title: 'O nama', description: 'Saznajte više o Srpskom Kulturnom Udruženju Täby, našoj istoriji i misiji.' },
    'sr-cyrillic': { title: 'О нама', description: 'Сазнајте више о Српском Културном Удружењу Теби, нашој историји и мисији.' },
    'sv': { title: 'Om oss', description: 'Läs mer om Serbiska Kulturföreningen i Täby, vår historia och mission.' },
    'en': { title: 'About Us', description: 'Learn more about Serbian Cultural Association Täby, our history and mission.' }
  },
  gallery: {
    'sr': { title: 'Galerija', description: 'Pogledajte fotografije sa naših događaja i aktivnosti.' },
    'sr-cyrillic': { title: 'Галерија', description: 'Погледајте фотографије са наших догађаја и активности.' },
    'sv': { title: 'Galleri', description: 'Se bilder från våra evenemang och aktiviteter.' },
    'en': { title: 'Gallery', description: 'View photos from our events and activities.' }
  },
  contact: {
    'sr': { title: 'Kontakt', description: 'Kontaktirajte Srpsko Kulturno Udruženje Täby. Adresa, email, telefon.' },
    'sr-cyrillic': { title: 'Контакт', description: 'Контактирајте Српско Културно Удружење Теби. Адреса, имејл, телефон.' },
    'sv': { title: 'Kontakt', description: 'Kontakta Serbiska Kulturföreningen i Täby. Adress, e-post, telefon.' },
    'en': { title: 'Contact', description: 'Contact Serbian Cultural Association Täby. Address, email, phone.' }
  },
  'serbian-story': {
    'sr': { title: 'Srpska priča', description: 'Istorija i tradicija srpskog naroda.' },
    'sr-cyrillic': { title: 'Српска прича', description: 'Историја и традиција српског народа.' },
    'sv': { title: 'Serbisk historia', description: 'Historia och tradition av det serbiska folket.' },
    'en': { title: 'Serbian Story', description: 'History and tradition of the Serbian people.' }
  }
};

const SEOHead = ({ page = 'home' }) => {
  const { language } = useLanguage();
  
  useEffect(() => {
    const baseSeo = seoData[language] || seoData['sv'];
    const pageSeo = pageSeoData[page]?.[language] || pageSeoData[page]?.['sv'] || {};
    
    // Build page title
    const pageTitle = pageSeo.title 
      ? `${pageSeo.title} | ${baseSeo.title}`
      : baseSeo.title;
    
    // Build page description
    const pageDescription = pageSeo.description || baseSeo.description;
    
    // Update document title
    document.title = pageTitle;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', pageDescription);
    }
    
    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', baseSeo.keywords);
    }
    
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', pageDescription);
    
    // Update Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', pageDescription);
    
    // Update html lang attribute
    const langMap = {
      'sr': 'sr',
      'sr-cyrillic': 'sr-Cyrl',
      'sv': 'sv',
      'en': 'en'
    };
    document.documentElement.lang = langMap[language] || 'sv';
    
  }, [language, page]);
  
  return null; // This component doesn't render anything
};

export default SEOHead;
export { seoData, pageSeoData };
