"""
Image Optimization Utility
Compresses and converts images to WebP format for better performance
"""

from PIL import Image
from pathlib import Path
import io
import logging

logger = logging.getLogger(__name__)

# Maximum dimensions for different use cases
MAX_DIMENSIONS = {
    'news': (1200, 900),      # News article images
    'gallery': (1920, 1080),  # Gallery images
    'logo': (400, 400),       # Logo images
    'hero': (1920, 1080),     # Hero background
    'thumbnail': (400, 300),  # Thumbnails
}

# Quality settings (0-100)
QUALITY_SETTINGS = {
    'high': 85,
    'medium': 75,
    'low': 60,
    'thumbnail': 70,
}


def optimize_image(
    input_path: str | Path,
    output_path: str | Path = None,
    max_width: int = 1200,
    max_height: int = 900,
    quality: int = 80,
    convert_to_webp: bool = True
) -> tuple[Path, dict]:
    """
    Optimize an image by resizing and compressing it.
    
    Args:
        input_path: Path to the source image
        output_path: Path for the optimized image (optional, auto-generated if not provided)
        max_width: Maximum width for the image
        max_height: Maximum height for the image
        quality: Compression quality (1-100)
        convert_to_webp: Whether to convert to WebP format
        
    Returns:
        Tuple of (output_path, stats_dict)
    """
    input_path = Path(input_path)
    
    if not input_path.exists():
        raise FileNotFoundError(f"Image not found: {input_path}")
    
    # Open image
    with Image.open(input_path) as img:
        original_size = input_path.stat().st_size
        original_dimensions = img.size
        
        # Convert RGBA to RGB for JPEG/WebP compatibility
        if img.mode in ('RGBA', 'P'):
            # Create white background for transparency
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if needed (maintain aspect ratio)
        width, height = img.size
        if width > max_width or height > max_height:
            ratio = min(max_width / width, max_height / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        new_dimensions = img.size
        
        # Determine output path and format
        if output_path:
            output_path = Path(output_path)
        else:
            if convert_to_webp:
                output_path = input_path.with_suffix('.webp')
            else:
                output_path = input_path
        
        # Save optimized image
        if convert_to_webp or output_path.suffix.lower() == '.webp':
            img.save(output_path, 'WEBP', quality=quality, method=6)
        elif output_path.suffix.lower() in ('.jpg', '.jpeg'):
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
        elif output_path.suffix.lower() == '.png':
            img.save(output_path, 'PNG', optimize=True)
        else:
            img.save(output_path, quality=quality)
        
        new_size = output_path.stat().st_size
        
        stats = {
            'original_size': original_size,
            'optimized_size': new_size,
            'savings_bytes': original_size - new_size,
            'savings_percent': round((1 - new_size / original_size) * 100, 1) if original_size > 0 else 0,
            'original_dimensions': original_dimensions,
            'new_dimensions': new_dimensions,
            'format': output_path.suffix[1:].upper()
        }
        
        logger.info(f"Optimized {input_path.name}: {original_size/1024:.1f}KB -> {new_size/1024:.1f}KB ({stats['savings_percent']}% saved)")
        
        return output_path, stats


def optimize_image_bytes(
    image_bytes: bytes,
    filename: str,
    max_width: int = 1200,
    max_height: int = 900,
    quality: int = 80,
    convert_to_webp: bool = True
) -> tuple[bytes, str, dict]:
    """
    Optimize image from bytes.
    
    Args:
        image_bytes: Raw image bytes
        filename: Original filename (for extension detection)
        max_width: Maximum width
        max_height: Maximum height
        quality: Compression quality
        convert_to_webp: Whether to convert to WebP
        
    Returns:
        Tuple of (optimized_bytes, new_filename, stats_dict)
    """
    original_size = len(image_bytes)
    
    # Open image from bytes
    with Image.open(io.BytesIO(image_bytes)) as img:
        original_dimensions = img.size
        
        # Convert RGBA to RGB
        if img.mode in ('RGBA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if needed
        width, height = img.size
        if width > max_width or height > max_height:
            ratio = min(max_width / width, max_height / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        new_dimensions = img.size
        
        # Save to bytes
        output = io.BytesIO()
        if convert_to_webp:
            img.save(output, 'WEBP', quality=quality, method=6)
            new_ext = '.webp'
        else:
            ext = Path(filename).suffix.lower()
            if ext in ('.jpg', '.jpeg'):
                img.save(output, 'JPEG', quality=quality, optimize=True)
                new_ext = ext
            elif ext == '.png':
                img.save(output, 'PNG', optimize=True)
                new_ext = '.png'
            else:
                img.save(output, 'WEBP', quality=quality, method=6)
                new_ext = '.webp'
        
        optimized_bytes = output.getvalue()
        new_size = len(optimized_bytes)
        
        # Generate new filename
        original_stem = Path(filename).stem
        new_filename = f"{original_stem}{new_ext}"
        
        stats = {
            'original_size': original_size,
            'optimized_size': new_size,
            'savings_bytes': original_size - new_size,
            'savings_percent': round((1 - new_size / original_size) * 100, 1) if original_size > 0 else 0,
            'original_dimensions': original_dimensions,
            'new_dimensions': new_dimensions,
            'format': new_ext[1:].upper()
        }
        
        return optimized_bytes, new_filename, stats


def create_thumbnail(
    input_path: str | Path,
    output_path: str | Path = None,
    size: tuple[int, int] = (400, 300),
    quality: int = 70
) -> Path:
    """
    Create a thumbnail from an image.
    
    Args:
        input_path: Path to the source image
        output_path: Path for the thumbnail (auto-generated if not provided)
        size: Thumbnail dimensions (width, height)
        quality: Compression quality
        
    Returns:
        Path to the thumbnail
    """
    input_path = Path(input_path)
    
    if output_path:
        output_path = Path(output_path)
    else:
        output_path = input_path.parent / f"{input_path.stem}_thumb.webp"
    
    with Image.open(input_path) as img:
        # Convert mode
        if img.mode in ('RGBA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Create thumbnail (maintains aspect ratio)
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save thumbnail
        img.save(output_path, 'WEBP', quality=quality, method=6)
    
    return output_path
