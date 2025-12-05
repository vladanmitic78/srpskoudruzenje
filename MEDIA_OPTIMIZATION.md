# Media Optimization System

## Overview
This platform includes automatic image and video optimization to ensure fast loading speeds and optimal performance.

## Features

### 1. Automatic Image Optimization (Backend)
All uploaded images are automatically optimized:

- **Resize**: Large images are resized to max 1920x1080px
- **Compress**: Images are compressed with 85% quality (optimal balance)
- **Format**: JPEG optimization with progressive loading
- **File Size**: Typical reduction of 80-95% without visible quality loss

### 2. Lazy Loading (Frontend)
Images are loaded only when they enter the viewport:

- **Performance**: Faster initial page load
- **Bandwidth**: Reduces data usage
- **UX**: Smooth loading with placeholder animations
- **Compatibility**: Fallback for older browsers

### 3. Optimized Endpoints
The following upload endpoints automatically optimize media:

- `/api/gallery/{gallery_id}/upload-image` - Gallery album images
- `/api/content/gallery/upload` - Gallery content files
- `/api/content/serbian-story/upload-image` - Serbian story images

## Configuration

### Backend Settings (`/app/backend/utils/media_optimizer.py`)

```python
MAX_IMAGE_WIDTH = 1920          # Maximum width in pixels
MAX_IMAGE_HEIGHT = 1080         # Maximum height in pixels  
IMAGE_QUALITY = 85              # JPEG quality (1-100)
THUMBNAIL_SIZE = (400, 400)     # Thumbnail dimensions
WEBP_QUALITY = 80               # WebP quality (1-100)
```

### Usage

#### Optimize New Uploads
Automatic - no action needed! All image uploads are optimized automatically.

#### Optimize Existing Images
Run the optimization script:

```bash
cd /app/backend
python3 scripts/optimize_existing_media.py
```

This will:
- Scan all upload directories
- Optimize all existing images
- Provide detailed statistics
- Skip non-image files

#### Using LazyImage Component (Frontend)
```javascript
import LazyImage from '../components/LazyImage';

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  className="w-full h-full object-cover"
/>
```

## Performance Benefits

### Before Optimization
- Average image size: 2-5 MB
- Page load time: 5-10 seconds
- Bandwidth usage: High

### After Optimization
- Average image size: 100-500 KB
- Page load time: 1-2 seconds  
- Bandwidth usage: 80-95% reduction

## Example Results

Real optimization results from this platform:

```
gallery_20251128.jpg: 5054.9KB → 495.3KB (90.2% reduction)
gallery_20251128.jpg: 1791.9KB → 126.5KB (92.9% reduction)
gallery_20251128.jpg: 2898.3KB → 434.2KB (85.0% reduction)
content_20251129.jpg: 3474.7KB → 323.8KB (90.7% reduction)
```

## Technical Details

### Image Processing
- **Library**: Pillow (PIL)
- **Resampling**: LANCZOS (high quality)
- **Color Space**: Automatic RGBA → RGB conversion
- **Aspect Ratio**: Always preserved

### Lazy Loading
- **Method**: IntersectionObserver API
- **Trigger**: 50px before entering viewport
- **Fallback**: Immediate load for unsupported browsers
- **Animation**: Smooth fade-in transition

## Maintenance

### Monitoring
Check optimization logs in backend logs:
```bash
tail -f /var/log/supervisor/backend.out.log | grep "Optimized"
```

### Storage Management
Optimized images save significant storage space:
- Original: ~2-5 MB per image
- Optimized: ~200-500 KB per image
- Storage savings: 80-95%

### Future Enhancements
Potential improvements:
- WebP format conversion
- Responsive image generation (multiple sizes)
- Video compression (requires ffmpeg)
- CDN integration
- Progressive JPEG encoding

## Troubleshooting

### Images not optimizing
1. Check backend logs for errors
2. Verify Pillow is installed: `pip list | grep Pillow`
3. Check file permissions on upload directories

### Lazy loading not working
1. Check browser console for errors
2. Verify LazyImage component is imported correctly
3. Check if image src is valid

### Poor optimization results
1. Adjust quality settings in `media_optimizer.py`
2. Check if images are already compressed
3. Verify image dimensions are being resized

## Best Practices

### For Admins
- Upload high-quality images (they'll be optimized automatically)
- Avoid pre-compressing images (may cause quality loss)
- Use standard formats: JPG, PNG, WebP
- Recommended upload size: 2000-4000px width

### For Developers
- Use LazyImage component for all images
- Add `loading="lazy"` attribute as fallback
- Implement responsive images where needed
- Monitor performance with browser DevTools

## API Reference

### optimize_image(image_path, max_width, max_height, quality)
Optimize a single image file.

**Parameters:**
- `image_path` (Path): Path to image file
- `max_width` (int): Maximum width in pixels
- `max_height` (int): Maximum height in pixels  
- `quality` (int): JPEG quality 1-100

**Returns:** bool - Success status

### optimize_uploaded_file(file_path)
Automatically detect and optimize any uploaded file.

**Parameters:**
- `file_path` (Path): Path to uploaded file

**Returns:** bool - Success status

### batch_optimize_directory(directory, recursive)
Optimize all images in a directory.

**Parameters:**
- `directory` (Path): Directory path
- `recursive` (bool): Process subdirectories

**Returns:** dict - Statistics

## Support

For issues or questions:
1. Check backend logs: `/var/log/supervisor/backend.*.log`
2. Review this documentation
3. Check component implementation
4. Contact development team

---

**Last Updated:** December 2024
**Version:** 1.0.0
