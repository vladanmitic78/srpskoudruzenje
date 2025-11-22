"""
Seed initial data from frontend mock.js to MongoDB
Run this once to populate the database with initial content
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path
from auth_utils import hash_password

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Starting database seeding...")
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    # await db.users.delete_many({"role": {"$ne": "superadmin"}})
    # await db.news.delete_many({})
    # await db.events.delete_many({})
    # await db.gallery.delete_many({})
    # await db.stories.delete_many({})
    
    # Seed test users
    test_users = [
        {
            "_id": "user_test_1",
            "username": "user@test.com",
            "email": "user@test.com",
            "fullName": "Marko Petrović",
            "phone": "+46701234567",
            "yearOfBirth": "1990",
            "address": "Täby Centrum 123",
            "hashed_password": hash_password("user123"),
            "role": "user",
            "emailVerified": True,
            "createdAt": datetime.utcnow()
        },
        {
            "_id": "admin_test_1",
            "username": "admin@test.com",
            "email": "admin@test.com",
            "fullName": "Ana Jovanović",
            "hashed_password": hash_password("admin123"),
            "role": "admin",
            "emailVerified": True,
            "createdAt": datetime.utcnow()
        }
    ]
    
    for user in test_users:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"✓ Created test user: {user['email']}")
    
    # Seed news
    news_data = [
        {
            "_id": "news_1",
            "date": "2025-01-15",
            "title": {
                "sr-latin": "Proslava Dana svetog Save",
                "sr-cyrillic": "Прослава Дана светог Саве",
                "en": "Saint Sava Day Celebration",
                "sv": "Firande av Sankt Savas dag"
            },
            "text": {
                "sr-latin": "Pozivamo sve članove našeg udruženja da prisustvuju proslavi Dana svetog Save koja će se održati 27. januara. Program uključuje kulturni deo sa nastupom folklorne grupe, školsku priredbu i druženje uz tradicionalnu hranu.",
                "sr-cyrillic": "Позивамо све чланове нашег удружења да присуствују прослави Дана светог Саве која ће се одржати 27. јануара. Програм укључује културни део са наступом фолклорне групе, школску приредбу и дружење уз традиционалну храну.",
                "en": "We invite all members of our association to attend the Saint Sava Day celebration on January 27th. The program includes a cultural performance by our folklore group, school program, and gathering with traditional food.",
                "sv": "Vi bjuder in alla medlemmar i vår förening att närvara vid firandet av Sankt Savas dag den 27 januari. Programmet inkluderar ett kulturellt framträdande av vår folkloregrupp, skolprogram och sammankomst med traditionell mat."
            },
            "image": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
            "video": "",
            "createdAt": datetime.utcnow()
        },
        {
            "_id": "news_2",
            "date": "2025-01-10",
            "title": {
                "sr-latin": "Novo vreme treninga folklora",
                "sr-cyrillic": "Ново време тренинга фолклора",
                "en": "New Folklore Training Schedule",
                "sv": "Nytt träningsschema för folkdans"
            },
            "text": {
                "sr-latin": "Obaveštavamo članove da od sledeće nedelje treninzi folklora kreću u novo vreme. Deca mlađa grupa: Subota 10:00-11:30. Starija grupa: Subota 12:00-14:00. Odrasli: Sreda 19:00-21:00.",
                "sr-cyrillic": "Обавештавамо чланове да од следеће недеље тренинзи фолклора крећу у ново време. Деца млађа група: Субота 10:00-11:30. Старија група: Субота 12:00-14:00. Одрасли: Среда 19:00-21:00.",
                "en": "We inform members that starting next week, folklore trainings will have a new schedule. Children younger group: Saturday 10:00-11:30. Older group: Saturday 12:00-14:00. Adults: Wednesday 19:00-21:00.",
                "sv": "Vi informerar medlemmarna om att från och med nästa vecka kommer folkdansträningarna att ha ett nytt schema. Barn yngre grupp: Lördag 10:00-11:30. Äldre grupp: Lördag 12:00-14:00. Vuxna: Onsdag 19:00-21:00."
            },
            "image": "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800",
            "video": "",
            "createdAt": datetime.utcnow()
        },
        {
            "_id": "news_3",
            "date": "2025-01-05",
            "title": {
                "sr-latin": "Uspešno održan Božićni koncert",
                "sr-cyrillic": "Успешно одржан Божићни концерт",
                "en": "Successful Christmas Concert",
                "sv": "Framgångsrik julkonsert"
            },
            "text": {
                "sr-latin": "Zahvaljujemo se svima koji su posetili naš Božićni koncert održan 7. januara. Bilo nam je zadovoljstvo videti punu salu i čuti vaše aplauze. Posebno se zahvaljujemo našim malim umetnicima i folklornoj grupi na predivnom nastupu.",
                "sr-cyrillic": "Захваљујемо се свима који су посетили наш Божићни концерт одржан 7. јануара. Било нам је задовољство видети пуну салу и чути ваше аплаузе. Посебно се захваљујемо нашим малим уметницима и фолклорној групи на предивном наступу.",
                "en": "We thank everyone who visited our Christmas concert held on January 7th. It was our pleasure to see a full hall and hear your applause. Special thanks to our young artists and folklore group for a wonderful performance.",
                "sv": "Vi tackar alla som besökte vår julkonsert som hölls den 7 januari. Det var ett nöje att se en full sal och höra era applåder. Särskilt tack till våra unga artister och folkloregrupp för ett underbart framträdande."
            },
            "image": "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800",
            "video": "",
            "createdAt": datetime.utcnow()
        }
    ]
    
    for news in news_data:
        existing = await db.news.find_one({"_id": news["_id"]})
        if not existing:
            await db.news.insert_one(news)
            print(f"✓ Created news: {news['title']['en']}")
    
    # Seed events
    events_data = [
        {
            "_id": "event_1",
            "date": "2025-01-25",
            "time": "10:00",
            "title": {
                "sr-latin": "Trening folklora - Mlađa grupa",
                "sr-cyrillic": "Тренинг фолклора - Млађа група",
                "en": "Folklore Training - Younger Group",
                "sv": "Folkdansträning - Yngre grupp"
            },
            "location": "Täby Kyrkby Sporthall",
            "description": {
                "sr-latin": "Redovan trening za decu uzrasta 6-12 godina",
                "sr-cyrillic": "Редован тренинг за децу узраста 6-12 година",
                "en": "Regular training for children aged 6-12",
                "sv": "Regelbunden träning för barn i åldern 6-12"
            },
            "status": "active",
            "participants": [],
            "createdAt": datetime.utcnow()
        },
        {
            "_id": "event_2",
            "date": "2025-01-27",
            "time": "18:00",
            "title": {
                "sr-latin": "Proslava Dana svetog Save",
                "sr-cyrillic": "Прослава Дана светог Саве",
                "en": "Saint Sava Day Celebration",
                "sv": "Sankt Savas dag firande"
            },
            "location": "Täby Kulturhus",
            "description": {
                "sr-latin": "Svečana akademija povodom školske slave",
                "sr-cyrillic": "Свечана академија поводом школске славе",
                "en": "Ceremonial academy on the occasion of the school patron saint day",
                "sv": "Högtidlig akademi med anledning av skolans skyddshelgons dag"
            },
            "status": "active",
            "participants": [],
            "createdAt": datetime.utcnow()
        }
    ]
    
    for event in events_data:
        existing = await db.events.find_one({"_id": event["_id"]})
        if not existing:
            await db.events.insert_one(event)
            print(f"✓ Created event: {event['title']['en']}")
    
    # Seed gallery
    gallery_data = [
        {
            "_id": "gallery_1",
            "date": "2025-01-07",
            "description": {
                "sr-latin": "Božićni koncert 2025",
                "sr-cyrillic": "Божићни концерт 2025",
                "en": "Christmas Concert 2025",
                "sv": "Julkonsert 2025"
            },
            "images": [
                "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800",
                "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
                "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800"
            ],
            "videos": [],
            "createdAt": datetime.utcnow()
        }
    ]
    
    for gallery in gallery_data:
        existing = await db.gallery.find_one({"_id": gallery["_id"]})
        if not existing:
            await db.gallery.insert_one(gallery)
            print(f"✓ Created gallery: {gallery['description']['en']}")
    
    # Seed Serbian stories
    stories_data = [
        {
            "_id": "story_1",
            "date": "2025-01-10",
            "title": {
                "sr-latin": "Slava - Srpska duhovna tradicija",
                "sr-cyrillic": "Слава - Српска духовна традиција",
                "en": "Slava - Serbian Spiritual Tradition",
                "sv": "Slava - Serbisk andlig tradition"
            },
            "text": {
                "sr-latin": "Slava je jedinstvena srpska tradicija posvećena krsnom imenu porodice. Ova običajnost, koja datira vekovima unazad, predstavlja neraskidivu vezu između vere, porodice i nacionalnog identiteta. Svaka srpska porodica ima svog sveca zaštitnika čiji dan slavi sa posebnim ritualima, slavljem i gostoprimstvom.",
                "sr-cyrillic": "Слава је јединствена српска традиција посвећена крсном имену породице. Ова обичајност, која датира вековима уназад, представља нераскидиву везу између вере, породице и националног идентитета. Свака српска породица има свог свеца заштитника чији дан слави са посебним ритуалима, слављем и гостопримством.",
                "en": "Slava is a unique Serbian tradition dedicated to the family patron saint. This custom, dating back centuries, represents an inseparable bond between faith, family, and national identity. Each Serbian family has its patron saint whose day is celebrated with special rituals, celebration, and hospitality.",
                "sv": "Slava är en unik serbisk tradition tillägnad familjens skyddshelgon. Denna sed, som går tillbaka flera århundraden, representerar ett oskiljaktig band mellan tro, familj och nationell identitet. Varje serbisk familj har sitt skyddshelgon vars dag firas med speciella ritualer, firande och gästfrihet."
            },
            "image": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800",
            "video": "",
            "url": "https://en.wikipedia.org/wiki/Slava",
            "createdAt": datetime.utcnow()
        }
    ]
    
    for story in stories_data:
        existing = await db.stories.find_one({"_id": story["_id"]})
        if not existing:
            await db.stories.insert_one(story)
            print(f"✓ Created story: {story['title']['en']}")
    
    # Seed test invoices for test user
    invoices_data = [
        {
            "_id": "invoice_1",
            "userId": "user_test_1",
            "amount": 500,
            "currency": "SEK",
            "dueDate": "2025-01-20",
            "paymentDate": None,
            "status": "unpaid",
            "description": "Članarina - Januar 2025",
            "fileUrl": None,
            "createdAt": datetime.utcnow()
        },
        {
            "_id": "invoice_2",
            "userId": "user_test_1",
            "amount": 500,
            "currency": "SEK",
            "dueDate": "2024-12-20",
            "paymentDate": "2024-12-15",
            "status": "paid",
            "description": "Članarina - Decembar 2024",
            "fileUrl": None,
            "createdAt": datetime.utcnow()
        }
    ]
    
    for invoice in invoices_data:
        existing = await db.invoices.find_one({"_id": invoice["_id"]})
        if not existing:
            await db.invoices.insert_one(invoice)
            print(f"✓ Created invoice: {invoice['description']}")
    
    print("\\n✅ Database seeding completed successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
