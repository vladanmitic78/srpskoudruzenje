"""
Cloudinary Service for Image Upload and Management
Provides persistent cloud storage for images across forks and deployments
"""
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
import time
import logging
from dotenv import load_dotenv
from pathlib import Path

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')

# Initialize Cloudinary configuration
def _configure_cloudinary():
    """Configure Cloudinary with environment variables"""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    
    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        logger.info(f"Cloudinary configured with cloud_name: {cloud_name}")
        return True
    return False

# Configure on module load
_configure_cloudinary()

class CloudinaryService:
    """Service class for handling all Cloudinary operations"""
    
    @staticmethod
    async def upload_image(
        file_content: bytes,
        filename: str,
        content_type: str = "general",
        folder: str = "skud_taby"
    ) -> dict:
        """
        Upload image to Cloudinary with automatic optimization
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            content_type: Type of content (story, gallery, news, etc.)
            folder: Cloudinary folder for organization
            
        Returns:
            Dictionary containing upload response with secure_url
        """
        try:
            # Generate unique public_id
            base_name = os.path.splitext(filename)[0]
            public_id = f"{content_type}_{base_name}_{int(time.time())}"
            
            # Upload to Cloudinary with optimization
            result = cloudinary.uploader.upload(
                file_content,
                folder=f"{folder}/{content_type}",
                public_id=public_id,
                resource_type="auto",
                overwrite=False,
                quality="auto:good",
                fetch_format="auto"
            )
            
            logger.info(f"Successfully uploaded image to Cloudinary: {result['public_id']}")
            
            return {
                'success': True,
                'public_id': result['public_id'],
                'secure_url': result['secure_url'],
                'url': result['url'],
                'width': result.get('width'),
                'height': result.get('height'),
                'bytes': result.get('bytes'),
                'format': result.get('format')
            }
            
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {str(e)}")
            raise Exception(f"Cloudinary upload failed: {str(e)}")
    
    @staticmethod
    def delete_image(public_id: str) -> dict:
        """Delete image from Cloudinary"""
        try:
            result = cloudinary.uploader.destroy(public_id)
            logger.info(f"Deleted image from Cloudinary: {public_id}")
            return {'success': True, 'result': result}
        except Exception as e:
            logger.error(f"Cloudinary deletion failed: {str(e)}")
            raise Exception(f"Cloudinary deletion failed: {str(e)}")
    
    @staticmethod
    def get_optimized_url(
        public_id: str,
        width: int = None,
        height: int = None,
        crop: str = "fill"
    ) -> str:
        """Generate optimized transformation URL"""
        transformations = []
        
        if width or height:
            transform = {'crop': crop}
            if width:
                transform['width'] = width
            if height:
                transform['height'] = height
            transformations.append(transform)
        
        # Add automatic optimization
        transformations.append({
            'quality': 'auto',
            'fetch_format': 'auto'
        })
        
        url = cloudinary.CloudinaryImage(public_id).build_url(
            transformation=transformations
        )
        return url


# Helper function to check if Cloudinary is configured
def is_cloudinary_configured() -> bool:
    """Check if Cloudinary credentials are set"""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    
    configured = all([cloud_name, api_key, api_secret])
    if configured:
        # Re-configure to ensure it's set
        _configure_cloudinary()
    return configured
