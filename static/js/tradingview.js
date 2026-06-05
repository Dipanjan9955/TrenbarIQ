// TradingView widget integration
document.addEventListener('DOMContentLoaded', function() {
  const chartsTab = document.getElementById('charts-tab');
  if (!chartsTab) return;
  
  // Initialize TradingView widget
  initTradingViewWidget();
  
  // Initialize symbol search
  initSymbolSearch();
});

function initTradingViewWidget(symbol = 'BINANCE:BTCUSDT') {
  const widgetContainer = document.getElementById('tradingview-widget');
  if (!widgetContainer) return;
  
  // Clear previous widget
  widgetContainer.innerHTML = '';
  
  // Create new TradingView widget
  new TradingView.widget({
    "width": "100%",
    "height": 600,
    "symbol": symbol,
    "interval": "D",
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "1",
    "locale": "en",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "withdateranges": true,
    "hide_side_toolbar": false,
    "allow_symbol_change": true,
    "studies": [
      "BB@tv-basicstudies",
      "RSI@tv-basicstudies",
      "MAExp@tv-basicstudies"
    ],
    "container_id": "tradingview-widget"
  });
}

function initSymbolSearch() {
  const symbolSearch = document.getElementById('symbol-search');
  const searchButton = document.getElementById('search-button');
  
  if (!symbolSearch || !searchButton) return;
  
  // Handle search button click
  searchButton.addEventListener('click', function() {
    const symbol = symbolSearch.value.trim();
    if (!symbol) return;
    
    // Format symbol if needed (add exchange prefix if missing)
    let formattedSymbol = symbol;
    if (!symbol.includes(':')) {
      // Default to BINANCE exchange for crypto or NASDAQ for stocks
      if (symbol.includes('USD') || symbol.includes('BTC') || symbol.includes('ETH')) {
        formattedSymbol = `BINANCE:${symbol}`;
      } else {
        formattedSymbol = `NASDAQ:${symbol}`;
      }
    }
    
    // Update widget with new symbol
    initTradingViewWidget(formattedSymbol);
  });
  
  // Handle enter key press in search input
  symbolSearch.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      searchButton.click();
    }
  });
  
  // Quick select buttons for popular symbols
  const quickSelectButtons = document.querySelectorAll('.quick-select-symbol');
  quickSelectButtons.forEach(button => {
    button.addEventListener('click', function() {
      const symbol = this.getAttribute('data-symbol');
      symbolSearch.value = symbol;
      initTradingViewWidget(symbol);
    });
  });
}

// Add popular markets/symbols function
function addPopularSymbols() {
  const popularSymbols = [
    { name: 'Bitcoin', symbol: 'BINANCE:BTCUSDT' },
    { name: 'Ethereum', symbol: 'BINANCE:ETHUSDT' },
    { name: 'Apple', symbol: 'NASDAQ:AAPL' },
    { name: 'Tesla', symbol: 'NASDAQ:TSLA' },
    { name: 'Gold', symbol: 'OANDA:XAUUSD' },
    { name: 'S&P 500', symbol: 'FOREXCOM:SPXUSD' }
  ];
  
  const container = document.getElementById('popular-symbols');
  if (!container) return;
  
  let html = '<div class="popular-symbols-grid">';
  popularSymbols.forEach(item => {
    html += `
      <button class="btn btn-outline-primary quick-select-symbol" data-symbol="${item.symbol}">
        ${item.name}
      </button>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
  
  // Add event listeners
  const quickSelectButtons = document.querySelectorAll('.quick-select-symbol');
  quickSelectButtons.forEach(button => {
    button.addEventListener('click', function() {
      const symbol = this.getAttribute('data-symbol');
      document.getElementById('symbol-search').value = symbol;
      initTradingViewWidget(symbol);
    });
  });
}

// Function to load chart indicators
function loadIndicators() {
  const indicatorsList = [
    { name: 'Bollinger Bands', value: 'BB@tv-basicstudies' },
    { name: 'RSI', value: 'RSI@tv-basicstudies' },
    { name: 'MACD', value: 'MACD@tv-basicstudies' },
    { name: 'EMA 9', value: 'MAExp@tv-basicstudies,9' },
    { name: 'EMA 21', value: 'MAExp@tv-basicstudies,21' },
    { name: 'EMA 50', value: 'MAExp@tv-basicstudies,50' },
    { name: 'EMA 200', value: 'MAExp@tv-basicstudies,200' },
    { name: 'Volume', value: 'Volume@tv-basicstudies' }
  ];
  
  const container = document.getElementById('chart-indicators');
  if (!container) return;
  
  let html = '<div class="indicators-list">';
  indicatorsList.forEach(indicator => {
    html += `
      <div class="form-check">
        <input class="form-check-input indicator-checkbox" type="checkbox" value="${indicator.value}" id="indicator-${indicator.value.split('@')[0]}">
        <label class="form-check-label" for="indicator-${indicator.value.split('@')[0]}">
          ${indicator.name}
        </label>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
  
  // Note: In a real implementation, we'd need to recreate the TradingView widget
  // with selected indicators when checkboxes change. TradingView widget doesn't
  // support adding/removing indicators dynamically after creation.
}

// Initialize timeframe selection
function initTimeframeSelection() {
  const timeframes = [
    { name: '1m', value: '1' },
    { name: '5m', value: '5' },
    { name: '15m', value: '15' },
    { name: '1h', value: '60' },
    { name: '4h', value: '240' },
    { name: '1D', value: 'D' },
    { name: '1W', value: 'W' }
  ];
  
  const container = document.getElementById('timeframe-selection');
  if (!container) return;
  
  let html = '<div class="timeframe-buttons">';
  timeframes.forEach(tf => {
    html += `
      <button class="btn btn-sm btn-outline-secondary timeframe-btn" data-timeframe="${tf.value}">
        ${tf.name}
      </button>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
  
  // Add event listeners
  const timeframeButtons = document.querySelectorAll('.timeframe-btn');
  timeframeButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Highlight active button
      timeframeButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // In a real implementation, we'd update the widget with the new timeframe
      // Since TradingView widget doesn't support changing interval dynamically,
      // we'd need to recreate the widget
      const timeframe = this.getAttribute('data-timeframe');
      const currentSymbol = document.getElementById('symbol-search').value || 'BINANCE:BTCUSDT';
      
      // This would need to be implemented to recreate widget with new timeframe
      // updateWidgetWithTimeframe(currentSymbol, timeframe);
    });
  });
}
