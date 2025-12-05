"""
Media Optimization Utility
Automatically optimizes images and videos for web delivery
"""
import os
import logging
from pathlib import Path
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Optimization settings
MAX_IMAGE_WIDTH = 1920
MAX_IMAGE_HEIGHT = 1080
IMAGE_QUALITY = 85
THUMBNAIL_SIZE = (400, 400)
WEBP_QUALITY = 80


def optimize_image(image_path: Path, max_width: int = MAX_IMAGE_WIDTH, max_height: int = MAX_IMAGE_HEIGHT, quality: int = IMAGE_QUALITY) -> bool:
    """
    Optimize an image file for web delivery
    - Resize if larger than max dimensions
    - Convert to optimized format
    - Reduce file size while maintaining quality
    
    Args:
        image_path: Path to the image file
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: JPEG/WebP quality (1-100)
    
    Returns:
        bool: True if optimization succeeded, False otherwise
    """
    try:
        # Check if file exists
        if not image_path.exists():
            logger.error(f"Image file not found: {image_path}")
            return False
        
        # Get original file size
        original_size = image_path.stat().st_size
        
        # Open image
        with Image.open(image_path) as img:
            # Convert RGBA to RGB if needed (for JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            
            # Get current dimensions
            width, height = img.size
            
            # Calculate new dimensions if image is too large
            if width > max_width or height > max_height:
                # Calculate aspect ratio
                aspect_ratio = width / height
                
                if width > height:
                    new_width = min(width, max_width)
                    new_height = int(new_width / aspect_ratio)
                else:
                    new_height = min(height, max_height)
                    new_width = int(new_height * aspect_ratio)
                
                # Resize image with high-quality resampling
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logger.info(f"Resized image from {width}x{height} to {new_width}x{new_height}")
            
            # Optimize and save
            img.save(
                image_path,
                optimize=True,
                quality=quality,
                format='JPEG' if str(image_path).lower().endswith(('.jpg', '.jpeg')) else None
            )
        
        # Get optimized file size
        optimized_size = image_path.stat().st_size
        reduction = ((original_size - optimized_size) / original_size) * 100
        
        logger.info(f"Optimized {image_path.name}: {original_size/1024:.1f}KB → {optimized_size/1024:.1f}KB ({reduction:.1f}% reduction)")
        return True
        
    except Exception as e:
        logger.error(f"Failed to optimize image {image_path}: {str(e)}")
        return False


def create_thumbnail(image_path: Path, thumbnail_size: tuple = THUMBNAIL_SIZE) -> Path:
    """
    Create a thumbnail version of an image
    
    Args:
        image_path: Path to the original image
        thumbnail_size: Tuple of (width, height) for thumbnail
    
    Returns:
        Path to the thumbnail file
    """
    try:
        # Generate thumbnail filename
        thumbnail_path = image_path.parent / f"{image_path.stem}_thumb{image_path.suffix}"
        
        with Image.open(image_path) as img:
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            
            # Create thumbnail
            img.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
            
            # Save thumbnail
            img.save(thumbnail_path, optimize=True, quality=IMAGE_QUALITY)
        
        logger.info(f"Created thumbnail: {thumbnail_path.name}")
        return thumbnail_path
        
    except Exception as e:
        logger.error(f"Failed to create thumbnail for {image_path}: {str(e)}")
        return image_path


def optimize_uploaded_file(file_path: Path) -> bool:
    """
    Automatically optimize an uploaded file
    Detects file type and applies appropriate optimization
    
    Args:
        file_path: Path to the uploaded file
    
    Returns:
        bool: True if optimization succeeded
    """
    try:
        file_extension = file_path.suffix.lower()
        
        # Image optimization
        if file_extension in ['.jpg', '.jpeg', '.png', '.webp']:
            return optimize_image(file_path)
        
        # Video optimization would go here (requires ffmpeg)
        elif file_extension in ['.mp4', '.webm', '.mov', '.avi']:
            logger.info(f"Video optimization not yet implemented for {file_path.name}")
            return True
        
        else:
            logger.info(f"No optimization needed for {file_path.name}")
            return True
            
    except Exception as e:
        logger.error(f"Failed to optimize file {file_path}: {str(e)}")
        return False


def batch_optimize_directory(directory: Path, recursive: bool = True) -> dict:
    """
    Optimize all images in a directory
    
    Args:
        directory: Path to the directory
        recursive: Whether to process subdirectories
    
    Returns:
        dict: Statistics about the optimization
    """
    stats = {
        'total': 0,
        'optimized': 0,
        'failed': 0,
        'skipped': 0
    }
    
    try:
        pattern = '**/*' if recursive else '*'
        
        for file_path in directory.glob(pattern):
            if not file_path.is_file():
                continue
            
            file_extension = file_path.suffix.lower()
            
            if file_extension in ['.jpg', '.jpeg', '.png', '.webp']:
                stats['total'] += 1
                
                if optimize_image(file_path):
                    stats['optimized'] += 1
                else:
                    stats['failed'] += 1
            else:
                stats['skipped'] += 1
        
        logger.info(f"Batch optimization complete: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Failed to batch optimize directory {directory}: {str(e)}")
        return stats
