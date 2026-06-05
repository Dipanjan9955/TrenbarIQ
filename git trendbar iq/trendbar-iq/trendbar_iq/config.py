import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "your_default_secret_key")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///trendbar.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    
    # Security settings
    SESSION_COOKIE_SECURE = True  # Use secure cookies
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookies
    SESSION_COOKIE_SAMESITE = 'Lax'  # Protect against CSRF

    # AI API settings
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "your_default_api_key")

    # Other configurations can be added here as needed
