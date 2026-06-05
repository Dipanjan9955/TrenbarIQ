"""
Fallback OCR-based chart analyzer when Gemini API is unavailable.
Provides basic technical analysis from chart text extraction.
"""

import logging
import re

logger = logging.getLogger(__name__)

class OCRAnalyzer:
    """Performs local analysis using OCR-extracted text from charts."""
    
    @staticmethod
    def analyze(ocr_text: str, image_path: str = None) -> dict:
        """
        Perform fallback analysis based on OCR text.
        Returns: structured analysis dict
        """
        if not ocr_text or len(ocr_text.strip()) < 5:
            return OCRAnalyzer._default_analysis("Unable to extract chart data via OCR")
        
        # Extract numbers and patterns
        numbers = re.findall(r'\d+\.?\d*', ocr_text)
        
        # Attempt to identify signal from chart patterns
        signal = OCRAnalyzer._infer_signal(ocr_text)
        
        # Extract potential support/resistance levels
        levels = OCRAnalyzer._extract_levels(numbers)
        
        analysis = {
            "signal": signal,
            "confidence": 45,  # Lower confidence for OCR-based analysis
            "trend": OCRAnalyzer._infer_trend(ocr_text),
            "support": levels.get("support", []),
            "resistance": levels.get("resistance", []),
            "candlestick_patterns": [],
            "entry_zone": "Manual analysis required",
            "stop_loss": "Use chart tools",
            "take_profit": levels.get("resistance", ["Use chart tools"])[0],
            "risk_level": "Medium",
            "analysis": f"Local OCR analysis (Gemini unavailable): {ocr_text[:200]}..."
        }
        
        return analysis
    
    @staticmethod
    def _infer_signal(text: str) -> str:
        """Infer BUY/SELL/HOLD from text patterns."""
        text_lower = text.lower()
        
        buy_keywords = ['buy', 'support', 'resistance break', 'breakout', 'bullish']
        sell_keywords = ['sell', 'resistance', 'breakdown', 'bearish', 'bearish']
        
        buy_count = sum(1 for kw in buy_keywords if kw in text_lower)
        sell_count = sum(1 for kw in sell_keywords if kw in text_lower)
        
        if buy_count > sell_count:
            return "BUY"
        elif sell_count > buy_count:
            return "SELL"
        return "HOLD"
    
    @staticmethod
    def _infer_trend(text: str) -> str:
        """Infer trend direction from text."""
        text_lower = text.lower()
        if 'uptrend' in text_lower or 'bullish' in text_lower or 'up' in text_lower:
            return "Uptrend"
        elif 'downtrend' in text_lower or 'bearish' in text_lower or 'down' in text_lower:
            return "Downtrend"
        return "Sideways"
    
    @staticmethod
    def _extract_levels(numbers: list) -> dict:
        """Extract support and resistance levels from numbers."""
        if not numbers:
            return {"support": [], "resistance": []}
        
        # Sort and deduplicate
        unique_nums = sorted(set(float(n) for n in numbers), reverse=True)
        
        return {
            "support": [str(round(unique_nums[-1], 2))] if unique_nums else [],
            "resistance": [str(round(unique_nums[0], 2))] if unique_nums else []
        }
    
    @staticmethod
    def _default_analysis(reason: str) -> dict:
        """Return default analysis when OCR fails."""
        return {
            "signal": "HOLD",
            "confidence": 0,
            "trend": "Unknown",
            "support": [],
            "resistance": [],
            "candlestick_patterns": [],
            "entry_zone": "Unable to analyze",
            "stop_loss": "Manual analysis required",
            "take_profit": "Manual analysis required",
            "risk_level": "High",
            "analysis": reason
        }