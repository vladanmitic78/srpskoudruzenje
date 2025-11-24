import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)

# Email configuration from brief
SMTP_HOST = "mailcluster.loopia.se"
SMTP_PORT = 465  # SSL/TLS
SMTP_USER = "info@srpskoudruzenjetaby.se"
SMTP_PASSWORD = "sssstaby2025"
FROM_EMAIL = "info@srpskoudruzenjetaby.se"

async def send_email(to_email: str, subject: str, html_content: str, text_content: str = None):
    """Send email using Loopia SMTP server"""
    try:
        message = MIMEMultipart('alternative')
        message['From'] = FROM_EMAIL
        message['To'] = to_email
        message['Subject'] = subject

        # Add plain text version
        if text_content:
            text_part = MIMEText(text_content, 'plain', 'utf-8')
            message.attach(text_part)

        # Add HTML version
        html_part = MIMEText(html_content, 'html', 'utf-8')
        message.attach(html_part)

        # Connect and send
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=True,
            start_tls=False
        )
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def get_verification_email_template(name: str, verification_link: str):
    """Generate verification email in Serbian and Swedish"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #C1272D; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .button {{ display: inline-block; background-color: #C1272D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            .section {{ margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #ddd; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Srpsko Kulturno Udruženje Täby</h1>
            </div>
            <div class="content">
                <!-- Serbian Version -->
                <div class="section">
                    <h2>Poštovani/a {name},</h2>
                    <p>Drago nam je što ste izrazili želju da postanete član našeg kluba. Vaša registracija je uspešno zabeležena.</p>
                    <p>Da biste verifikovali svoju email adresu, molimo vas da kliknete na sledeći link:</p>
                    <p style="text-align: center;">
                        <a href="{verification_link}" class="button">Verifikuj Email</a>
                    </p>
                    <p>Takođe vas molimo da, ukoliko to već niste uradili, popunite sva potrebna polja o sebi ili o vašim roditeljima.</p>
                    <p>Hvala vam na poverenju i dobrodošli u našu zajednicu!</p>
                    <p><strong>Srdačan pozdrav,<br>Srpsko Kulturno Udruženje, Täby</strong></p>
                </div>
                
                <!-- Swedish Version -->
                <div>
                    <h2>Bästa {name},</h2>
                    <p>Vi är glada över att du vill bli medlem i vår serbiska klubb. Din registrering har genomförts framgångsrikt.</p>
                    <p>För att verifiera din e-postadress, vänligen klicka på följande länk:</p>
                    <p style="text-align: center;">
                        <a href="{verification_link}" class="button">Verifiera E-post</a>
                    </p>
                    <p>Vi ber dig också att fylla i alla nödvändiga uppgifter om dig själv eller dina föräldrar.</p>
                    <p>Tack för ditt förtroende och varmt välkommen till vår gemenskap!</p>
                    <p><strong>Vänliga hälsningar,<br>Srpsko Kulturno Udruženje, Täby</strong></p>
                </div>
            </div>
            <div class="footer">
                <p>Srpsko Kulturno Udruženje Täby<br>
                Täby Centrum 1, 183 30 Täby<br>
                info@srpskoudruzenjetaby.se</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
Poštovani/a {name},

Drago nam je što ste izrazili želju da postanete član našeg kluba. Vaša registracija je uspešno zabeležena.

Da biste verifikovali svoju email adresu, molimo vas da kliknete na sledeći link:
{verification_link}

Takodje vas molimo da, ukoliko to već niste uradili, popunite sva potrebna polja o sebi ili o vašim roditeljima.

Hvala vam na poverenju i dobrodošli u našu zajednicu!

Srdačan pozdrav,
Srpsko Kulturno Udruženje, Täby

---

Bästa {name},

Vi är glada över att du vill bli medlem i vår serbiska klubb. Din registrering har genomförts framgångsrikt.

För att verifiera din e-postadress, vänligen klicka på följande länk:
{verification_link}

Vi ber dig också att fylla i alla nödvändiga uppgifter om dig själv eller dina föräldrar.

Tack för ditt förtroende och varmt välkommen till vår gemenskap!

Vänliga hälsningar,
Srpsko Kulturno Udruženje, Täby
    """
    
    return html_content, text_content

def get_training_reminder_template(name: str, event_title: str, event_date: str, event_time: str, location: str):
    """Generate training reminder email"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #C1272D; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .event-details {{ background-color: white; padding: 20px; border-left: 4px solid #C1272D; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Podsetnik za trening / Träningspåminnelse</h1>
            </div>
            <div class="content">
                <h2>Poštovani/a {name},</h2>
                <p>Podsetamo vas da imate potvrđen trening sutra:</p>
                <div class="event-details">
                    <h3>{event_title}</h3>
                    <p><strong>Datum:</strong> {event_date}</p>
                    <p><strong>Vreme:</strong> {event_time}</p>
                    <p><strong>Lokacija:</strong> {location}</p>
                </div>
                <p>Vidimo se!</p>
                <hr>
                <h2>Bästa {name},</h2>
                <p>Vi påminner dig om din bekräftade träning imorgon:</p>
                <div class="event-details">
                    <h3>{event_title}</h3>
                    <p><strong>Datum:</strong> {event_date}</p>
                    <p><strong>Tid:</strong> {event_time}</p>
                    <p><strong>Plats:</strong> {location}</p>
                </div>
                <p>Vi ses!</p>
            </div>
            <div class="footer">
                <p>Srpsko Kulturno Udruženje Täby</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_content, f"Podsetnik: {event_title} - {event_date} u {event_time}"

def get_cancellation_email_template(name: str, event_title: str, reason: str):
    """Generate event cancellation email"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #C1272D; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .alert {{ background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Otkazivanje treninga / Träningsinställning</h1>
            </div>
            <div class="content">
                <h2>Poštovani/a {name},</h2>
                <div class="alert">
                    <p><strong>Obaveštenje:</strong> Nažalost, trening "{event_title}" je otkazan.</p>
                    <p><strong>Razlog:</strong> {reason}</p>
                </div>
                <p>Izvinjavamo se zbog neprijatnosti. Bićete obavešteni o novom terminu.</p>
                <hr>
                <h2>Bästa {name},</h2>
                <div class="alert">
                    <p><strong>Meddelande:</strong> Tyvärr har träningen "{event_title}" ställts in.</p>
                    <p><strong>Anledning:</strong> {reason}</p>
                </div>
                <p>Vi ber om ursäkt för besväret. Du kommer att meddelas om en ny tid.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_content, f"Otkazano / Inställt: {event_title}"

def get_contact_form_notification(name: str, email: str, topic: str, message: str):
    """Generate contact form notification for admin"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #C1272D; color: white; padding: 20px; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .field {{ margin-bottom: 15px; }}
            .field strong {{ display: inline-block; width: 100px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Nova poruka sa kontakt forme</h1>
            </div>
            <div class="content">
                <h2>Kontakt forma</h2>
                <div class="field"><strong>Ime:</strong> {name}</div>
                <div class="field"><strong>Email:</strong> {email}</div>
                <div class="field"><strong>Tema:</strong> {topic}</div>
                <div class="field"><strong>Poruka:</strong></div>
                <p style="background: white; padding: 15px; border-left: 4px solid #C1272D;">{message}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Kontakt Forma / Contact Form
    
    Od/From: {name}
    Email: {email}
    Tema/Topic: {topic}
    
    Poruka/Message:
    {message}
    """
    
    return html_content, text_content


def get_admin_new_user_notification_template(user_name: str, user_email: str, registration_date: str):
    """Generate admin notification email for new user registration"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }}
            .header {{
                background-color: #C1272D;
                color: white;
                padding: 20px;
                text-align: center;
            }}
            .content {{
                background-color: white;
                padding: 30px;
                border-radius: 5px;
                margin-top: 20px;
            }}
            .user-info {{
                background-color: #f5f5f5;
                padding: 15px;
                border-left: 4px solid #C1272D;
                margin: 20px 0;
            }}
            .user-info p {{
                margin: 8px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Nova Registracija Korisnika / Ny Användarregistrering</h1>
            </div>
            <div class="content">
                <h2>Srpski / Serbian</h2>
                <p>Novi korisnik se registrovao na platformi Srpsko Kulturno Društvo Täby.</p>
                
                <div class="user-info">
                    <p><strong>Ime:</strong> {user_name}</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Datum registracije:</strong> {registration_date}</p>
                </div>

                <p>Molimo vas da pregledate korisničke podatke u admin panelu.</p>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

                <h2>Svenska / Swedish</h2>
                <p>En ny användare har registrerat sig på Srpsko Kulturno Društvo Täby-plattformen.</p>
                
                <div class="user-info">
                    <p><strong>Namn:</strong> {user_name}</p>
                    <p><strong>E-post:</strong> {user_email}</p>
                    <p><strong>Registreringsdatum:</strong> {registration_date}</p>
                </div>

                <p>Vänligen granska användardata i adminpanelen.</p>
            </div>
            <div class="footer">
                <p>Detta är ett automatiskt meddelande från Srpsko Kulturno Društvo Täby</p>
                <p>This is an automated message from Srpsko Kulturno Društvo Täby</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    Nova Registracija Korisnika / Ny Användarregistrering
    
    SRPSKI:
    Novi korisnik se registrovao na platformi.
    
    Ime: {user_name}
    Email: {user_email}
    Datum registracije: {registration_date}
    
    ---
    
    SVENSKA:
    En ny användare har registrerat sig på plattformen.
    
    Namn: {user_name}
    E-post: {user_email}
    Registreringsdatum: {registration_date}
    """
    


def get_admin_event_participation_notification(user_name: str, user_email: str, event_title: str, event_date: str, event_time: str, action: str, reason: str = None):
    """Generate admin notification for user event participation (confirm/cancel)
    
    Args:
        action: 'confirmed' or 'cancelled'
        reason: Only for cancelled actions
    """
    action_sr = "potvrdio učešće" if action == "confirmed" else "otkazao učešće"
    action_sv = "bekräftat deltagande" if action == "confirmed" else "avbokad deltagande"
    
    reason_html = ""
    reason_text = ""
    if reason:
        reason_html = f"""
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0;">
            <p style="margin: 0;"><strong>Razlog otkazivanja / Anledning till avbokning:</strong></p>
            <p style="margin: 8px 0 0 0;">{reason}</p>
        </div>
        """
        reason_text = f"\n\nRazlog / Anledning:\n{reason}\n"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }}
            .header {{ background-color: {'#28a745' if action == 'confirmed' else '#dc3545'}; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: white; padding: 30px; border-radius: 5px; margin-top: 20px; }}
            .info-box {{ background-color: #f5f5f5; padding: 15px; border-left: 4px solid #C1272D; margin: 20px 0; }}
            .info-box p {{ margin: 8px 0; }}
            .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{'✓' if action == 'confirmed' else '✗'} Učešće na Događaju / Evenemang Deltagande</h1>
            </div>
            <div class="content">
                <h2>Srpski / Serbian</h2>
                <p>Korisnik je <strong>{action_sr}</strong> na događaju.</p>
                
                <div class="info-box">
                    <p><strong>Korisnik:</strong> {user_name}</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Događaj:</strong> {event_title}</p>
                    <p><strong>Datum:</strong> {event_date} u {event_time}</p>
                </div>
                {reason_html}

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

                <h2>Svenska / Swedish</h2>
                <p>Användaren har <strong>{action_sv}</strong> för evenemanget.</p>
                
                <div class="info-box">
                    <p><strong>Användare:</strong> {user_name}</p>
                    <p><strong>E-post:</strong> {user_email}</p>
                    <p><strong>Evenemang:</strong> {event_title}</p>
                    <p><strong>Datum:</strong> {event_date} kl {event_time}</p>
                </div>
            </div>
            <div class="footer">
                <p>Detta är ett automatiskt meddelande från Srpsko Kulturno Društvo Täby</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    {'✓' if action == 'confirmed' else '✗'} Učešće na Događaju / Evenemang Deltagande
    
    SRPSKI:
    Korisnik je {action_sr} na događaju.
    
    Korisnik: {user_name}
    Email: {user_email}
    Događaj: {event_title}
    Datum: {event_date} u {event_time}
    {reason_text}
    
    ---
    
    SVENSKA:
    Användaren har {action_sv} för evenemanget.
    
    Användare: {user_name}
    E-post: {user_email}
    Evenemang: {event_title}
    Datum: {event_date} kl {event_time}
    """
    
    return html, text