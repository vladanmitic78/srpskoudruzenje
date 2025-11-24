"""
Export utilities for PDF, XML, and Excel generation
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
import xml.etree.ElementTree as ET
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

def generate_members_pdf(members):
    """Generate PDF export of members"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#8B1F1F'),
        spaceAfter=30,
    )
    
    # Title
    title = Paragraph("Srpsko Kulturno Udruženje Täby - Members List", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Date
    date_text = Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}", styles['Normal'])
    elements.append(date_text)
    elements.append(Spacer(1, 0.3*inch))
    
    # Table data
    data = [['Full Name', 'Email', 'Phone', 'Address', 'Year of Birth', 'Verified']]
    
    for member in members:
        data.append([
            member.get('fullName', ''),
            member.get('email', ''),
            member.get('phone', ''),
            member.get('address', ''),
            member.get('yearOfBirth', ''),
            'Yes' if member.get('emailVerified') else 'No'
        ])
    
    # Create table
    table = Table(data, colWidths=[1.5*inch, 2*inch, 1.2*inch, 1.8*inch, 0.8*inch, 0.7*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C1272D')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_members_xml(members):
    """Generate XML export of members"""
    root = ET.Element('members')
    root.set('exported', datetime.utcnow().isoformat())
    root.set('count', str(len(members)))
    
    for member in members:
        member_elem = ET.SubElement(root, 'member')
        member_elem.set('id', str(member.get('_id', '')))
        
        # Add fields
        fields = ['fullName', 'email', 'phone', 'address', 'yearOfBirth', 
                  'parentName', 'parentEmail', 'parentPhone', 'username', 'role']
        
        for field in fields:
            if field in member and member[field]:
                field_elem = ET.SubElement(member_elem, field)
                field_elem.text = str(member[field])
        
        # Email verified
        verified_elem = ET.SubElement(member_elem, 'emailVerified')
        verified_elem.text = 'true' if member.get('emailVerified') else 'false'
        
        # Created date
        if 'createdAt' in member:
            created_elem = ET.SubElement(member_elem, 'createdAt')
            created_elem.text = member['createdAt'].isoformat() if hasattr(member['createdAt'], 'isoformat') else str(member['createdAt'])
    
    # Convert to string with pretty formatting
    tree = ET.ElementTree(root)
    buffer = BytesIO()
    tree.write(buffer, encoding='utf-8', xml_declaration=True)
    buffer.seek(0)
    return buffer

def generate_invoice_pdf(invoice, user):
    """Generate invoice PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Header
    title = Paragraph("INVOICE / FAKTURA", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.3*inch))
    
    # Organization details
    org_text = """
    <b>Srpsko Kulturno Udruženje Täby</b><br/>
    Täby Centrum 1, 183 30 Täby<br/>
    Org. nr: 802456-1234<br/>
    VAT: SE123456789001
    """
    org = Paragraph(org_text, styles['Normal'])
    elements.append(org)
    elements.append(Spacer(1, 0.3*inch))
    
    # Customer details
    customer_text = f"""
    <b>Bill To:</b><br/>
    {user.get('fullName', '')}<br/>
    {user.get('email', '')}<br/>
    {user.get('address', '')}
    """
    customer = Paragraph(customer_text, styles['Normal'])
    elements.append(customer)
    elements.append(Spacer(1, 0.3*inch))
    
    # Invoice details
    invoice_data = [
        ['Invoice ID', invoice.get('_id', '')],
        ['Description', invoice.get('description', '')],
        ['Due Date', invoice.get('dueDate', '')],
        ['Status', invoice.get('status', '').upper()],
        ['Amount', f"{invoice.get('amount', 0)} {invoice.get('currency', 'SEK')}"]
    ]
    
    invoice_table = Table(invoice_data, colWidths=[2*inch, 4*inch])
    invoice_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(invoice_table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Bank details
    bank_text = """
    <b>Payment Details:</b><br/>
    Bank Account: SE12 3456 7890 1234 5678 90<br/>
    Reference: Invoice ID above
    """
    bank = Paragraph(bank_text, styles['Normal'])
    elements.append(bank)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
