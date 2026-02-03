FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including fonts for PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with optimizations
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directories with proper permissions
RUN mkdir -p /app/uploads/invoices /app/uploads/gallery /app/uploads/branding /app/uploads/events /app/uploads/news \
    && chmod -R 755 /app/uploads

# Set environment variables for production
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=1

EXPOSE 8001

# Use multiple workers for production
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--loop", "uvloop", "--http", "httptools"]
