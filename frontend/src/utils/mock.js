// Mock data for development

export const mockUsers = [
  {
    id: '1',
    username: 'user@test.com',
    password: 'user123',
    role: 'user',
    fullName: 'Marko Petrović',
    email: 'user@test.com',
    phone: '+46701234567',
    yearOfBirth: '1990',
    address: 'Täby Centrum 123',
    emailVerified: true,
    parentName: '',
    parentEmail: '',
    parentPhone: ''
  },
  {
    id: '2',
    username: 'admin@test.com',
    password: 'admin123',
    role: 'admin',
    fullName: 'Ana Jovanović',
    email: 'admin@test.com',
    emailVerified: true
  },
  {
    id: '3',
    username: 'vladanmitic@gmail.com',
    password: 'Admin123!',
    role: 'superadmin',
    fullName: 'Vladan Mitić',
    email: 'vladanmitic@gmail.com',
    emailVerified: true
  }
];

export const mockNews = [
  {
    id: '1',
    date: '2025-01-15',
    title: {
      'sr-latin': 'Proslava Dana svetog Save',
      'sr-cyrillic': 'Прослава Дана светог Саве',
      'en': 'Saint Sava Day Celebration',
      'sv': 'Firande av Sankt Savas dag'
    },
    text: {
      'sr-latin': 'Pozivamo sve članove našeg udruženja da prisustvuju proslavi Dana svetog Save koja će se održati 27. januara. Program uključuje kulturni deo sa nastupom folklorne grupe, školsku priredbu i druženje uz tradicionalnu hranu.',
      'sr-cyrillic': 'Позивамо све чланове нашег удружења да приsustvују прослави Дана светог Саве која ће се одржати 27. јануара. Програм укључује културни део са наступом фолклорне групе, школску приредбу и дружење уз традиционалну храну.',
      'en': 'We invite all members of our association to attend the Saint Sava Day celebration on January 27th. The program includes a cultural performance by our folklore group, school program, and gathering with traditional food.',
      'sv': 'Vi bjuder in alla medlemmar i vår förening att närvara vid firandet av Sankt Savas dag den 27 januari. Programmet inkluderar ett kulturellt framträdande av vår folkloregrupp, skolprogram och sammankomst med traditionell mat.'
    },
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    video: ''
  },
  {
    id: '2',
    date: '2025-01-10',
    title: {
      'sr-latin': 'Novo vreme treninga folklora',
      'sr-cyrillic': 'Ново време тренинга фолклора',
      'en': 'New Folklore Training Schedule',
      'sv': 'Nytt träningsschema för folkdans'
    },
    text: {
      'sr-latin': 'Obaveštavamo članove da od sledeće nedelje treninzi folklora kreću u novo vreme. Deca mlađa grupa: Subota 10:00-11:30. Starija grupa: Subota 12:00-14:00. Odrasli: Sreda 19:00-21:00.',
      'sr-cyrillic': 'Обавештавамо чланове да од следеће недеље тренинзи фолклора крећу у ново време. Деца млађа група: Субота 10:00-11:30. Старија група: Субота 12:00-14:00. Одрасли: Среда 19:00-21:00.',
      'en': 'We inform members that starting next week, folklore trainings will have a new schedule. Children younger group: Saturday 10:00-11:30. Older group: Saturday 12:00-14:00. Adults: Wednesday 19:00-21:00.',
      'sv': 'Vi informerar medlemmarna om att från och med nästa vecka kommer folkdansträningarna att ha ett nytt schema. Barn yngre grupp: Lördag 10:00-11:30. Äldre grupp: Lördag 12:00-14:00. Vuxna: Onsdag 19:00-21:00.'
    },
    image: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
    video: ''
  },
  {
    id: '3',
    date: '2025-01-05',
    title: {
      'sr-latin': 'Uspešno održan Božićni koncert',
      'sr-cyrillic': 'Успешно одржан Божићни концерт',
      'en': 'Successful Christmas Concert',
      'sv': 'Framgångsrik julkonsert'
    },
    text: {
      'sr-latin': 'Zahvaljujemo se svima koji su posetili naš Božićni koncert održan 7. januara. Bilo nam je zadovoljstvo videti punu salu i čuti vaše aplauze. Posebno se zahvaljujemo našim malim umetnicima i folklornoj grupi na predivnom nastupu.',
      'sr-cyrillic': 'Захваљујемо се свима који су посетили наш Божићни концерт одржан 7. јануара. Било нам је задовољство видети пуну салу и чути ваше аплаузе. Посебно се захваљујемо нашим малим уметницима и фолклорној групи на предивном наступу.',
      'en': 'We thank everyone who visited our Christmas concert held on January 7th. It was our pleasure to see a full hall and hear your applause. Special thanks to our young artists and folklore group for a wonderful performance.',
      'sv': 'Vi tackar alla som besökte vår julkonsert som hölls den 7 januari. Det var ett nöje att se en full sal och höra era applåder. Särskilt tack till våra unga artister och folkloregrupp för ett underbart framträdande.'
    },
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
    video: ''
  }
];

export const mockEvents = [
  {
    id: '1',
    date: '2025-01-25',
    time: '10:00',
    title: {
      'sr-latin': 'Trening folklora - Mlađa grupa',
      'sr-cyrillic': 'Тренинг фолклора - Млађа група',
      'en': 'Folklore Training - Younger Group',
      'sv': 'Folkdansträning - Yngre grupp'
    },
    location: 'Täby Kyrkby Sporthall',
    description: {
      'sr-latin': 'Redovan trening za decu uzrasta 6-12 godina',
      'sr-cyrillic': 'Редован тренинг за децу узраста 6-12 година',
      'en': 'Regular training for children aged 6-12',
      'sv': 'Regelbunden träning för barn i åldern 6-12'
    }
  },
  {
    id: '2',
    date: '2025-01-27',
    time: '18:00',
    title: {
      'sr-latin': 'Proslava Dana svetog Save',
      'sr-cyrillic': 'Прослава Дана светог Саве',
      'en': 'Saint Sava Day Celebration',
      'sv': 'Sankt Savas dag firande'
    },
    location: 'Täby Kulturhus',
    description: {
      'sr-latin': 'Svečana akademija povodom školske slave',
      'sr-cyrillic': 'Свечана академија поводом школске славе',
      'en': 'Ceremonial academy on the occasion of the school patron saint day',
      'sv': 'Högtidlig akademi med anledning av skolans skyddshelgons dag'
    }
  },
  {
    id: '3',
    date: '2025-01-29',
    time: '19:00',
    title: {
      'sr-latin': 'Trening folklora - Odrasli',
      'sr-cyrillic': 'Тренинг фолклора - Одрасли',
      'en': 'Folklore Training - Adults',
      'sv': 'Folkdansträning - Vuxna'
    },
    location: 'Täby Kyrkby Sporthall',
    description: {
      'sr-latin': 'Trening za odrasle članove folklornog ansambla',
      'sr-cyrillic': 'Тренинг за одрасле чланове фолклорног ансамбла',
      'en': 'Training for adult members of the folklore ensemble',
      'sv': 'Träning för vuxna medlemmar i folkloreensemblen'
    }
  }
];

export const mockInvoices = [
  {
    id: '1',
    userId: '1',
    amount: 500,
    currency: 'SEK',
    dueDate: '2025-01-20',
    paymentDate: null,
    status: 'unpaid',
    description: 'Članarina - Januar 2025'
  },
  {
    id: '2',
    userId: '1',
    amount: 500,
    currency: 'SEK',
    dueDate: '2024-12-20',
    paymentDate: '2024-12-15',
    status: 'paid',
    description: 'Članarina - Decembar 2024'
  },
  {
    id: '3',
    userId: '1',
    amount: 500,
    currency: 'SEK',
    dueDate: '2024-11-20',
    paymentDate: '2024-11-18',
    status: 'paid',
    description: 'Članarina - Novembar 2024'
  }
];

export const mockGallery = [
  {
    id: '1',
    date: '2025-01-07',
    description: {
      'sr-latin': 'Božićni koncert 2025',
      'sr-cyrillic': 'Божићни концерт 2025',
      'en': 'Christmas Concert 2025',
      'sv': 'Julkonsert 2025'
    },
    images: [
      'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
      'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800'
    ],
    videos: []
  },
  {
    id: '2',
    date: '2024-12-15',
    description: {
      'sr-latin': 'Treninzi folklora',
      'sr-cyrillic': 'Тренинзи фолклора',
      'en': 'Folklore Trainings',
      'sv': 'Folkdansträningar'
    },
    images: [
      'https://images.unsplash.com/photo-1545224144-b38cd309ef69?w=800',
      'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800'
    ],
    videos: []
  }
];

export const mockAboutContent = {
  'sr-latin': 'Srpsko Kulturno Udruženje Täby osnovano je sa ciljem očuvanja srpske kulture, tradicije i jezika među srpskom zajednicom u Švedskoj. Naše udruženje okuplja članove svih uzrasta koji dele ljubav prema srpskoj baštini. Kroz različite aktivnosti kao što su folklor, jezik, muzika i kulturni događaji, trudimo se da mladim generacijama prenesemo bogatu srpsku tradiciju.',
  'sr-cyrillic': 'Српско Културно Удружење Täby основано је са циљем очувања српске културе, традиције и језика међу српском заједницом у Шведској. Наше удружење окупља чланове свих узраста који деле љубав према српској баштини. Кроз различите активности као што су фолклор, језик, музика и културни догађаји, трудимо се да младим генерацијама пренесемо богату српску традицију.',
  'en': 'Serbian Cultural Association Täby was founded with the goal of preserving Serbian culture, tradition, and language among the Serbian community in Sweden. Our association gathers members of all ages who share a love for Serbian heritage. Through various activities such as folklore, language, music, and cultural events, we strive to pass on the rich Serbian tradition to younger generations.',
  'sv': 'Serbiska kulturföreningen Täby grundades med målet att bevara serbisk kultur, tradition och språk bland den serbiska gemenskapen i Sverige. Vår förening samlar medlemmar i alla åldrar som delar kärleken till det serbiska arvet. Genom olika aktiviteter som folkdans, språk, musik och kulturella evenemang strävar vi efter att föra vidare den rika serbiska traditionen till yngre generationer.'
};

export const mockSerbianStories = [
  {
    id: '1',
    date: '2025-01-10',
    title: {
      'sr-latin': 'Slava - Srpska duhovna tradicija',
      'sr-cyrillic': 'Слава - Српска духовна традиција',
      'en': 'Slava - Serbian Spiritual Tradition',
      'sv': 'Slava - Serbisk andlig tradition'
    },
    text: {
      'sr-latin': 'Slava je jedinstvena srpska tradicija posvećena krsnom imenu porodice. Ova običajnost, koja datira vekovima unazad, predstavlja neraskidivu vezu između vere, porodice i nacionalnog identiteta. Svaka srpska porodica ima svog sveca zaštitnika čiji dan slavi sa posebnim ritualima, slavljem i gostoprimstvom.',
      'sr-cyrillic': 'Слава је јединствена српска традиција посвећена крсном имену породице. Ова обичајност, која датира вековима уназад, представља нераскидиву везу између вере, породице и националног идентитета. Свака српска породица има свог свеца заштитника чији дан слави са посебним ритуалима, слављем и гостопримством.',
      'en': 'Slava is a unique Serbian tradition dedicated to the family patron saint. This custom, dating back centuries, represents an inseparable bond between faith, family, and national identity. Each Serbian family has its patron saint whose day is celebrated with special rituals, celebration, and hospitality.',
      'sv': 'Slava är en unik serbisk tradition tillägnad familjens skyddshelgon. Denna sed, som går tillbaka flera århundraden, representerar ett oskiljaktig band mellan tro, familj och nationell identitet. Varje serbisk familj har sitt skyddshelgon vars dag firas med speciella ritualer, firande och gästfrihet.'
    },
    image: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800',
    video: '',
    url: 'https://en.wikipedia.org/wiki/Slava'
  }
];

export const mockSettings = {
  address: 'Täby Centrum 1, 183 30 Täby',
  bankAccount: 'SE12 3456 7890 1234 5678 90',
  vatNumber: 'SE123456789001',
  registrationNumber: '802456-1234',
  contactEmail: 'info@srpskoudruzenjetaby.se',
  contactPhone: '+46 70 123 45 67',
  socialMedia: {
    facebook: 'https://facebook.com/skudtaby',
    instagram: 'https://instagram.com/skudtaby',
    youtube: 'https://youtube.com/@skudtaby'
  }
};