"""
Professional PDF Credit Note Generator for SKUD Täby
Generates credit notes for cancelled/refunded invoices
"""

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register DejaVu fonts for Serbian Latin character support
DEJAVU_FONT_PATH = "/usr/share/fonts/truetype/dejavu/"
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', f'{DEJAVU_FONT_PATH}DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{DEJAVU_FONT_PATH}DejaVuSans-Bold.ttf'))
    FONT_NORMAL = 'DejaVuSans'
    FONT_BOLD = 'DejaVuSans-Bold'
except Exception as e:
    print(f"Warning: Could not load DejaVu fonts, falling back to Helvetica: {e}")
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'

# SKUD Täby Brand Colors
PRIMARY_COLOR = colors.HexColor('#C1272D')  # Serbian Red
CREDIT_COLOR = colors.HexColor('#28a745')  # Green for credit
SECONDARY_COLOR = colors.HexColor('#6c757d')  # Gray

# Organization Details
ORG_DETAILS = {
    "name": "Srpsko Kulturno Udruženje Täby",
    "name_short": "SKUD Täby",
    "address": "Täby, Sweden",
    "email": "info@srpskoudruzenjetaby.se",
    "website": "www.srpskoudruzenjetaby.se",
}


def generate_credit_note_pdf(
    credit_note_id: str,
    credit_note_number: str,
    original_invoice_id: str,
    member_name: str,
    member_email: str,
    original_description: str,
    original_amount: float,
    currency: str,
    reason: str,
    created_at: str,
    created_by: str,
    output_path: str,
    bank_details: dict = None
) -> str:
    """
    Generate a professional PDF credit note
    
    Returns: Path to generated PDF file
    """
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CreditNoteTitle',
        parent=styles['Heading1'],
        fontName=FONT_BOLD,
        fontSize=24,
        textColor=CREDIT_COLOR,
        alignment=TA_CENTER,
        spaceAfter=5*mm
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=12,
        textColor=SECONDARY_COLOR,
        alignment=TA_CENTER,
        spaceAfter=10*mm
    )
    
    header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName=FONT_BOLD,
        fontSize=12,
        textColor=PRIMARY_COLOR,
        spaceBefore=8*mm,
        spaceAfter=3*mm
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=10,
        leading=14
    )
    
    bold_style = ParagraphStyle(
        'CustomBold',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=10,
        leading=14
    )
    
    # Title
    elements.append(Paragraph("KNJIŽNO ODOBRENJE", title_style))
    elements.append(Paragraph("KREDITFAKTURA / CREDIT NOTE", subtitle_style))
    
    elements.append(Spacer(1, 5*mm))
    
    # Credit Note Details Box
    credit_info = [
        [Paragraph(f"<b>Broj / Number:</b>", normal_style), 
         Paragraph(f"<b>{credit_note_number}</b>", bold_style)],
        [Paragraph(f"<b>Za fakturu / For Invoice:</b>", normal_style), 
         Paragraph(f"{original_invoice_id}", normal_style)],
        [Paragraph(f"<b>Datum / Date:</b>", normal_style), 
         Paragraph(f"{created_at[:10] if len(created_at) > 10 else created_at}", normal_style)],
    ]
    
    info_table = Table(credit_info, colWidths=[6*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e8f5e9')),
        ('BOX', (0, 0), (-1, -1), 1, CREDIT_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#c8e6c9')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(info_table)
    
    elements.append(Spacer(1, 8*mm))
    
    # Member Information
    elements.append(Paragraph("Podaci o članu / Member Information", header_style))
    
    member_data = [
        [Paragraph("<b>Ime / Name:</b>", normal_style), Paragraph(member_name, normal_style)],
        [Paragraph("<b>Email:</b>", normal_style), Paragraph(member_email, normal_style)],
    ]
    
    member_table = Table(member_data, colWidths=[4*cm, 12*cm])
    member_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.gray),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(member_table)
    
    elements.append(Spacer(1, 8*mm))
    
    # Credit Details
    elements.append(Paragraph("Detalji odobrenja / Credit Details", header_style))
    
    credit_details = [
        [Paragraph("<b>Opis / Description</b>", bold_style), 
         Paragraph("<b>Iznos / Amount</b>", bold_style)],
        [Paragraph(f"Kredit za: {original_description}", normal_style), 
         Paragraph(f"<b>-{original_amount:.2f} {currency}</b>", bold_style)],
    ]
    
    details_table = Table(credit_details, colWidths=[12*cm, 4*cm])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), CREDIT_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
        ('BOX', (0, 0), (-1, -1), 1, CREDIT_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(details_table)
    
    elements.append(Spacer(1, 5*mm))
    
    # Total Credit
    total_data = [
        [Paragraph("<b>UKUPNO ODOBRENJE / TOTAL CREDIT:</b>", bold_style), 
         Paragraph(f"<b>-{original_amount:.2f} {currency}</b>", 
                   ParagraphStyle('TotalAmount', parent=bold_style, fontSize=14, textColor=CREDIT_COLOR))],
    ]
    
    total_table = Table(total_data, colWidths=[12*cm, 4*cm])
    total_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#d4edda')),
        ('BOX', (0, 0), (-1, -1), 2, CREDIT_COLOR),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(total_table)
    
    elements.append(Spacer(1, 8*mm))
    
    # Reason for Credit
    elements.append(Paragraph("Razlog / Reason", header_style))
    
    reason_style = ParagraphStyle(
        'Reason',
        parent=normal_style,
        backColor=colors.HexColor('#fff3cd'),
        borderPadding=10,
        borderColor=colors.HexColor('#ffc107'),
        borderWidth=1,
    )
    
    reason_data = [[Paragraph(f"<i>{reason}</i>", normal_style)]]
    reason_table = Table(reason_data, colWidths=[16*cm])
    reason_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff3cd')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#ffc107')),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(reason_table)
    
    elements.append(Spacer(1, 10*mm))
    
    # Authorized By
    elements.append(Paragraph("Odobreno od / Authorized By", header_style))
    elements.append(Paragraph(f"{created_by}", normal_style))
    
    elements.append(Spacer(1, 15*mm))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontName=FONT_NORMAL,
        fontSize=8,
        textColor=colors.gray,
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph("─" * 60, footer_style))
    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph(f"{ORG_DETAILS['name']}", footer_style))
    elements.append(Paragraph(f"{ORG_DETAILS['email']} | {ORG_DETAILS['website']}", footer_style))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        "Ovaj dokument je automatski generisan i važi bez potpisa. / "
        "Detta dokument är automatiskt genererat och giltigt utan underskrift.",
        footer_style
    ))
    
    # Build the PDF
    doc.build(elements)
    
    return output_path
