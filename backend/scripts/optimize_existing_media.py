#!/usr/bin/env python3
"""
Script to optimize all existing uploaded media files
Run this once to optimize images that were uploaded before optimization was implemented
"""
import sys
import os
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.media_optimizer import batch_optimize_directory
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Optimize all existing media in uploads directory"""
    
    upload_dirs = [
        Path("/app/uploads/gallery"),
        Path("/app/uploads/content"),
        Path("/app/uploads/branding"),
    ]
    
    total_stats = {
        'total': 0,
        'optimized': 0,
        'failed': 0,
        'skipped': 0
    }
    
    logger.info("=" * 60)
    logger.info("Starting bulk media optimization...")
    logger.info("=" * 60)
    
    for directory in upload_dirs:
        if not directory.exists():
            logger.warning(f"Directory does not exist: {directory}")
            continue
        
        logger.info(f"\nProcessing directory: {directory}")
        logger.info("-" * 60)
        
        stats = batch_optimize_directory(directory, recursive=True)
        
        # Update totals
        for key in total_stats:
            total_stats[key] += stats[key]
        
        logger.info(f"Directory stats: {stats}")
    
    logger.info("\n" + "=" * 60)
    logger.info("Bulk optimization complete!")
    logger.info("=" * 60)
    logger.info(f"Total files processed: {total_stats['total']}")
    logger.info(f"Successfully optimized: {total_stats['optimized']}")
    logger.info(f"Failed: {total_stats['failed']}")
    logger.info(f"Skipped: {total_stats['skipped']}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
