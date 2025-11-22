import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { mockAboutContent } from '../utils/mock';
import { Users, Heart, Music, BookOpen } from 'lucide-react';

const About = () => {
  const { language } = useLanguage();

  const features = [
    {
      icon: Users,
      title: {
        'sr-latin': 'Zajednica',
        'sr-cyrillic': 'Заједница',
        'en': 'Community',
        'sv': 'Gemenskap'
      },
      description: {
        'sr-latin': 'Okupljamo srpsku zajednicu u Švedskoj',
        'sr-cyrillic': 'Окупљамо српску заједницу у Шведској',
        'en': 'Gathering the Serbian community in Sweden',
        'sv': 'Samlar den serbiska gemenskapen i Sverige'
      }
    },
    {
      icon: Heart,
      title: {
        'sr-latin': 'Tradicija',
        'sr-cyrillic': 'Традиција',
        'en': 'Tradition',
        'sv': 'Tradition'
      },
      description: {
        'sr-latin': 'Čuvamo i prenosimo srpsku baštinu',
        'sr-cyrillic': 'Чувамо и преносимо српску баштину',
        'en': 'Preserving and passing on Serbian heritage',
        'sv': 'Bevarar och för vidare serbiskt arv'
      }
    },
    {
      icon: Music,
      title: {
        'sr-latin': 'Folklor',
        'sr-cyrillic': 'Фолклор',
        'en': 'Folklore',
        'sv': 'Folkdans'
      },
      description: {
        'sr-latin': 'Negujemo srpske igre i muziku',
        'sr-cyrillic': 'Негујемо српске игре и музику',
        'en': 'Cultivating Serbian dances and music',
        'sv': 'Odlar serbiska danser och musik'
      }
    },
    {
      icon: BookOpen,
      title: {
        'sr-latin': 'Obrazovanje',
        'sr-cyrillic': 'Образовање',
        'en': 'Education',
        'sv': 'Utbildning'
      },
      description: {
        'sr-latin': 'Učimo srpski jezik i kulturu',
        'sr-cyrillic': 'Учимо српски језик и културу',
        'en': 'Teaching Serbian language and culture',
        'sv': 'Undervisar i serbiska språk och kultur'
      }
    }
  ];

  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-[#8B1F1F] dark:text-[#C1272D] mb-6">
            O nama / About Us
          </h1>
          <div className="w-24 h-1 bg-[#C1272D] mx-auto" />
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="border-2 border-[#C1272D]/20">
            <CardContent className="p-8">
              <div className="flex justify-center mb-8">
                <img 
                  src="/logo.jpg" 
                  alt="SKUD Täby Logo" 
                  className="h-32 w-32 object-contain rounded-full border-4 border-[#C1272D]"
                />
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed text-justify">
                {mockAboutContent[language]}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#C1272D]/20">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-[#C1272D]/10 rounded-full group-hover:bg-[#C1272D] transition-colors duration-300">
                      <Icon className="h-8 w-8 text-[#C1272D] group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {feature.title[language]}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {feature.description[language]}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default About;