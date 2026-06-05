from flask import Flask, jsonify
from trendbar_iq.routes import register_routes

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object('trendbar_iq.config.Config')

    # Initialize extensions
    register_routes(app)

    return app

app = create_app()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)