import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const BASE_URL = 'https://srpskoudruzenjetaby.se';

// SEO metadata per language - maximized for search rankings
const seoData = {
  'sr-latin': {
    siteName: 'Srpsko Kulturno Udruženje Täby - SKUD Täby',
    title: 'Srpsko Kulturno Udruženje Täby | SKUD Täby',
    description: 'Srpsko Kulturno Udruženje Täby (SKUD Täby) - Kulturna zajednica Srba u Täbiju, Stokholmu, Švedska. Narodni ples, srpska tradicija, kulturni događaji, folklor. Pridružite nam se!',
    keywords: 'Srpsko Kulturno Udruženje Täby, SKUD Täby, Srpsko Kulturno Društvo Täby, Srpsko Udruženje Täby, srpsko udruženje u Švedskoj, srpsko udruženje Stokholm, Srbi u Täbiju, Srbi u Stokholmu, Srbi u Švedskoj, srpska dijaspora Švedska, srpski narodni ples, srpska kultura Švedska, srpski folklor, srpska tradicija, srpski događaji Stokholm, srpska zajednica Stokholm, srpska zajednica Švedska, narodni ples Švedska'
  },
  'sr-cyrillic': {
    siteName: 'Српско Културно Удружење Теби - СКУД Теби',
    title: 'Српско Културно Удружење Теби | СКУД Теби',
    description: 'Српско Културно Удружење Теби (СКУД Теби) - Културна заједница Срба у Тебију, Стокхолму, Шведска. Народни плес, српска традиција, културни догађаји, фолклор.',
    keywords: 'Српско Културно Удружење Теби, СКУД Теби, Српско Удружење Теби, Срби у Шведској, Срби у Стокхолму, српска дијаспора Шведска, српски народни плес, српска култура Шведска, српски фолклор, српска традиција, српски догађаји Стокхолм, српска заједница Стокхолм'
  },
  'sv': {
    siteName: 'Serbiska Kulturföreningen i Täby - SKUD Täby',
    title: 'Serbiska Kulturföreningen i Täby | SKUD Täby',
    description: 'Serbiska Kulturföreningen i Täby (SKUD Täby) - Serbisk kulturförening i Täby, Stockholm, Sverige. Folkdans, serbiska traditioner, kulturevenemang, folklore. Välkommen att bli medlem!',
    keywords: 'Serbiska Kulturföreningen i Täby, Serbiska Kulturföreningen Täby, Serbiska föreningen Täby, Serbiska föreningen i Täby, SKUD Täby, serbisk förening Täby, serbisk kulturförening Täby, serbisk förening Stockholm, serbisk kulturförening Stockholm, serbiska evenemang Täby, serbiska evenemang Stockholm, serbisk folkdans Täby, serbisk folkdans Stockholm, serbiska traditioner Sverige, Serber i Täby, Serber i Stockholm, Serber i Sverige, serbisk community Stockholm, serbisk folklore Sverige'
  },
  'en': {
    siteName: 'Serbian Cultural Association Täby - SKUD Täby',
    title: 'Serbian Cultural Association Täby | SKUD Täby',
    description: 'Serbian Cultural Association Täby (SKUD Täby) - Serbian cultural community in Täby, Stockholm, Sweden. Folk dance, Serbian traditions, cultural events, folklore. Join us!',
    keywords: 'Serbian Cultural Association Täby, Serbian Association Täby, SKUD Täby, Serbian community Täby, Serbian community Stockholm, Serbian community Sweden, Serbs in Täby, Serbs in Stockholm, Serbs in Sweden, Serbian diaspora Sweden, Serbian folk dance Sweden, Serbian culture Sweden, Serbian events Stockholm, Serbian traditions Sweden, Serbian folklore Sweden'
  }
};

// Page-specific SEO - every page has unique titles and descriptions
const pageSeoData = {
  home: {
    'sr-latin': { title: 'Početna' },
    'sr-cyrillic': { title: 'Почетна' },
    'sv': { title: 'Hem' },
    'en': { title: 'Home' }
  },
  about: {
    'sr-latin': { title: 'O nama - Srpsko Kulturno Udruženje Täby', description: 'Saznajte više o Srpskom Kulturnom Udruženju Täby (SKUD Täby) - naša istorija, misija i vizija. Čuvamo i promovišemo srpsku kulturu u Švedskoj.' },
    'sr-cyrillic': { title: 'О нама - Српско Културно Удружење Теби', description: 'Сазнајте више о Српском Културном Удружењу Теби (СКУД Теби) - наша историја, мисија и визија.' },
    'sv': { title: 'Om oss - Serbiska Kulturföreningen i Täby', description: 'Läs mer om Serbiska Kulturföreningen i Täby (SKUD Täby) - vår historia, mission och vision. Vi bevarar och främjar serbisk kultur i Sverige.' },
    'en': { title: 'About Us - Serbian Cultural Association Täby', description: 'Learn about Serbian Cultural Association Täby (SKUD Täby) - our history, mission and vision. Preserving Serbian culture in Sweden.' }
  },
  gallery: {
    'sr-latin': { title: 'Galerija - Srpsko Kulturno Udruženje Täby', description: 'Pogledajte fotografije sa kulturnih događaja, folklornih nastupa i aktivnosti Srpskog Kulturnog Udruženja Täby.' },
    'sr-cyrillic': { title: 'Галерија - Српско Културно Удружење Теби', description: 'Погледајте фотографије са културних догађаја и активности Српског Културног Удружења Теби.' },
    'sv': { title: 'Galleri - Serbiska Kulturföreningen i Täby', description: 'Se bilder från kulturevenemang, folkdansföreställningar och aktiviteter från Serbiska Kulturföreningen i Täby.' },
    'en': { title: 'Gallery - Serbian Cultural Association Täby', description: 'View photos from cultural events, folk dance performances and activities of the Serbian Cultural Association Täby.' }
  },
  contact: {
    'sr-latin': { title: 'Kontakt - Srpsko Kulturno Udruženje Täby', description: 'Kontaktirajte Srpsko Kulturno Udruženje Täby. Adresa: Rösvägen 84, Täby, Stokholm. Email: info@srpskoudruzenjetaby.se' },
    'sr-cyrillic': { title: 'Контакт - Српско Културно Удружење Теби', description: 'Контактирајте Српско Културно Удружење Теби. Адреса: Rösvägen 84, Теби, Стокхолм.' },
    'sv': { title: 'Kontakt - Serbiska Kulturföreningen i Täby', description: 'Kontakta Serbiska Kulturföreningen i Täby. Adress: Rösvägen 84, 187 43 Täby, Stockholm. E-post: info@srpskoudruzenjetaby.se' },
    'en': { title: 'Contact - Serbian Cultural Association Täby', description: 'Contact Serbian Cultural Association Täby. Address: Rösvägen 84, 187 43 Täby, Stockholm, Sweden. Email: info@srpskoudruzenjetaby.se' }
  },
  'serbian-story': {
    'sr-latin': { title: 'Srpska priča - Istorija i tradicija srpskog naroda', description: 'Istorija i tradicija srpskog naroda. Srpska kultura, tradicija i običaji predstavljeni od strane SKUD Täby.' },
    'sr-cyrillic': { title: 'Српска прича - Историја и традиција српског народа', description: 'Историја и традиција српског народа. Српска култура и обичаји.' },
    'sv': { title: 'Serbisk historia - Serbiska Kulturföreningen i Täby', description: 'Serbisk historia, kultur och traditioner presenterade av Serbiska Kulturföreningen i Täby.' },
    'en': { title: 'Serbian Story - History and traditions of Serbian people', description: 'Serbian history, culture and traditions presented by the Serbian Cultural Association Täby.' }
  }
};

const SEOHead = ({ page = 'home' }) => {
  const { language } = useLanguage();
  
  useEffect(() => {
    const baseSeo = seoData[language] || seoData['sv'];
    const pageSeo = pageSeoData[page]?.[language] || pageSeoData[page]?.['sv'] || {};
    
    // Build page title - include site name for brand reinforcement
    const pageTitle = pageSeo.title 
      ? `${pageSeo.title} | ${baseSeo.siteName}`
      : baseSeo.title;
    
    const pageDescription = pageSeo.description || baseSeo.description;
    
    // Update document title
    document.title = pageTitle;
    
    // Update or create meta tags
    const updateMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };
    
    updateMeta('meta[name="description"]', pageDescription);
    updateMeta('meta[name="title"]', pageTitle);
    updateMeta('meta[name="keywords"]', baseSeo.keywords);
    updateMeta('meta[property="og:title"]', pageTitle);
    updateMeta('meta[property="og:description"]', pageDescription);
    updateMeta('meta[property="og:site_name"]', baseSeo.siteName);
    updateMeta('meta[name="twitter:title"]', pageTitle);
    updateMeta('meta[name="twitter:description"]', pageDescription);
    
    // Update canonical URL
    const path = page === 'home' ? '/' : `/${page === 'serbian-story' ? 'serbian-story' : page}`;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', `${BASE_URL}${path}`);
    
    // Update OG URL
    updateMeta('meta[property="og:url"]', `${BASE_URL}${path}`);
    
    // Update html lang attribute
    const langMap = { 'sr-latin': 'sr', 'sr-cyrillic': 'sr-Cyrl', 'sv': 'sv', 'en': 'en' };
    document.documentElement.lang = langMap[language] || 'sv';
    
  }, [language, page]);
  
  return null;
};

export default SEOHead;
