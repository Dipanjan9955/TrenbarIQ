# TrendBar-IQ

TrendBar-IQ is a Flask-based web application designed for trading analysis and backtesting. It leverages AI to analyze trading charts and provides users with insights and recommendations based on real-time market data.

## Features

- User authentication (registration, login, logout)
- Chart analysis using AI
- Backtesting of trading strategies
- Real-time market sentiment and news
- User preferences management
- Responsive design with modern UI

## Project Structure

```
trendbar-iq
├── api
│   └── index.py                # Entry point for the API
├── trendbar_iq
│   ├── __init__.py             # Initializes the Flask application
│   ├── config.py               # Configuration settings
│   ├── extensions.py            # Initializes extensions (SQLAlchemy, Flask-Migrate, Flask-Login)
│   ├── models.py                # Database models
│   ├── auth.py                  # Authentication functionality
│   ├── ai.py                    # AI model interaction
│   ├── routes.py                # Application routes
│   ├── analysis.py              # Chart analysis functions
│   ├── backtest.py              # Backtesting functionality
│   ├── templates                # HTML templates
│   │   ├── index.html
│   │   ├── login.html
│   │   └── register.html
│   └── static                   # Static files (CSS, JS)
│       ├── css
│       │   └── main.css
│       └── js
│           └── main.js
├── migrations                    # Database migration scripts
├── tests                         # Unit tests
│   ├── test_routes.py
│   └── test_models.py
├── .github                       # GitHub workflows
│   └── workflows
│       └── ci.yml
├── .gitignore                    # Files to ignore in Git
├── vercel.json                  # Vercel deployment configuration
├── .env.example                  # Environment variable template
├── requirements.txt              # Python dependencies
├── runtime.txt                   # Python runtime version
├── Dockerfile                    # Docker image instructions
├── manage.py                     # Command-line utility for managing the application
├── pytest.ini                    # Pytest configuration
└── README.md                     # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/trendbar-iq.git
   cd trendbar-iq
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up the environment variables:
   - Copy `.env.example` to `.env` and fill in the required values.

5. Run database migrations:
   ```
   flask db upgrade
   ```

6. Start the application:
   ```
   flask run
   ```

## Usage

- Access the application at `http://localhost:5000`.
- Register a new account or log in with existing credentials.
- Upload trading charts for analysis and view backtest results.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.