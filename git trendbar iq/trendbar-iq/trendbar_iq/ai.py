from flask import current_app
import base64
import logging

def encode_image(image_path):
    """Convert image to base64 for API"""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
    except Exception as e:
        logging.error(f"Error encoding image: {str(e)}")
        return None

def analyze_chart(image_path):
    """Analyze trading chart using the AI model"""
    if not current_app.config.get("GEMINI_API_KEY"):
        return "Error: Gemini API key not configured"

    try:
        base64_image = encode_image(image_path)
        if base64_image is None:
            return "Error: Unable to encode image"

        prompt_text = """
        You are a trading AI expert. Analyze the uploaded chart and provide insights:

        **🔹 Market Analysis:**  
        1️ Coin Name & Price  
        2️ Strong & Weak Support/Resistance Levels  
        3️ SMC Concepts (Break of Structure, Change of Character)  
        4️ Key Liquidity Zones (Buy/Sell Traps)  
        5️ Market Condition (Bullish/Bearish/Sideways)  
        6️ Future Trend Prediction  
        7️ Entry & Exit Strategy  
        8️ Stoploss & Take Profit Targets  
        9️ Risk-Reward Ratio  
        10 EMA Analysis (9, 21, 50, 200 EMA) 
        11 RSI Condition (Overbought/Oversold/Divergence)  
        12️ Bollinger Bands & Volume Spikes  
        13️ Candlestick Pattern Recognition  
        14️ Institutional Accumulation/Distribution Analysis  

        Return your analysis as a proper JSON structure with each category as a key, ensure you NEVER add backticks (```) or json tags before or after your response.
        """

        model = current_app.extensions['genai'].model  # Assuming genai is initialized in extensions.py

        response = model.generate_content(
            [prompt_text, {"mime_type": "image/jpeg", "data": base64_image}]
        )

        result_text = response.text.strip()
        return result_text

    except Exception as e:
        logging.error(f"Error analyzing chart: {str(e)}")
        return f"Error analyzing chart: {str(e)}"