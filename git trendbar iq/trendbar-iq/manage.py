import os
import sys
from flask.cli import FlaskGroup
from trendbar_iq import create_app, db

app = create_app()
cli = FlaskGroup(create_app=create_app)

@cli.command("run")
def run():
    """Run the Flask application."""
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))

@cli.command("migrate")
def migrate():
    """Run database migrations."""
    from flask_migrate import upgrade
    upgrade()

@cli.command("create-db")
def create_db():
    """Create the database."""
    db.create_all()

if __name__ == "__main__":
    cli()