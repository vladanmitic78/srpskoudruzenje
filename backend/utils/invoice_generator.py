"""
Professional PDF Invoice Generator for SKUD Täby
Swedish-standard invoices aligned with Swedish law (Bokföringslagen)
All text in Swedish only. QR code for payment info.
"""

import os
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import qrcode

# Register DejaVu fonts for Swedish character support (å, ä, ö)
DEJAVU_FONT_PATH = "/usr/share/fonts/truetype/dejavu/"
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', f'{DEJAVU_FONT_PATH}DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{DEJAVU_FONT_PATH}DejaVuSans-Bold.ttf'))
    FONT_NORMAL = 'DejaVuSans'
    FONT_BOLD = 'DejaVuSans-Bold'
except Exception as e:
    print(f"Warning: Could not load DejaVu fonts: {e}")
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'

# Brand Colors
PRIMARY_COLOR = colors.HexColor('#C1272D')
DARK_COLOR = colors.HexColor('#333333')
GREY_COLOR = colors.HexColor('#666666')
LIGHT_BG = colors.HexColor('#F8F9FA')
BORDER_COLOR = colors.HexColor('#DDDDDD')

# Organization Details
ORG_DETAILS = {
    "name": "Serbiska Kulturföreningen i Täby",
    "name_short": "SKUD Täby",
    "address_line1": "",
    "address_line2": "Täby",
    "email": "info@srpskoudruzenjetaby.se",
    "website": "www.srpskoudruzenjetaby.se",
    "phone": "",
}

DEFAULT_BANK_DETAILS = {
    "bankName": "____________________",
    "accountHolder": "Serbiska Kulturföreningen i Täby",
    "iban": "SE__ ____ ____ ____ ____ ____",
    "bicSwift": "________",
    "bankgiro": "___-____",
    "orgNumber": "______-____",
    "vatNumber": "",
    "swish": "",
}


def generate_payment_qr(bankgiro: str, amount: float, reference: str) -> io.BytesIO:
    """Generate QR code with Swedish payment information"""
    # Swedish Bankgiro payment string format
    payment_data = f"BG:{bankgiro};AMOUNT:{amount:.2f};REF:{reference}"
    
    qr = qrcode.QRCode(version=1, box_size=4, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(payment_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


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
    bank_details: dict = None,
    vat_rate: float = 0.0
) -> str:
    """Generate a Swedish-standard professional PDF invoice"""
    
    bd = bank_details or DEFAULT_BANK_DETAILS
    
    # Calculate VAT
    if vat_rate > 0:
        subtotal = amount / (1 + vat_rate / 100)
        vat_amount = amount - subtotal
    else:
        subtotal = amount
        vat_amount = 0
    
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        rightMargin=20*mm, leftMargin=20*mm,
        topMargin=15*mm, bottomMargin=20*mm
    )
    
    # Styles
    normal = ParagraphStyle('N', fontSize=10, fontName=FONT_NORMAL, textColor=DARK_COLOR, leading=14)
    bold = ParagraphStyle('B', fontSize=10, fontName=FONT_BOLD, textColor=DARK_COLOR, leading=14)
    small = ParagraphStyle('S', fontSize=8, fontName=FONT_NORMAL, textColor=GREY_COLOR, leading=11)
    small_bold = ParagraphStyle('SB', fontSize=8, fontName=FONT_BOLD, textColor=GREY_COLOR, leading=11)
    
    content = []
    
    # ===== HEADER =====
    org_info = f"""<font face="{FONT_BOLD}" size="16" color="#{PRIMARY_COLOR.hexval()[2:]}">SKUD Täby</font><br/>
<font face="{FONT_NORMAL}" size="9" color="#666666">Serbiska Kulturföreningen i Täby</font>"""
    
    invoice_label = f"""<font face="{FONT_BOLD}" size="22" color="#{PRIMARY_COLOR.hexval()[2:]}">Faktura</font>"""
    
    header_data = [[
        Paragraph(org_info, normal),
        '',
        Paragraph(invoice_label, ParagraphStyle('R', alignment=TA_RIGHT, fontSize=10, fontName=FONT_NORMAL))
    ]]
    header_table = Table(header_data, colWidths=[90*mm, 20*mm, 60*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    content.append(header_table)
    content.append(Spacer(1, 3*mm))
    
    # Thin red line
    line = Table([['', '', '']], colWidths=[56.7*mm, 56.7*mm, 56.7*mm], rowHeights=[1.5*mm])
    line.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), PRIMARY_COLOR),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#0C4DA2')),
        ('BACKGROUND', (2, 0), (2, 0), colors.white),
        ('LINEBELOW', (2, 0), (2, 0), 0.5, BORDER_COLOR),
    ]))
    content.append(line)
    content.append(Spacer(1, 8*mm))
    
    # ===== INVOICE INFO + MEMBER INFO =====
    invoice_number = invoice_id[-12:].upper() if len(invoice_id) > 12 else invoice_id.upper()
    
    try:
        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).strftime('%Y-%m-%d')
    except Exception:
        created_date = created_at[:10] if created_at else datetime.now().strftime('%Y-%m-%d')
    
    status_color = "#28a745" if status == "paid" else "#dc3545"
    status_text = "BETALD" if status == "paid" else "OBETALD"
    
    # Left: Member info
    member_left = f"""<font face="{FONT_BOLD}" size="9" color="#999999">MEDLEM:</font><br/><br/>
<font face="{FONT_BOLD}" size="11">{member_name}</font><br/>
<font face="{FONT_NORMAL}" size="10">{member_email}</font>"""

    # Right: Invoice details
    info_right = f"""<font face="{FONT_BOLD}" size="9" color="#999999">FAKTURAINFORMATION:</font><br/><br/>
<font face="{FONT_NORMAL}" size="10"><font face="{FONT_BOLD}">Fakturanummer:</font> {invoice_number}</font><br/>
<font face="{FONT_NORMAL}" size="10"><font face="{FONT_BOLD}">Fakturadatum:</font> {created_date}</font><br/>
<font face="{FONT_NORMAL}" size="10"><font face="{FONT_BOLD}">Förfallodatum:</font> {due_date}</font><br/>
<font face="{FONT_BOLD}" size="10">Status: <font color="{status_color}">{status_text}</font></font>"""
    
    if payment_date and status == "paid":
        info_right += f"""<br/><font face="{FONT_NORMAL}" size="10"><font face="{FONT_BOLD}">Betalningsdatum:</font> {payment_date}</font>"""
    
    info_table = Table([
        [Paragraph(member_left, normal), Paragraph(info_right, normal)]
    ], colWidths=[85*mm, 85*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    content.append(info_table)
    content.append(Spacer(1, 10*mm))
    
    # ===== ITEM TABLE =====
    # Table header: Art.nr | Beskrivning | Antal | Enhet | À-pris | Summa
    items_header = [
        Paragraph(f'<font face="{FONT_BOLD}" size="9" color="#FFFFFF">Beskrivning</font>', normal),
        Paragraph(f'<font face="{FONT_BOLD}" size="9" color="#FFFFFF">Antal</font>', ParagraphStyle('RC', alignment=TA_CENTER, fontName=FONT_BOLD)),
        Paragraph(f'<font face="{FONT_BOLD}" size="9" color="#FFFFFF">Enhet</font>', ParagraphStyle('RC2', alignment=TA_CENTER, fontName=FONT_BOLD)),
        Paragraph(f'<font face="{FONT_BOLD}" size="9" color="#FFFFFF">À-pris</font>', ParagraphStyle('RR', alignment=TA_RIGHT, fontName=FONT_BOLD)),
        Paragraph(f'<font face="{FONT_BOLD}" size="9" color="#FFFFFF">Summa</font>', ParagraphStyle('RR2', alignment=TA_RIGHT, fontName=FONT_BOLD)),
    ]
    
    items_row = [
        Paragraph(f'<font face="{FONT_NORMAL}" size="10">{description}</font>', normal),
        Paragraph(f'<font face="{FONT_NORMAL}" size="10">1</font>', ParagraphStyle('DC', alignment=TA_CENTER, fontName=FONT_NORMAL)),
        Paragraph(f'<font face="{FONT_NORMAL}" size="10">st</font>', ParagraphStyle('DC2', alignment=TA_CENTER, fontName=FONT_NORMAL)),
        Paragraph(f'<font face="{FONT_NORMAL}" size="10">{subtotal:,.2f}</font>', ParagraphStyle('DR', alignment=TA_RIGHT, fontName=FONT_NORMAL)),
        Paragraph(f'<font face="{FONT_NORMAL}" size="10">{subtotal:,.2f}</font>', ParagraphStyle('DR2', alignment=TA_RIGHT, fontName=FONT_NORMAL)),
    ]
    
    items_table = Table([items_header, items_row], colWidths=[75*mm, 20*mm, 20*mm, 27.5*mm, 27.5*mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_BG),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))
    content.append(items_table)
    content.append(Spacer(1, 5*mm))
    
    # ===== TOTALS =====
    totals_rows = []
    
    if vat_rate > 0:
        totals_rows.append([
            Paragraph(f'<font face="{FONT_NORMAL}" size="10">Exkl. moms:</font>', ParagraphStyle('TR', alignment=TA_RIGHT, fontName=FONT_NORMAL)),
            Paragraph(f'<font face="{FONT_NORMAL}" size="10">{subtotal:,.2f} {currency}</font>', ParagraphStyle('TV', alignment=TA_RIGHT, fontName=FONT_NORMAL))
        ])
        totals_rows.append([
            Paragraph(f'<font face="{FONT_NORMAL}" size="10" color="#666666">Moms ({vat_rate:.0f}%):</font>', ParagraphStyle('TR2', alignment=TA_RIGHT, fontName=FONT_NORMAL)),
            Paragraph(f'<font face="{FONT_NORMAL}" size="10" color="#666666">{vat_amount:,.2f} {currency}</font>', ParagraphStyle('TV2', alignment=TA_RIGHT, fontName=FONT_NORMAL))
        ])
        totals_rows.append([
            Paragraph(f'<font face="{FONT_NORMAL}" size="10" color="#666666">Avrundning:</font>', ParagraphStyle('TR3', alignment=TA_RIGHT, fontName=FONT_NORMAL)),
            Paragraph(f'<font face="{FONT_NORMAL}" size="10" color="#666666">0,00 {currency}</font>', ParagraphStyle('TV3', alignment=TA_RIGHT, fontName=FONT_NORMAL))
        ])
    
    # Total row - always shown
    totals_rows.append([
        Paragraph(f'<font face="{FONT_BOLD}" size="11">Att betala:</font>', ParagraphStyle('TTR', alignment=TA_RIGHT, fontName=FONT_BOLD)),
        Paragraph(f'<font face="{FONT_BOLD}" size="14" color="#{PRIMARY_COLOR.hexval()[2:]}">{amount:,.2f} {currency}</font>', ParagraphStyle('TTV', alignment=TA_RIGHT, fontName=FONT_BOLD))
    ])
    
    totals_table = Table(totals_rows, colWidths=[100*mm, 70*mm])
    total_row_idx = len(totals_rows) - 1
    style_commands = [
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, total_row_idx), (-1, total_row_idx), colors.HexColor('#FFF3CD')),
        ('BOTTOMPADDING', (0, total_row_idx), (-1, total_row_idx), 10),
        ('TOPPADDING', (0, total_row_idx), (-1, total_row_idx), 10),
        ('BOX', (0, total_row_idx), (-1, total_row_idx), 1, colors.HexColor('#D4AF37')),
    ]
    totals_table.setStyle(TableStyle(style_commands))
    content.append(totals_table)
    content.append(Spacer(1, 10*mm))
    
    # ===== PAYMENT INFO WITH QR CODE =====
    content.append(Paragraph(
        f'<font face="{FONT_BOLD}" size="12" color="#{PRIMARY_COLOR.hexval()[2:]}">Betalningsinformation</font>',
        ParagraphStyle('PayHeader', spaceBefore=3*mm, spaceAfter=3*mm, fontName=FONT_BOLD)
    ))
    
    # Generate QR code
    bankgiro = bd.get('bankgiro', '___-____')
    qr_buffer = generate_payment_qr(bankgiro, amount, invoice_number)
    qr_image = Image(qr_buffer, width=28*mm, height=28*mm)
    
    # Build bank info text
    swish_line = ""
    if bd.get('swish'):
        swish_line = f"""<font face="{FONT_BOLD}">Swish:</font> {bd.get('swish')}<br/>"""
    
    vat_line = ""
    if bd.get('vatNumber'):
        vat_line = f"""<font face="{FONT_BOLD}">Momsreg.nr:</font> {bd.get('vatNumber')}<br/>"""
    
    bank_text = f"""<font face="{FONT_NORMAL}" size="10">
<font face="{FONT_BOLD}">Förfallodatum:</font> {due_date}<br/>
<font face="{FONT_BOLD}">Bankgiro:</font> {bankgiro}<br/>
<font face="{FONT_BOLD}">Bank:</font> {bd.get('bankName', '____________________')}<br/>
<font face="{FONT_BOLD}">Kontoinnehavare:</font> {bd.get('accountHolder', 'Serbiska Kulturföreningen i Täby')}<br/>
<font face="{FONT_BOLD}">IBAN:</font> {bd.get('iban', 'SE__ ____ ____ ____ ____ ____')}<br/>
<font face="{FONT_BOLD}">BIC/SWIFT:</font> {bd.get('bicSwift', '________')}<br/>
{swish_line}<font face="{FONT_BOLD}">Org.nummer:</font> {bd.get('orgNumber', '______-____')}<br/>
{vat_line}<font face="{FONT_BOLD}">OCR/Referens:</font> {invoice_number}<br/>
<font face="{FONT_NORMAL}" size="8" color="#666666">Anges vid betalning.</font>
</font>"""
    
    att_betala = f"""<font face="{FONT_BOLD}" size="12">Att betala</font><br/>
<font face="{FONT_BOLD}" size="16" color="#{PRIMARY_COLOR.hexval()[2:]}">{amount:,.2f} {currency}</font>"""
    
    # Payment table: [QR | Bank Info | Amount]
    payment_table = Table([
        [qr_image, Paragraph(bank_text, normal), Paragraph(att_betala, ParagraphStyle('AttBetala', alignment=TA_RIGHT, fontName=FONT_BOLD, leading=20))]
    ], colWidths=[32*mm, 95*mm, 43*mm])
    payment_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F4F8')),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    content.append(payment_table)
    content.append(Spacer(1, 8*mm))
    
    # ===== LATE PAYMENT NOTE =====
    content.append(Paragraph(
        f'<font face="{FONT_NORMAL}" size="8" color="#666666"><font face="{FONT_BOLD}">Dröjsmålsränta:</font> Vid betalning efter förfallodagen debiteras ränta enligt räntelagen.</font>',
        small
    ))
    content.append(Spacer(1, 5*mm))
    
    # ===== FOOTER =====
    org_nr = bd.get('orgNumber', '______-____')
    footer_text = f"""<font face="{FONT_BOLD}" size="8" color="#666666">Serbiska Kulturföreningen i Täby</font><br/>
<font face="{FONT_NORMAL}" size="8" color="#666666">{ORG_DETAILS.get('address_line2', 'Täby')} | {ORG_DETAILS['email']} | {ORG_DETAILS['website']}</font><br/>
<font face="{FONT_NORMAL}" size="8" color="#666666">Organisationsnr: {org_nr} | Godkänd för F-skatt</font><br/><br/>
<font face="{FONT_NORMAL}" size="8" color="#666666">Vänligen ange fakturanummer ({invoice_number}) som referens vid betalning.</font>"""
    
    content.append(Paragraph(footer_text, ParagraphStyle('Footer', alignment=TA_CENTER, fontSize=8, textColor=GREY_COLOR, fontName=FONT_NORMAL)))
    
    # Bottom decorative line
    content.append(Spacer(1, 3*mm))
    content.append(line)
    
    doc.build(content)
    return output_path


if __name__ == "__main__":
    test_bank_details = {
        "bankName": "Swedbank",
        "accountHolder": "Serbiska Kulturföreningen i Täby",
        "iban": "SE12 3456 7890 1234 5678 90",
        "bicSwift": "SWEDSESS",
        "bankgiro": "123-4567",
        "orgNumber": "802123-4567",
        "vatNumber": "SE802123456701",
        "swish": "123 456 78 90"
    }
    
    output = generate_invoice_pdf(
        invoice_id="INV-2024-001234",
        member_name="Test Medlem",
        member_email="test@example.com",
        description="Medlemsavgift 2024",
        amount=500.00,
        currency="SEK",
        due_date="2024-12-31",
        created_at="2024-11-15T10:30:00Z",
        output_path="/tmp/test_invoice.pdf",
        status="unpaid",
        bank_details=test_bank_details,
        vat_rate=25.0
    )
    print(f"Generated: {output}")
