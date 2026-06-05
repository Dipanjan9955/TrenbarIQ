"""
Image processing module for chart analysis.
Handles compression, resizing, and OCR extraction to optimize API usage.
"""

import os
import hashlib
import logging
from pathlib import Path
from PIL import Image
import cv2
import pytesseract

logger = logging.getLogger(__name__)

# Configure pytesseract path (adjust if Tesseract is installed elsewhere)
# On Windows: pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# On Linux/Mac: usually auto-detected

class ImageProcessor:
    """Optimizes chart images for API consumption while preserving trading information."""
    
    MAX_IMAGE_SIZE = (1280, 720)  # Width x Height in pixels
    COMPRESSION_QUALITY = 75  # JPEG quality 0-100
    MAX_FILE_SIZE_MB = 2  # Max file size in MB
    CACHE_DIR = "analysis_cache"
    
    def __init__(self):
        """Initialize image processor."""
        os.makedirs(self.CACHE_DIR, exist_ok=True)
    
    @staticmethod
    def get_image_hash(image_path: str) -> str:
        """
        Generate MD5 hash of image file for duplicate detection.
        Returns: hex string hash
        """
        hash_md5 = hashlib.md5()
        with open(image_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    @staticmethod
    def validate_image(image_path: str) -> tuple[bool, str]:
        """
        Validate image file is readable and not corrupted.
        Returns: (is_valid, error_message)
        """
        try:
            if not os.path.exists(image_path):
                return False, "Image file not found"
            
            file_size_mb = os.path.getsize(image_path) / (1024 * 1024)
            if file_size_mb > ImageProcessor.MAX_FILE_SIZE_MB:
                return False, f"Image exceeds {ImageProcessor.MAX_FILE_SIZE_MB}MB limit"
            
            img = Image.open(image_path)
            img.verify()  # Verify file integrity
            return True, ""
        except Exception as e:
            return False, f"Invalid image: {str(e)}"
    
    @staticmethod
    def compress_image(image_path: str, output_path: str = None) -> tuple[bool, str]:
        """
        Resize and compress image to reduce API token usage.
        Preserves chart readability while reducing file size.
        Returns: (success, path_or_error)
        """
        try:
            img = Image.open(image_path)
            
            # Convert RGBA to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = rgb_img
            
            # Resize if larger than max dimensions
            img.thumbnail(ImageProcessor.MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
            
            # Save with compression
            if output_path is None:
                output_path = image_path.replace(".png", "_compressed.jpg").replace(".jpg", "_compressed.jpg")
            
            img.save(output_path, format="JPEG", quality=ImageProcessor.COMPRESSION_QUALITY, optimize=True)
            
            original_size = os.path.getsize(image_path) / 1024
            compressed_size = os.path.getsize(output_path) / 1024
            logger.info(f"Image compressed: {original_size:.1f}KB → {compressed_size:.1f}KB")
            
            return True, output_path
        except Exception as e:
            logger.exception(f"Image compression failed: {e}")
            return False, str(e)
    
    @staticmethod
    def extract_text_ocr(image_path: str) -> str:
        """
        Extract text from chart image using OCR (Tesseract).
        Useful for extracting ticker symbols, prices, and labels.
        Returns: extracted text string
        """
        try:
            # Check if Tesseract is installed
            try:
                pytesseract.get_tesseract_version()
            except pytesseract.TesseractNotFoundError:
                logger.warning("Tesseract not installed; OCR extraction skipped")
                return ""
            
            img = cv2.imread(image_path)
            if img is None:
                return ""
            
            # Preprocess for better OCR: grayscale, blur, threshold
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            _, thresh = cv2.threshold(blurred, 150, 255, cv2.THRESH_BINARY)
            
            # Extract text
            text = pytesseract.image_to_string(thresh)
            logger.info(f"OCR extracted {len(text)} characters from chart")
            
            return text.strip()
        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            return ""
    
    def get_cache_path(self, image_hash: str) -> str:
        """Get cache file path for analysis result."""
        return os.path.join(self.CACHE_DIR, f"{image_hash}.json")
    
    def cache_exists(self, image_hash: str) -> bool:
        """Check if analysis result is cached."""
        return os.path.exists(self.get_cache_path(image_hash))
    
    def get_cached_result(self, image_hash: str) -> dict:
        """Retrieve cached analysis result."""
        import json
        cache_path = self.get_cache_path(image_hash)
        try:
            with open(cache_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read cache: {e}")
            return None
    
    def save_cache(self, image_hash: str, result: dict) -> bool:
        """Save analysis result to cache."""
        import json
        cache_path = self.get_cache_path(image_hash)
        try:
            with open(cache_path, 'w') as f:
                json.dump(result, f)
            logger.info(f"Analysis cached: {image_hash}")
            return True
        except Exception as e:
            logger.warning(f"Failed to cache result: {e}")
            return False