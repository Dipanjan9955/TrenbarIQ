from flask import jsonify, request
from .models import BacktestResult, db
from flask_login import current_user

def save_backtest(data):
    """Save backtest results to the database."""
    backtest = BacktestResult(
        user_id=current_user.id,
        asset=data.get('asset', 'Unknown'),
        timeframe=data.get('timeframe', '1d'),
        strategy=data.get('strategy', 'Custom'),
        parameters=data.get('parameters', {}),
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
    return backtest.id

def get_backtest_results():
    """Retrieve backtest results for the current user."""
    results = BacktestResult.query.filter_by(user_id=current_user.id).order_by(BacktestResult.created_at.desc()).all()
    return jsonify([result.to_dict() for result in results])