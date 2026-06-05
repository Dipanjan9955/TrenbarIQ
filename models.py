from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User account model"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    preferences = db.relationship('UserPreference', backref='user', uselist=False, cascade='all, delete-orphan')
    analyses = db.relationship('ChartAnalysis', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    backtest_results = db.relationship('BacktestResult', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.username}>'


class UserPreference(db.Model):
    """User preferences model"""
    __tablename__ = 'user_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    theme = db.Column(db.String(32), default='dark')
    notifications_enabled = db.Column(db.Boolean, default=True)
    default_timeframe = db.Column(db.String(32), default='1d')
    default_symbol = db.Column(db.String(32), default='BTCUSDT')
    ui_animations = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<UserPreference for {self.user_id}>'
    
    def to_dict(self):
        return {
            'theme': self.theme,
            'notifications_enabled': self.notifications_enabled,
            'default_timeframe': self.default_timeframe,
            'default_symbol': self.default_symbol, 
            'ui_animations': self.ui_animations
        }


class ChartAnalysis(db.Model):
    """Chart analysis results model"""
    __tablename__ = 'chart_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    image_path = db.Column(db.String(255))
    result_json = db.Column(db.Text, nullable=False)
    symbol = db.Column(db.String(32))
    timeframe = db.Column(db.String(32))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ChartAnalysis {self.id} for {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'image_path': self.image_path,
            'result': self.result_json,
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'created_at': self.created_at.isoformat()
        }


class BacktestResult(db.Model):
    """Backtest results model"""
    __tablename__ = 'backtest_results'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    asset = db.Column(db.String(32), nullable=False)
    timeframe = db.Column(db.String(32), nullable=False)
    strategy = db.Column(db.String(64), nullable=False)
    parameters = db.Column(db.Text)  # JSON string of strategy parameters
    initial_capital = db.Column(db.Float, nullable=False)
    final_capital = db.Column(db.Float, nullable=False)
    profit_loss = db.Column(db.Float, nullable=False)
    profit_loss_percent = db.Column(db.Float, nullable=False)
    total_trades = db.Column(db.Integer, nullable=False)
    winning_trades = db.Column(db.Integer, nullable=False)
    losing_trades = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<BacktestResult {self.id} for {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'asset': self.asset,
            'timeframe': self.timeframe,
            'strategy': self.strategy,
            'parameters': self.parameters,
            'initial_capital': self.initial_capital,
            'final_capital': self.final_capital,
            'profit_loss': self.profit_loss,
            'profit_loss_percent': self.profit_loss_percent,
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': (self.winning_trades / self.total_trades) * 100 if self.total_trades > 0 else 0,
            'created_at': self.created_at.isoformat()
        }