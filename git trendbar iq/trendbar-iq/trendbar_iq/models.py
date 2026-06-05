from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    preferences = db.relationship('UserPreference', backref='user', uselist=False)
    analyses = db.relationship('ChartAnalysis', backref='user', lazy=True)
    backtests = db.relationship('BacktestResult', backref='user', lazy=True)

class UserPreference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    theme = db.Column(db.String(20), default='dark')
    notifications_enabled = db.Column(db.Boolean, default=True)
    default_timeframe = db.Column(db.String(10), default='1d')
    default_symbol = db.Column(db.String(10), default='BTCUSDT')
    ui_animations = db.Column(db.Boolean, default=True)

class ChartAnalysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    result_json = db.Column(db.Text, nullable=False)
    symbol = db.Column(db.String(10), nullable=False)
    timeframe = db.Column(db.String(10), default='1d')
    image_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class BacktestResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    asset = db.Column(db.String(10), nullable=False)
    timeframe = db.Column(db.String(10), default='1d')
    strategy = db.Column(db.String(50), default='Custom')
    parameters = db.Column(db.Text, nullable=False)
    initial_capital = db.Column(db.Float, nullable=False)
    final_capital = db.Column(db.Float, nullable=False)
    profit_loss = db.Column(db.Float, nullable=False)
    profit_loss_percent = db.Column(db.Float, nullable=False)
    total_trades = db.Column(db.Integer, nullable=False)
    winning_trades = db.Column(db.Integer, nullable=False)
    losing_trades = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)