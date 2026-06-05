from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from .models import ChartAnalysis, BacktestResult
from .ai import analyze_chart
import os

bp = Blueprint('routes', __name__)

@bp.route('/analyze', methods=['POST'])
@login_required
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        result = analyze_chart(file_path)
        return jsonify({"result": result})

    return jsonify({"error": "Invalid file type"}), 400

@bp.route('/save-analysis', methods=['POST'])
@login_required
def save_analysis():
    data = request.get_json()

    analysis = ChartAnalysis(
        user_id=current_user.id,
        result_json=data.get('analysis', '{}'),
        symbol=data.get('symbol', 'Unknown'),
        timeframe=data.get('timeframe', '1d'),
        image_path=data.get('image_path', '')
    )

    db.session.add(analysis)
    db.session.commit()

    return jsonify({"success": True, "id": analysis.id})

@bp.route('/get-analyses', methods=['GET'])
@login_required
def get_analyses():
    analyses = ChartAnalysis.query.filter_by(user_id=current_user.id).order_by(ChartAnalysis.created_at.desc()).all()
    return jsonify([analysis.to_dict() for analysis in analyses])

@bp.route('/save-backtest', methods=['POST'])
@login_required
def save_backtest():
    data = request.get_json()

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

@bp.route('/get-backtest-results', methods=['GET'])
@login_required
def get_backtest_results():
    results = BacktestResult.query.filter_by(user_id=current_user.id).order_by(BacktestResult.created_at.desc()).all()
    return jsonify([result.to_dict() for result in results])