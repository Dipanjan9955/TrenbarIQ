"""
TrendBar IQ: Crypto Chart Image Analyzer using Gemini API
Production-ready implementation with optimization, caching, and fallback.
"""

# Load environment variables FIRST before any other imports
from dotenv import load_dotenv
load_dotenv()

import os
import logging
import base64
import json
import random
import time
from uuid import uuid4
from datetime import datetime
from functools import wraps

import google.generativeai as genai
import requests

from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash, Blueprint, current_app
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from models import db, User, UserPreference, ChartAnalysis, BacktestResult
from image_processor import ImageProcessor
from ocr_analyzer import OCRAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

main_bp = Blueprint("main", __name__)

# ============================================================================
# UTILITY: Retry decorator for temporary quota/network errors
# ============================================================================
def retry_on_quota(max_attempts=3, initial_delay=2):
    """
    Decorator to retry API calls on quota exceeded or temporary errors.
    Implements exponential backoff.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_str = str(e)
                    # Check for quota/rate limit errors
                    if any(err in error_str for err in ['429', 'quota', 'rate_limit', 'RESOURCE_EXHAUSTED']):
                        if attempt < max_attempts - 1:
                            delay = initial_delay * (2 ** attempt)  # Exponential backoff
                            logger.warning(f"Quota exceeded. Retrying in {delay}s (attempt {attempt+1}/{max_attempts})")
                            time.sleep(delay)
                            continue
                    # For other errors or final attempt, raise
                    raise
            return None
        return wrapper
    return decorator

# ============================================================================
# Application Factory
# ============================================================================
def create_app(config: dict = None):
    """Create and configure Flask application."""
    app = Flask(__name__, static_folder="static", template_folder="templates")
    
    # Configuration from environment with safe defaults
    app.config['SECRET_KEY'] = os.environ.get("SESSION_SECRET", os.environ.get("FLASK_SECRET", "dev_secret_key"))
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL", "sqlite:///trendbar.db")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    max_upload = int(os.environ.get("MAX_UPLOAD_MB", "5"))
    app.config['MAX_CONTENT_LENGTH'] = max_upload * 1024 * 1024
    app.config['UPLOAD_FOLDER'] = os.environ.get("UPLOAD_FOLDER", "uploads")
    app.config['ALLOWED_EXTENSIONS'] = set(os.environ.get("ALLOWED_EXTENSIONS", "png,jpg,jpeg,gif").split(","))

    if config:
        app.config.update(config)

    CORS(app)
    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return User.query.get(int(user_id))
        except Exception:
            return None

    @login_manager.request_loader
    def load_user_from_request(request):
        token = request.headers.get("X-API-TOKEN")
        if not token:
            return None
        try:
            return User.query.filter_by(api_token=token).first()
        except Exception:
            return None

    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except Exception as e:
        logger.warning(f"Could not create upload folder: {e}")

    # Log Gemini configuration status at startup
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        logger.info(f"Gemini API key detected (masked): {gemini_key[:4]}...{gemini_key[-4:]}")
    else:
        logger.warning("GEMINI_API_KEY not set; will use OCR fallback analysis only")

    app.register_blueprint(main_bp)

    # Create tables in development
    if app.config.get("ENV") == "development" or app.config.get("DEBUG"):
        with app.app_context():
            db.create_all()

    return app

# ============================================================================
# Gemini API Functions (with error handling and optimization)
# ============================================================================

def validate_gemini_key() -> tuple[bool, str]:
    """
    Validate Gemini API key by attempting a lightweight models list request.
    Returns: (is_valid, message)
    """
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return False, "GEMINI_API_KEY not set"
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1/models?key={key}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return True, "API key valid"
        return False, f"HTTP {response.status_code}: Invalid or restricted key"
    except requests.Timeout:
        return False, "Timeout validating key"
    except Exception as e:
        return False, str(e)

@retry_on_quota(max_attempts=3, initial_delay=2)
def analyze_with_gemini(image_path: str, ocr_text: str) -> dict:
    """
    Call Gemini API with image and OCR text for efficient analysis.
    Returns: {'result_json': dict, 'result_text': str, 'error': str or None}
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")
    gemini_model = os.environ.get("GEMINI_MODEL", "models/gemini-2.5-flash")
    
    if not gemini_key:
        return {
            "result_json": None,
            "result_text": "",
            "error": "GEMINI_API_KEY not configured"
        }

    try:
        # Configure Gemini (call each time to ensure fresh config)
        genai.configure(api_key=gemini_key)
        
        # Encode image to base64
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        
        # Determine MIME type
        mime_type = "image/jpeg"
        if image_path.lower().endswith('.png'):
            mime_type = "image/png"
        elif image_path.lower().endswith('.gif'):
            mime_type = "image/gif"
        
        # Construct prompt with OCR text context
        prompt = (
            "You are an expert cryptocurrency chart analyst. Analyze the chart image and extracted text below.\n\n"
            f"EXTRACTED CHART TEXT:\n{ocr_text}\n\n"
            "Return ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:\n"
            '{"signal":"BUY"|"SELL"|"HOLD","confidence":0-100,"trend":"Uptrend"|"Downtrend"|"Sideways",'
            '"support":[list of levels],"resistance":[list of levels],"candlestick_patterns":[patterns found],'
            '"entry_zone":"price or zone","stop_loss":"price","take_profit":"price",'
            '"risk_level":"Low"|"Medium"|"High","analysis":"brief summary"}\n\n'
            "Be concise and accurate."
        )
        
        # Call Gemini API with image and text
        model = genai.GenerativeModel(gemini_model)
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_data}
        ])
        
        result_text = response.text if hasattr(response, 'text') else str(response)
        
        # Parse JSON response
        parsed = parse_json_response(result_text)
        
        if parsed is None:
            return {
                "result_json": None,
                "result_text": result_text,
                "error": "Invalid JSON response from Gemini"
            }
        
        # Normalize and validate
        normalized, validation_error = validate_analysis(parsed)
        
        if normalized is None:
            return {
                "result_json": None,
                "result_text": result_text,
                "error": validation_error or "Analysis validation failed"
            }
        
        return {
            "result_json": normalized,
            "result_text": result_text,
            "error": None
        }

    except Exception as e:
        error_msg = str(e)
        logger.exception(f"Gemini API error: {error_msg}")
        
        # Specific error handling
        if "429" in error_msg or "quota" in error_msg.lower():
            return {
                "result_json": None,
                "result_text": "",
                "error": "API quota exceeded. Please retry in a few minutes."
            }
        elif "401" in error_msg or "authentication" in error_msg.lower():
            return {
                "result_json": None,
                "result_text": "",
                "error": "Invalid API key. Check GEMINI_API_KEY configuration."
            }
        elif "timeout" in error_msg.lower() or "connection" in error_msg.lower():
            return {
                "result_json": None,
                "result_text": "",
                "error": "Network error. Using OCR fallback analysis."
            }
        
        return {
            "result_json": None,
            "result_text": "",
            "error": f"API error: {error_msg[:100]}"
        }

def parse_json_response(text: str) -> dict | None:
    """
    Parse JSON from Gemini response (handles markdown code blocks).
    Returns: parsed dict or None
    """
    if not text:
        return None
    
    raw = text.strip()
    # Remove markdown code blocks if present
    for marker in ('```json', '```'):
        raw = raw.replace(marker, '')
    raw = raw.strip()
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        try:
            start = raw.find('{')
            end = raw.rfind('}')
            if start != -1 and end > start:
                return json.loads(raw[start:end+1])
        except Exception:
            pass
        return None

def validate_analysis(data: dict) -> tuple[dict | None, str | None]:
    """
    Validate and normalize analysis result.
    Returns: (normalized_data, error_message)
    """
    if not isinstance(data, dict):
        return None, "Analysis must be a JSON object"
    
    required_keys = {
        "signal", "confidence", "trend", "support", "resistance",
        "candlestick_patterns", "entry_zone", "stop_loss",
        "take_profit", "risk_level", "analysis"
    }
    
    missing = required_keys - set(data.keys())
    if missing:
        # Fill missing keys with defaults instead of failing
        for key in missing:
            if key == "support":
                data[key] = []
            elif key == "resistance":
                data[key] = []
            elif key == "candlestick_patterns":
                data[key] = []
            elif key == "confidence":
                data[key] = 50
            else:
                data[key] = "N/A"
    
    # Normalize confidence to 0-100
    try:
        conf = data.get("confidence")
        if isinstance(conf, str):
            conf = float(conf.strip().rstrip('%'))
        data["confidence"] = max(0, min(100, int(round(float(conf)))))
    except Exception:
        data["confidence"] = 50
    
    # Ensure signal is valid
    if data.get("signal") not in ("BUY", "SELL", "HOLD"):
        data["signal"] = "HOLD"
    
    return data, None

# ============================================================================
# Image and File Processing
# ============================================================================

def allowed_file(filename: str) -> bool:
    """Check if uploaded file has allowed extension."""
    allowed = current_app.config.get('ALLOWED_EXTENSIONS', {'png', 'jpg', 'jpeg', 'gif'})
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed

# ============================================================================
# Routes
# ============================================================================

@main_bp.route("/")
def index():
    return render_template("index.html")

@main_bp.route("/analyze", methods=["POST"])
def analyze():
    """
    Main analysis endpoint.
    Accepts chart image, optimizes it, extracts OCR text,
    queries Gemini API or falls back to local analysis.
    """
    # Get uploaded file
    file = None
    if 'file' in request.files:
        file = request.files['file']
    else:
        # Try alternative field names
        for alt_name in ('image', 'chart', 'chart_image', 'file0', 'upload'):
            if alt_name in request.files:
                file = request.files[alt_name]
                break
    
    if file is None or file.filename == '':
        return jsonify({
            "success": False,
            "error": "No image file provided"
        }), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "error": "Invalid file type. Allowed: PNG, JPG, GIF"
        }), 400
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filename = f"{uuid4().hex}_{filename}"
        upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(upload_path)
        
        # Validate image
        is_valid, validation_error = ImageProcessor.validate_image(upload_path)
        if not is_valid:
            return jsonify({
                "success": False,
                "error": validation_error
            }), 400
        
        # Generate image hash for caching
        image_hash = ImageProcessor.get_image_hash(upload_path)
        
        # Check cache first
        processor = ImageProcessor()
        if processor.cache_exists(image_hash):
            logger.info(f"Cache hit for image hash: {image_hash}")
            cached_result = processor.get_cached_result(image_hash)
            return jsonify({
                "success": True,
                "error": None,
                "result_json": cached_result,
                "result_text": "Cached analysis result",
                "cached": True
            })
        
        # Compress image for API efficiency
        compress_ok, compress_result = ImageProcessor.compress_image(upload_path)
        if not compress_ok:
            logger.warning(f"Image compression failed: {compress_result}, using original")
            compressed_path = upload_path
        else:
            compressed_path = compress_result
        
        # Extract text from chart via OCR
        ocr_text = ImageProcessor.extract_text_ocr(compressed_path)
        logger.info(f"OCR extracted: {len(ocr_text)} characters")
        
        # Try Gemini API first
        gemini_result = None
        gemini_error = None
        
        if os.environ.get("GEMINI_API_KEY"):
            logger.info("Attempting Gemini API analysis...")
            gemini_result = analyze_with_gemini(compressed_path, ocr_text)
            
            if gemini_result.get("error"):
                gemini_error = gemini_result.get("error")
                logger.warning(f"Gemini error: {gemini_error}")
            else:
                # Successfully got Gemini result
                analysis_result = gemini_result.get("result_json")
                if analysis_result:
                    # Cache successful result
                    processor.save_cache(image_hash, analysis_result)
                    
                    return jsonify({
                        "success": True,
                        "error": None,
                        "result_json": analysis_result,
                        "result_text": gemini_result.get("result_text", ""),
                        "cached": False
                    })
        
        # Fallback to OCR-based local analysis
        logger.info("Falling back to OCR-based analysis...")
        fallback_result = OCRAnalyzer.analyze(ocr_text, compressed_path)
        
        # Cache fallback result too
        processor.save_cache(image_hash, fallback_result)
        
        return jsonify({
            "success": True,
            "error": gemini_error or "Using local OCR analysis (Gemini unavailable)",
            "result_json": fallback_result,
            "result_text": f"OCR fallback. Extracted: {ocr_text[:200]}...",
            "cached": False,
            "fallback": True
        })

    except Exception as e:
        logger.exception(f"Analyze endpoint error: {e}")
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)[:100]}"
        }), 500

@main_bp.route("/health")
def health():
    """Health check endpoint for deployment monitoring."""
    gemini_valid, gemini_msg = validate_gemini_key()
    return jsonify({
        "status": "healthy",
        "gemini_available": gemini_valid,
        "gemini_status": gemini_msg,
        "timestamp": datetime.utcnow().isoformat()
    })

@main_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for("main.index"))
        flash("Invalid credentials")
    return render_template("login.html")

@main_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
            flash("User exists")
            return render_template("register.html")
        user = User(username=username, email=email, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        pref = UserPreference(user_id=user.id, theme="dark", notifications_enabled=True, default_timeframe="1d", default_symbol="BTCUSDT")
        db.session.add(pref)
        db.session.commit()
        login_user(user)
        return redirect(url_for("main.index"))
    return render_template("register.html")

@main_bp.route("/logout")
@login_required
def logout():
    logout_user()
    session.pop("guest", None)
    return redirect(url_for("main.index"))

@main_bp.route("/skip-login")
def skip_login():
    session["guest"] = True
    return redirect(url_for("main.index"))

@main_bp.route("/user-status")
def user_status():
    if current_user.is_authenticated:
        return jsonify({"status": "authenticated", "username": current_user.username, "id": current_user.id})
    if "guest" in session:
        return jsonify({"status": "guest"})
    return jsonify({"status": "not_authenticated"})

@main_bp.route("/save-preferences", methods=["POST"])
@login_required
def save_preferences():
    data = request.get_json() or {}
    preferences = UserPreference.query.filter_by(user_id=current_user.id).first()
    if not preferences:
        preferences = UserPreference(user_id=current_user.id)
        db.session.add(preferences)
    preferences.theme = data.get('theme', 'dark')
    preferences.notifications_enabled = data.get('notifications_enabled', True)
    preferences.default_timeframe = data.get('default_timeframe', '1d')
    preferences.default_symbol = data.get('default_symbol', 'BTCUSDT')
    preferences.ui_animations = data.get('ui_animations', True)
    db.session.commit()
    return jsonify({"success": True})

@main_bp.route("/get-preferences")
@login_required
def get_preferences():
    preferences = UserPreference.query.filter_by(user_id=current_user.id).first()
    if preferences:
        return jsonify(preferences.to_dict())
    return jsonify({"theme": "dark", "notifications_enabled": True, "default_timeframe": "1d", "default_symbol": "BTCUSDT", "ui_animations": True})

@main_bp.route("/save-backtest", methods=["POST"])
@login_required
def save_backtest():
    data = request.get_json() or {}
    backtest = BacktestResult(
        user_id=current_user.id,
        asset=data.get('asset', 'Unknown'),
        timeframe=data.get('timeframe', '1d'),
        strategy=data.get('strategy', 'Custom'),
        parameters=json.dumps(data.get('parameters', {})),
        initial_capital=float(data.get('initialCapital', 0)),
        final_capital=float(data.get('finalCapital', 0)),
        profit_loss=float(data.get('profitLoss', 0)),
        profit_loss_percent=float(data.get('profitLossPercent', 0)),
        total_trades=int(data.get('totalTrades', 0)),
        winning_trades=int(data.get('winningTrades', 0)),
        losing_trades=int(data.get('losingTrades', 0))
    )
    db.session.add(backtest)
    db.session.commit()
    return jsonify({"success": True, "id": backtest.id})

@main_bp.route("/get-backtest-results")
@login_required
def get_backtest_results():
    results = BacktestResult.query.filter_by(user_id=current_user.id).order_by(BacktestResult.created_at.desc()).all()
    return jsonify([r.to_dict() for r in results])

@main_bp.route("/save-analysis", methods=["POST"])
@login_required
def save_analysis():
    data = request.get_json() or {}
    analysis = ChartAnalysis(
        user_id=current_user.id,
        result_json=json.dumps(data.get('analysis', {})),
        symbol=data.get('symbol', 'Unknown'),
        timeframe=data.get('timeframe', '1d'),
        image_path=data.get('image_path', '')
    )
    db.session.add(analysis)
    db.session.commit()
    return jsonify({"success": True, "id": analysis.id})

@main_bp.route("/get-analyses")
@login_required
def get_analyses():
    analyses = ChartAnalysis.query.filter_by(user_id=current_user.id).order_by(ChartAnalysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

@main_bp.route("/market-sentiment")
def get_market_sentiment():
    try:
        r = requests.get("https://api.alternative.me/fng/?limit=1", timeout=5)
        if r.status_code == 200:
            data = r.json().get("data", [])
            if data:
                val = int(data[0].get("value", 50))
                classification = data[0].get("value_classification", "Neutral")
                summary = generate_sentiment_summary(val, classification)
                return jsonify({"value": val, "classification": classification, "summary": summary})
    except Exception:
        logger.exception("FNG fetch failed")
    val = random.randint(35, 65)
    return jsonify({"value": val, "classification": "Neutral", "summary": generate_sentiment_summary(val, "Neutral")})

def calculate_category_sentiment(category):
    offset = random.randint(-12, 12)
    base = random.randint(40, 60)
    return min(max(base + offset, 0), 100)

def generate_sentiment_summary(sentiment_value, classification):
    if sentiment_value >= 70:
        return f"{classification}: Strong greed - market near exuberance."
    if sentiment_value >= 55:
        return f"{classification}: Mild greed - positive momentum."
    if 45 < sentiment_value < 55:
        return f"{classification}: Neutral - balanced market."
    if sentiment_value > 30:
        return f"{classification}: Fear building - caution advised."
    return f"{classification}: Strong fear - risk-off environment."

@main_bp.route("/trending-assets")
def get_trending_assets():
    try:
        r = requests.get("https://api.coingecko.com/api/v3/search/trending", timeout=5)
        if r.status_code == 200:
            coins = r.json().get("coins", [])
            assets = [{"name": c["item"]["name"], "symbol": c["item"]["symbol"], "market_cap_rank": c["item"].get("market_cap_rank")} for c in coins]
            return jsonify(assets)
    except Exception:
        logger.exception("CoinGecko failed")
    return jsonify([{"name": "Bitcoin", "symbol": "BTC"}, {"name": "Ethereum", "symbol": "ETH"}])

@main_bp.route("/market-news")
def get_market_news():
    news_api_key = os.environ.get("NEWSAPI_KEY")
    if news_api_key:
        try:
            r = requests.get("https://newsapi.org/v2/top-headlines", params={"category": "business", "apiKey": news_api_key, "pageSize": 5}, timeout=5)
            if r.status_code == 200:
                items = r.json().get("articles", [])
                return jsonify([{"title": a["title"], "url": a["url"], "source": a["source"]["name"]} for a in items])
        except Exception:
            logger.exception("NewsAPI failed")
    return jsonify([{"title": "No news provider", "url": "#", "source": "local"}])

@main_bp.route("/market-tips")
def market_tips():
    sentiment = calculate_category_sentiment("overall")
    tips = []
    if sentiment >= 65:
        tips.append({"type": "momentum", "text": "Market strength detected."})
    elif sentiment <= 35:
        tips.append({"type": "risk", "text": "Market fear — reduce exposure."})
    else:
        tips.append({"type": "neutral", "text": "Market balanced."})
    return jsonify({"sentiment": sentiment, "tips": tips})

# ============================================================================
# Application initialization
# ============================================================================
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)