from flask import jsonify
from models import ChartAnalysis, db

def save_analysis(user_id, result_json, symbol, timeframe, image_path):
    """Save chart analysis to the database."""
    analysis = ChartAnalysis(
        user_id=user_id,
        result_json=result_json,
        symbol=symbol,
        timeframe=timeframe,
        image_path=image_path
    )
    db.session.add(analysis)
    db.session.commit()
    return analysis.id

def get_analyses(user_id):
    """Retrieve user's saved analyses from the database."""
    analyses = ChartAnalysis.query.filter_by(user_id=user_id).order_by(ChartAnalysis.created_at.desc()).all()
    return [analysis.to_dict() for analysis in analyses]