from flask import Flask
from .extensions import db, migrate, login_manager

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object('trendbar_iq.config.Config')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Register blueprints
    from .routes import main as main_blueprint
    app.register_blueprint(main_blueprint)

    return app