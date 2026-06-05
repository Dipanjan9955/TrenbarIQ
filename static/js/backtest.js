// Backtest functionality
document.addEventListener('DOMContentLoaded', function() {
  const backtestTab = document.getElementById('backtest-tab');
  if (!backtestTab) return;
  
  // Check if user is logged in
  fetch('/user-status')
    .then(response => response.json())
    .then(data => {
      if (data.status === 'authenticated') {
        // Initialize backtest functionality
        initBacktest();
      }
    })
    .catch(error => {
      console.error('Error checking user status:', error);
    });
});

function initBacktest() {
  // Initialize form elements
  const runBacktestButton = document.getElementById('run-backtest');
  const backtestForm = document.getElementById('backtest-form');
  const resultsContainer = document.getElementById('backtest-results');
  const chartContainer = document.getElementById('backtest-chart');
  
  if (!runBacktestButton || !backtestForm || !resultsContainer || !chartContainer) return;
  
  // Set up asset selection
  setupAssetSelection();
  
  // Set up strategy options
  setupStrategyOptions();
  
  // Initialize chart
  initBacktestChart(chartContainer);
  
  // Run backtest event
  runBacktestButton.addEventListener('click', function(e) {
    e.preventDefault();
    runBacktest(backtestForm, resultsContainer, chartContainer);
  });
}

function setupAssetSelection() {
  const assetSelect = document.getElementById('backtest-asset');
  if (!assetSelect) return;
  
  // Popular crypto assets
  const assets = [
    { symbol: 'BTCUSDT', name: 'Bitcoin' },
    { symbol: 'ETHUSDT', name: 'Ethereum' },
    { symbol: 'BNBUSDT', name: 'Binance Coin' },
    { symbol: 'ADAUSDT', name: 'Cardano' },
    { symbol: 'SOLUSDT', name: 'Solana' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin' },
    { symbol: 'XRPUSDT', name: 'Ripple' },
    { symbol: 'DOTUSDT', name: 'Polkadot' }
  ];
  
  // Create options
  let optionsHTML = '';
  assets.forEach(asset => {
    optionsHTML += `<option value="${asset.symbol}">${asset.name} (${asset.symbol})</option>`;
  });
  
  assetSelect.innerHTML = optionsHTML;
}

function setupStrategyOptions() {
  const strategySelect = document.getElementById('backtest-strategy');
  if (!strategySelect) return;
  
  // Trading strategies
  const strategies = [
    { value: 'sma_crossover', name: 'SMA Crossover' },
    { value: 'bollinger_bands', name: 'Bollinger Bands' },
    { value: 'rsi_oversold', name: 'RSI Oversold/Overbought' },
    { value: 'macd', name: 'MACD' },
    { value: 'support_resistance', name: 'Support & Resistance' },
    { value: 'breakout', name: 'Breakout Trading' }
  ];
  
  // Create options
  let optionsHTML = '';
  strategies.forEach(strategy => {
    optionsHTML += `<option value="${strategy.value}">${strategy.name}</option>`;
  });
  
  strategySelect.innerHTML = optionsHTML;
  
  // Strategy change updates parameters
  strategySelect.addEventListener('change', function() {
    updateStrategyParameters(this.value);
  });
  
  // Initial update
  updateStrategyParameters(strategySelect.value);
}

function updateStrategyParameters(strategy) {
  const parametersContainer = document.getElementById('strategy-parameters');
  if (!parametersContainer) return;
  
  // Define parameters for each strategy
  const parameters = {
    sma_crossover: [
      { name: 'fast_period', label: 'Fast SMA Period', type: 'number', default: 9, min: 2, max: 50 },
      { name: 'slow_period', label: 'Slow SMA Period', type: 'number', default: 21, min: 5, max: 200 }
    ],
    bollinger_bands: [
      { name: 'period', label: 'BB Period', type: 'number', default: 20, min: 5, max: 50 },
      { name: 'std_dev', label: 'Standard Deviation', type: 'number', default: 2, min: 1, max: 3, step: 0.1 }
    ],
    rsi_oversold: [
      { name: 'period', label: 'RSI Period', type: 'number', default: 14, min: 2, max: 50 },
      { name: 'oversold', label: 'Oversold Level', type: 'number', default: 30, min: 10, max: 40 },
      { name: 'overbought', label: 'Overbought Level', type: 'number', default: 70, min: 60, max: 90 }
    ],
    macd: [
      { name: 'fast_period', label: 'Fast Period', type: 'number', default: 12, min: 5, max: 50 },
      { name: 'slow_period', label: 'Slow Period', type: 'number', default: 26, min: 10, max: 100 },
      { name: 'signal_period', label: 'Signal Period', type: 'number', default: 9, min: 2, max: 50 }
    ],
    support_resistance: [
      { name: 'lookback', label: 'Lookback Period', type: 'number', default: 50, min: 20, max: 200 },
      { name: 'threshold', label: 'Price Threshold (%)', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5 }
    ],
    breakout: [
      { name: 'period', label: 'Period', type: 'number', default: 20, min: 5, max: 100 },
      { name: 'atr_multiplier', label: 'ATR Multiplier', type: 'number', default: 2, min: 0.5, max: 5, step: 0.1 }
    ]
  };
  
  // Create parameters form
  const currentParams = parameters[strategy] || [];
  
  let paramsHTML = '';
  currentParams.forEach(param => {
    paramsHTML += `
      <div class="form-group">
        <label for="param-${param.name}">${param.label}</label>
        <input 
          type="${param.type}" 
          id="param-${param.name}" 
          name="${param.name}" 
          class="form-control" 
          value="${param.default}"
          min="${param.min || ''}" 
          max="${param.max || ''}"
          step="${param.step || 1}"
        >
      </div>
    `;
  });
  
  parametersContainer.innerHTML = paramsHTML;
}

function initBacktestChart(container) {
  // We'll create a chart using Chart.js
  container.innerHTML = `
    <canvas id="backtest-chart-canvas"></canvas>
  `;
  
  const ctx = document.getElementById('backtest-chart-canvas').getContext('2d');
  
  // Initial empty chart
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [], // X-axis labels (dates)
      datasets: [{
        label: 'Asset Price',
        data: [], // Price data
        borderColor: 'rgba(0, 247, 255, 1)',
        backgroundColor: 'rgba(0, 247, 255, 0.1)',
        tension: 0.1,
        borderWidth: 2,
      }, {
        label: 'Strategy Performance',
        data: [], // Strategy performance
        borderColor: 'rgba(0, 255, 127, 1)',
        backgroundColor: 'rgba(0, 255, 127, 0.1)',
        tension: 0.1,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        },
        legend: {
          labels: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      }
    }
  });
  
  // Store chart instance in the DOM element
  container.chart = chart;
}

function runBacktest(form, resultsContainer, chartContainer) {
  // Get form values
  const asset = document.getElementById('backtest-asset').value;
  const timeframe = document.getElementById('backtest-timeframe').value;
  const capital = parseFloat(document.getElementById('backtest-capital').value);
  const strategy = document.getElementById('backtest-strategy').value;
  const stopLoss = parseFloat(document.getElementById('stop-loss').value);
  const takeProfit = parseFloat(document.getElementById('take-profit').value);
  
  // Validate inputs
  if (!asset || !timeframe || isNaN(capital) || capital <= 0 || !strategy || 
      isNaN(stopLoss) || isNaN(takeProfit)) {
    showFlashMessage('Please fill all fields with valid values', 'warning');
    return;
  }
  
  // Get strategy parameters
  const paramInputs = document.querySelectorAll('#strategy-parameters input');
  const strategyParams = {};
  paramInputs.forEach(input => {
    strategyParams[input.name] = input.type === 'number' ? parseFloat(input.value) : input.value;
  });
  
  // Show loading state
  resultsContainer.innerHTML = `
    <div class="loader active"></div>
    <p class="text-center">Running backtest simulation...</p>
  `;
  
  // In a real app, we would fetch historical data from an API
  // and perform actual backtest calculations here.
  // For this demo, we'll simulate the process with setTimeout and
  // generate some random results
  
  setTimeout(() => {
    // Generate simulated backtest data
    const backtestData = generateSimulatedBacktestData(asset, timeframe, capital, 
      strategy, strategyParams, stopLoss, takeProfit);
    
    // Update chart
    updateBacktestChart(chartContainer.chart, backtestData);
    
    // Display results
    displayBacktestResults(backtestData, resultsContainer);
    
    // Save results if user is logged in
    saveBacktestResults(asset, timeframe, strategy, backtestData.totalProfit);
  }, 2000);
}

function generateSimulatedBacktestData(asset, timeframe, capital, strategy, params, stopLoss, takeProfit) {
  // Number of days for simulation
  const days = 90;
  
  // Generate dates
  const dates = [];
  const prices = [];
  const performance = [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Generate random starting price based on asset
  let basePrice;
  switch (asset) {
    case 'BTCUSDT': basePrice = 60000; break;
    case 'ETHUSDT': basePrice = 3000; break;
    case 'BNBUSDT': basePrice = 400; break;
    case 'ADAUSDT': basePrice = 0.5; break;
    case 'SOLUSDT': basePrice = 100; break;
    case 'DOGEUSDT': basePrice = 0.1; break;
    case 'XRPUSDT': basePrice = 0.6; break;
    case 'DOTUSDT': basePrice = 10; break;
    default: basePrice = 100;
  }
  
  // Simulate price movements with some volatility
  let currentPrice = basePrice;
  let currentCapital = capital;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
    
    // Generate price with some random movement and trend
    const trend = Math.sin(i / 15) * 0.01; // Add some cyclical trend
    const volatility = 0.02 * (1 + Math.random() * 0.5);
    const priceChange = currentPrice * (trend + (Math.random() - 0.5) * volatility);
    currentPrice += priceChange;
    prices.push(currentPrice);
    
    // Simulate strategy performance (simplified)
    // In reality, this would be based on actual trading algorithm logic
    const strategyPerformance = simulateStrategyPerformance(
      i, prices, strategy, params, stopLoss, takeProfit
    );
    
    currentCapital *= (1 + strategyPerformance);
    performance.push(currentCapital);
  }
  
  // Calculate trading metrics
  const initialCapital = capital;
  const finalCapital = performance[performance.length - 1];
  const totalProfit = ((finalCapital - initialCapital) / initialCapital) * 100;
  
  // Generate some trades
  const numTrades = Math.floor(5 + Math.random() * 15);
  const trades = [];
  
  for (let i = 0; i < numTrades; i++) {
    const dayIndex = Math.floor(Math.random() * (days - 1));
    const entryPrice = prices[dayIndex];
    const exitDayIndex = Math.min(dayIndex + 1 + Math.floor(Math.random() * 10), days - 1);
    const exitPrice = prices[exitDayIndex];
    const isLong = Math.random() > 0.4; // More longs than shorts
    const profitLoss = isLong ? 
      (exitPrice - entryPrice) / entryPrice : 
      (entryPrice - exitPrice) / entryPrice;
    
    trades.push({
      entryDate: dates[dayIndex],
      exitDate: dates[exitDayIndex],
      entryPrice: entryPrice.toFixed(2),
      exitPrice: exitPrice.toFixed(2),
      type: isLong ? 'Long' : 'Short',
      profitLoss: (profitLoss * 100).toFixed(2)
    });
  }
  
  // Sort trades by date
  trades.sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  
  // Calculate other metrics
  const winningTrades = trades.filter(t => parseFloat(t.profitLoss) > 0).length;
  const winRate = (winningTrades / trades.length) * 100;
  
  return {
    dates,
    prices,
    performance,
    initialCapital,
    finalCapital,
    totalProfit,
    trades,
    winRate
  };
}

function simulateStrategyPerformance(day, prices, strategy, params, stopLoss, takeProfit) {
  if (prices.length <= 1) return 0;
  
  // Very simplified simulation - in reality would be based on actual trading algorithms
  // This just creates somewhat realistic-looking performance based on price movements
  
  const previousPrice = prices[prices.length - 2];
  const currentPrice = prices[prices.length - 1];
  const priceChange = (currentPrice - previousPrice) / previousPrice;
  
  // Add some randomness and strategy-specific behavior
  let performance = 0;
  
  switch (strategy) {
    case 'sma_crossover':
      // Trend-following strategy performs better in trending markets
      performance = priceChange * (0.8 + Math.random() * 0.4);
      break;
    case 'bollinger_bands':
      // Mean-reversion strategy performs better with volatility
      performance = Math.abs(priceChange) * (Math.random() > 0.5 ? 1 : -1) * 0.7;
      break;
    case 'rsi_oversold':
      // Momentum-based strategy
      performance = Math.sin(day / 10) * priceChange * 1.2;
      break;
    default:
      performance = priceChange * (0.5 + Math.random() * 1);
  }
  
  // Apply risk management (stop loss/take profit)
  if (performance < -stopLoss/100) {
    performance = -stopLoss/100;
  } else if (performance > takeProfit/100) {
    performance = takeProfit/100;
  }
  
  return performance;
}

function updateBacktestChart(chart, data) {
  // Update chart data
  chart.data.labels = data.dates;
  chart.data.datasets[0].data = data.prices;
  chart.data.datasets[1].data = data.performance;
  
  // Update dataset labels
  chart.data.datasets[0].label = 'Price';
  chart.data.datasets[1].label = `Portfolio Value (${data.totalProfit.toFixed(2)}%)`;
  
  // Set y-axis to separate scales for price and performance
  chart.options.scales.y = {
    type: 'linear',
    display: true,
    position: 'left',
    title: {
      display: true,
      text: 'Price',
      color: 'rgba(0, 247, 255, 1)'
    },
    grid: {
      color: 'rgba(255, 255, 255, 0.1)'
    },
    ticks: {
      color: 'rgba(255, 255, 255, 0.7)'
    }
  };
  
  chart.options.scales.y1 = {
    type: 'linear',
    display: true,
    position: 'right',
    title: {
      display: true,
      text: 'Portfolio Value',
      color: 'rgba(0, 255, 127, 1)'
    },
    grid: {
      drawOnChartArea: false
    },
    ticks: {
      color: 'rgba(255, 255, 255, 0.7)'
    }
  };
  
  chart.data.datasets[1].yAxisID = 'y1';
  
  // Refresh the chart
  chart.update();
}

function displayBacktestResults(data, container) {
  // Format results display
  const profitClass = data.totalProfit >= 0 ? 'text-success' : 'text-danger';
  const profitSign = data.totalProfit >= 0 ? '+' : '';
  
  let html = `
    <div class="card">
      <div class="card-title">
        <h3>Backtest Results</h3>
      </div>
      <div class="backtest-summary">
        <div class="row">
          <div class="col">
            <div class="stat-item">
              <div class="stat-value">$${data.initialCapital.toFixed(2)}</div>
              <div class="stat-label">Initial Capital</div>
            </div>
          </div>
          <div class="col">
            <div class="stat-item">
              <div class="stat-value">$${data.finalCapital.toFixed(2)}</div>
              <div class="stat-label">Final Capital</div>
            </div>
          </div>
          <div class="col">
            <div class="stat-item">
              <div class="stat-value ${profitClass}">${profitSign}${data.totalProfit.toFixed(2)}%</div>
              <div class="stat-label">Total Return</div>
            </div>
          </div>
          <div class="col">
            <div class="stat-item">
              <div class="stat-value">${data.winRate.toFixed(1)}%</div>
              <div class="stat-label">Win Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card mt-4">
      <div class="card-title">
        <h3>Trade History</h3>
      </div>
      <div class="trade-history">
        <table class="table table-dark table-hover">
          <thead>
            <tr>
              <th>Entry Date</th>
              <th>Exit Date</th>
              <th>Type</th>
              <th>Entry Price</th>
              <th>Exit Price</th>
              <th>P/L</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  // Add trade rows
  data.trades.forEach(trade => {
    const tradeClass = parseFloat(trade.profitLoss) >= 0 ? 'text-success' : 'text-danger';
    const profitSign = parseFloat(trade.profitLoss) >= 0 ? '+' : '';
    
    html += `
      <tr>
        <td>${trade.entryDate}</td>
        <td>${trade.exitDate}</td>
        <td>${trade.type}</td>
        <td>${trade.entryPrice}</td>
        <td>${trade.exitPrice}</td>
        <td class="${tradeClass}">${profitSign}${trade.profitLoss}%</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="mt-4">
      <button id="save-backtest" class="btn btn-primary">Save Results</button>
      <button id="reset-backtest" class="btn btn-secondary ml-2">New Backtest</button>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Set up button event handlers
  document.getElementById('save-backtest').addEventListener('click', function() {
    saveBacktestResults(
      document.getElementById('backtest-asset').value,
      document.getElementById('backtest-timeframe').value,
      document.getElementById('backtest-strategy').value,
      data.totalProfit
    );
    showFlashMessage('Backtest results saved successfully', 'success');
  });
  
  document.getElementById('reset-backtest').addEventListener('click', function() {
    // Just refresh the form
    document.getElementById('backtest-form').reset();
    // Update strategy parameters for default strategy
    updateStrategyParameters(document.getElementById('backtest-strategy').value);
    // Clear results
    container.innerHTML = '';
  });
}

function saveBacktestResults(asset, timeframe, strategy, profit) {
  // Check if user is logged in
  fetch('/user-status')
    .then(response => response.json())
    .then(data => {
      if (data.status !== 'authenticated') {
        showFlashMessage('You need to log in to save results', 'warning');
        return;
      }
      
      // Save backtest results
      fetch('/save-backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          asset: asset,
          timeframe: timeframe,
          strategy: strategy,
          profit: parseFloat(profit.toFixed(2)),
          timestamp: new Date().toISOString()
        })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            showFlashMessage('Backtest results saved successfully', 'success');
          } else {
            showFlashMessage('Error saving backtest results', 'error');
          }
        })
        .catch(error => {
          console.error('Error saving backtest results:', error);
          showFlashMessage('Error saving backtest results', 'error');
        });
    })
    .catch(error => {
      console.error('Error checking user status:', error);
    });
}
