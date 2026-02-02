"""
Professional PDF Invoice Generator for SKUD Täby
Generates beautiful invoices with Serbian cultural design elements
"""

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, Line
from io import BytesIO
import requests

# SKUD Täby Brand Colors
PRIMARY_COLOR = colors.HexColor('#C1272D')  # Serbian Red
SECONDARY_COLOR = colors.HexColor('#8B1F1F')  # Dark Red
GOLD_COLOR = colors.HexColor('#D4AF37')  # Gold accent
BLUE_COLOR = colors.HexColor('#003399')  # Serbian Blue

# Default Bank Account Details (fallback if not set in database)
DEFAULT_BANK_DETAILS = {
    "bankName": "____________________",
    "accountHolder": "Srpsko Kulturno Udruženje Täby",
    "iban": "SE__ ____ ____ ____ ____ ____",
    "bicSwift": "________",
    "bankgiro": "___-____",
    "orgNumber": "______-____",
    "swish": "",
}

# Organization Details
ORG_DETAILS = {
    "name": "Srpsko Kulturno Udruženje Täby",
    "name_short": "SKUD Täby",
    "address": "Täby, Sweden",
    "email": "info@srpskoudruzenjetaby.se",
    "website": "www.srpskoudruzenjetaby.se",
}


def download_logo(logo_url: str, save_path: str) -> str:
    """Download logo from URL and save locally"""
    try:
        if logo_url.startswith('http'):
            response = requests.get(logo_url, timeout=10)
            if response.status_code == 200:
                with open(save_path, 'wb') as f:
                    f.write(response.content)
                return save_path
    except Exception as e:
        print(f"Failed to download logo: {e}")
    return None


def generate_invoice_pdf(
    invoice_id: str,
    member_name: str,
    member_email: str,
    description: str,
    amount: float,
    currency: str,
    due_date: str,
    created_at: str,
    output_path: str,
    logo_path: str = None,
    status: str = "unpaid",
    payment_date: str = None,
    bank_details: dict = None
) -> str:
    """
    Generate a professional PDF invoice
    
    Args:
        bank_details: Dict with bankName, accountHolder, iban, bicSwift, bankgiro, orgNumber, swish
    
    Returns: Path to generated PDF file
    """
    
    # Use provided bank details or defaults
    bd = bank_details or DEFAULT_BANK_DETAILS
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=15*mm,
        bottomMargin=20*mm
    )
    
    # Get page dimensions
    width, height = A4
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=PRIMARY_COLOR,
        spaceAfter=5*mm,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.grey,
        spaceAfter=3*mm,
        alignment=TA_LEFT
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=SECONDARY_COLOR,
        spaceBefore=8*mm,
        spaceAfter=3*mm,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=2*mm
    )
    
    bold_style = ParagraphStyle(
        'CustomBold',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        fontName='Helvetica-Bold'
    )
    
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey
    )
    
    # Build content
    content = []
    
    # ===== HEADER SECTION =====
    # Create header with logo and organization info
    header_data = []
    
    # Try to add logo
    logo_element = None
    if logo_path and os.path.exists(logo_path):
        try:
            logo_element = Image(logo_path, width=25*mm, height=25*mm)
        except:
            logo_element = None
    
    # Organization info
    org_info = f"""
    <font size="16" color="#{PRIMARY_COLOR.hexval()[2:]}"><b>{ORG_DETAILS['name_short']}</b></font><br/>
    <font size="9" color="#666666">{ORG_DETAILS['name']}</font><br/>
    <font size="9" color="#666666">{ORG_DETAILS['address']}</font>
    """
    
    # Invoice label
    invoice_label = f"""
    <font size="24" color="#{PRIMARY_COLOR.hexval()[2:]}"><b>FAKTURA</b></font><br/>
    <font size="10" color="#666666">Invoice / Račun</font>
    """
    
    if logo_element:
        header_table = Table([
            [logo_element, Paragraph(org_info, normal_style), Paragraph(invoice_label, ParagraphStyle('Right', alignment=TA_RIGHT, fontSize=10))]
        ], colWidths=[30*mm, 80*mm, 60*mm])
    else:
        header_table = Table([
            [Paragraph(org_info, normal_style), '', Paragraph(invoice_label, ParagraphStyle('Right', alignment=TA_RIGHT, fontSize=10))]
        ], colWidths=[80*mm, 30*mm, 60*mm])
    
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    
    content.append(header_table)
    content.append(Spacer(1, 8*mm))
    
    # ===== DECORATIVE LINE =====
    # Serbian tricolor line
    line_table = Table([['', '', '']], colWidths=[56.7*mm, 56.7*mm, 56.7*mm], rowHeights=[2*mm])
    line_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), PRIMARY_COLOR),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#0C4DA2')),
        ('BACKGROUND', (2, 0), (2, 0), colors.white),
        ('LINEBELOW', (2, 0), (2, 0), 1, colors.HexColor('#DDDDDD')),
    ]))
    content.append(line_table)
    content.append(Spacer(1, 8*mm))
    
    # ===== INVOICE INFO SECTION =====
    invoice_number = invoice_id[-12:].upper() if len(invoice_id) > 12 else invoice_id.upper()
    
    # Format dates
    try:
        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).strftime('%Y-%m-%d')
    except:
        created_date = created_at[:10] if created_at else datetime.now().strftime('%Y-%m-%d')
    
    info_left = f"""
    <font size="9" color="#666666"><b>FAKTURA TILL / INVOICE TO:</b></font><br/><br/>
    <font size="12"><b>{member_name}</b></font><br/>
    <font size="10">{member_email}</font>
    """
    
    status_color = "#28a745" if status == "paid" else "#dc3545"
    status_text = "BETALD / PAID" if status == "paid" else "OBETALD / UNPAID"
    
    info_right = f"""
    <font size="9" color="#666666"><b>FAKTURAINFORMATION:</b></font><br/><br/>
    <font size="10"><b>Fakturanummer:</b> {invoice_number}</font><br/>
    <font size="10"><b>Fakturadatum:</b> {created_date}</font><br/>
    <font size="10"><b>Förfallodatum:</b> {due_date}</font><br/>
    <font size="10"><b>Status:</b> <font color="{status_color}"><b>{status_text}</b></font></font>
    """
    
    if payment_date and status == "paid":
        info_right += f"""<br/><font size="10"><b>Betalningsdatum:</b> {payment_date}</font>"""
    
    info_table = Table([
        [Paragraph(info_left, normal_style), Paragraph(info_right, normal_style)]
    ], colWidths=[85*mm, 85*mm])
    
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    
    content.append(info_table)
    content.append(Spacer(1, 10*mm))
    
    # ===== INVOICE ITEMS TABLE =====
    content.append(Paragraph("<b>FAKTURADETALJER / INVOICE DETAILS</b>", header_style))
    
    items_data = [
        ['Beskrivning / Description', 'Belopp / Amount'],
        [description, f"{amount:,.2f} {currency}"]
    ]
    
    items_table = Table(items_data, colWidths=[120*mm, 50*mm])
    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9FA')),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
    ]))
    
    content.append(items_table)
    content.append(Spacer(1, 5*mm))
    
    # ===== TOTAL AMOUNT =====
    total_data = [
        ['', 'TOTALT ATT BETALA / TOTAL DUE:', f"{amount:,.2f} {currency}"]
    ]
    
    total_table = Table(total_data, colWidths=[70*mm, 60*mm, 40*mm])
    total_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('FONTNAME', (1, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 0), (1, 0), 10),
        ('FONTSIZE', (2, 0), (2, 0), 14),
        ('TEXTCOLOR', (2, 0), (2, 0), PRIMARY_COLOR),
        ('BACKGROUND', (1, 0), (-1, 0), colors.HexColor('#FFF3CD')),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOX', (1, 0), (-1, 0), 1, GOLD_COLOR),
    ]))
    
    content.append(total_table)
    content.append(Spacer(1, 12*mm))
    
    # ===== PAYMENT INFORMATION =====
    content.append(Paragraph("<b>BETALNINGSINFORMATION / PAYMENT DETAILS</b>", header_style))
    
    bank_info = f"""
    <font size="10">
    <b>Banknamn / Bank:</b> {BANK_DETAILS['bank_name']}<br/>
    <b>Kontoinnehavare / Account Holder:</b> {BANK_DETAILS['account_holder']}<br/>
    <b>IBAN:</b> {BANK_DETAILS['iban']}<br/>
    <b>BIC/SWIFT:</b> {BANK_DETAILS['bic_swift']}<br/>
    <b>Bankgiro:</b> {BANK_DETAILS['bankgiro']}<br/>
    <b>Organisationsnummer:</b> {BANK_DETAILS['org_number']}<br/><br/>
    <b>Referens / Reference:</b> {invoice_number}
    </font>
    """
    
    bank_table = Table([[Paragraph(bank_info, normal_style)]], colWidths=[170*mm])
    bank_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F4F8')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    content.append(bank_table)
    content.append(Spacer(1, 10*mm))
    
    # ===== FOOTER =====
    footer_text = f"""
    <font size="8" color="#666666">
    <b>{ORG_DETAILS['name']}</b><br/>
    {ORG_DETAILS['address']} | {ORG_DETAILS['email']} | {ORG_DETAILS['website']}<br/><br/>
    Vänligen ange fakturanummer ({invoice_number}) som referens vid betalning.<br/>
    Please use invoice number ({invoice_number}) as reference when making payment.<br/>
    Molimo navedite broj fakture ({invoice_number}) kao referencu pri plaćanju.
    </font>
    """
    
    content.append(Paragraph(footer_text, ParagraphStyle('Footer', alignment=TA_CENTER, fontSize=8, textColor=colors.grey)))
    
    # ===== DECORATIVE BOTTOM LINE =====
    content.append(Spacer(1, 5*mm))
    content.append(line_table)
    
    # Build PDF
    doc.build(content)
    
    return output_path


def update_bank_details(
    bank_name: str = None,
    iban: str = None,
    bic_swift: str = None,
    bankgiro: str = None,
    org_number: str = None
):
    """Update bank details for future invoices"""
    global BANK_DETAILS
    if bank_name:
        BANK_DETAILS['bank_name'] = bank_name
    if iban:
        BANK_DETAILS['iban'] = iban
    if bic_swift:
        BANK_DETAILS['bic_swift'] = bic_swift
    if bankgiro:
        BANK_DETAILS['bankgiro'] = bankgiro
    if org_number:
        BANK_DETAILS['org_number'] = org_number


# Test function
if __name__ == "__main__":
    output = generate_invoice_pdf(
        invoice_id="INV-2024-001234",
        member_name="Test Member",
        member_email="test@example.com",
        description="Medlemsavgift 2024 / Membership Fee 2024",
        amount=500.00,
        currency="SEK",
        due_date="2024-12-31",
        created_at="2024-11-15T10:30:00Z",
        output_path="/tmp/test_invoice.pdf",
        status="unpaid"
    )
    print(f"Generated: {output}")
