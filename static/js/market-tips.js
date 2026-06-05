// Enhanced Market Tips functionality with real-time data
document.addEventListener('DOMContentLoaded', function() {
  const marketTipsTab = document.getElementById('market-tips-tab');
  if (!marketTipsTab) return;

  // Initialize the Market Tips tab with all sections
  initMarketTipsTab();

  // Initial data load
  loadAllData();

  // Set up auto-refresh timer (every 5 minutes)
  setInterval(loadAllData, 5 * 60 * 1000);
});
// Load all data at once
function loadAllData() {
  loadMarketSentiment();
  loadTrendingAssets();
  loadMarketNews();
  loadMarketTips();
}

function initMarketTipsTab() {
  const marketTipsTab = document.getElementById('market-tips-tab');

  // Create the basic structure for the enhanced market tips section
  marketTipsTab.innerHTML = `
    <div class="market-dashboard">
      <!-- Market Sentiment Overview -->
      <div class="market-section sentiment-overview">
        <div class="section-header">
          <h2><i class="fas fa-chart-line"></i> Market Sentiment</h2>
          <div class="header-actions">
            <button id="refresh-sentiment" class="btn-refresh">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div id="sentiment-container" class="section-content">
          <div id="sentiment-loader" class="loader-container">
            <div class="loader"></div>
            <div class="loader-text">Loading sentiment data...</div>
          </div>
        </div>
      </div>

      <!-- Trending Assets -->
      <div class="market-section trending-assets">
        <div class="section-header">
          <h2><i class="fas fa-fire"></i> Trending Assets</h2>
          <div class="header-actions">
            <button id="refresh-trending" class="btn-refresh">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div id="trending-container" class="section-content">
          <div id="trending-loader" class="loader-container">
            <div class="loader"></div>
            <div class="loader-text">Loading trending assets...</div>
          </div>
        </div>
      </div>

      <!-- Market News -->
      <div class="market-section market-news">
        <div class="section-header">
          <h2><i class="fas fa-newspaper"></i> Market News</h2>
          <div class="header-actions">
            <div class="news-filters">
              <select id="news-category" class="news-filter">
                <option value="all">All Categories</option>
                <option value="crypto">Crypto</option>
                <option value="stocks">Stocks</option>
                <option value="forex">Forex</option>
                <option value="commodities">Commodities</option>
              </select>
            </div>
            <button id="refresh-news" class="btn-refresh">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div id="news-container" class="section-content">
          <div id="news-loader" class="loader-container">
            <div class="loader"></div>
            <div class="loader-text">Loading market news...</div>
          </div>
        </div>
      </div>

      <!-- Expert Tips -->
      <div class="market-section expert-tips">
        <div class="section-header">
          <h2><i class="fas fa-lightbulb"></i> Trading Insights</h2>
          <div class="header-actions">
            <div class="filter-buttons">
              <button class="filter-sentiment active" data-sentiment="all">All</button>
              <button class="filter-sentiment" data-sentiment="bullish">Bullish</button>
              <button class="filter-sentiment" data-sentiment="neutral">Neutral</button>
              <button class="filter-sentiment" data-sentiment="bearish">Bearish</button>
            </div>
            <button id="refresh-tips" class="btn-refresh">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div id="market-tips-container" class="section-content">
          <div id="tips-loader" class="loader-container">
            <div class="loader"></div>
            <div class="loader-text">Loading trading insights...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Set up event listeners for refresh buttons
  document.getElementById('refresh-sentiment').addEventListener('click', () => loadMarketSentiment(true));
  document.getElementById('refresh-trending').addEventListener('click', () => loadTrendingAssets(true));
  document.getElementById('refresh-news').addEventListener('click', () => loadMarketNews(true));

  // Set up news category filter
  const newsCategory = document.getElementById('news-category');
  if (newsCategory) {
    newsCategory.addEventListener('change', function() {
      loadMarketNews(true, this.value);
    });
  }

  // Set up sentiment filter buttons
  const filterButtons = document.querySelectorAll('.filter-sentiment');
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Filter tips
      const sentiment = this.getAttribute('data-sentiment');
      filterTipsBySentiment(sentiment);
    });
  });
}

// Load market tips from server
function loadMarketTips(showLoader = false) {
  const tipsContainer = document.getElementById('market-tips-container');
  const loader = document.getElementById('tips-loader');

  if (!tipsContainer) return;

  // Show loader if requested
  if (showLoader && loader) {
    loader.classList.add('active');
    tipsContainer.innerHTML = '';
  }

  // Fetch market tips from the server
  fetch('/market-tips')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load market tips');
      }
      return response.json();
    })
    .then(tips => {
      // Hide loader
      if (loader) loader.classList.remove('active');

      // Display tips
      displayMarketTips(tips, tipsContainer);
    })
    .catch(error => {
      console.error('Error loading market tips:', error);

      // Hide loader
      if (loader) loader.classList.remove('active');

      // Show error message
      tipsContainer.innerHTML = `
        <div class="alert alert-danger">
          <h4>Error Loading Market Tips</h4>
          <p>${error.message}</p>
          <button class="btn btn-outline-danger mt-3" onclick="loadMarketTips(true)">
            Try Again
          </button>
        </div>
      `;
    });
}

// Display market tips in the container
function displayMarketTips(tips, container) {
  if (!tips || tips.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <h4>No Market Tips Available</h4>
        <p>Check back later for market insights.</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Sort tips by timestamp (newest first)
  tips.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Create HTML for each tip
  tips.forEach((tip, index) => {
    const date = new Date(tip.timestamp);
    const formattedDate = date.toLocaleString();

    // Add animation delay based on index
    const delay = index * 100;

    // Create different icons based on sentiment
    let sentimentIcon = 'fa-balance-scale';
    if (tip.sentiment === 'bullish') sentimentIcon = 'fa-arrow-up';
    else if (tip.sentiment === 'bearish') sentimentIcon = 'fa-arrow-down';

    html += `
      <div class="market-tip animate-in" style="animation-delay: ${delay}ms;">
        <div class="tip-header">
          <h3 class="tip-title">
            <i class="fas ${sentimentIcon} sentiment-icon-${tip.sentiment}"></i>
            ${tip.title}
          </h3>
          <span class="tip-sentiment sentiment-${tip.sentiment}">${tip.sentiment}</span>
        </div>
        <p class="tip-description">${tip.description}</p>
        <div class="tip-meta">
          <div class="tip-assets">
            ${tip.assets ? tip.assets.map(asset => `<span class="tip-asset">${asset}</span>`).join('') : ''}
          </div>
          <div class="tip-timestamp">
            <i class="far fa-clock"></i> ${formattedDate}
          </div>
        </div>
      </div>
    `;
  });

  // Add last updated timestamp
  html += `
    <div class="last-updated">
      <i class="fas fa-sync-alt"></i> Last updated: ${new Date().toLocaleString()}
    </div>
  `;

  container.innerHTML = html;
}

// Function to filter tips by sentiment
function filterTipsBySentiment(sentiment) {
  const tips = document.querySelectorAll('.market-tip');

  if (sentiment === 'all') {
    tips.forEach(tip => {
      tip.style.display = 'block';
    });
    return;
  }

  tips.forEach(tip => {
    const tipSentiment = tip.querySelector('.tip-sentiment').textContent;
    if (tipSentiment === sentiment) {
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  });
}

// Load and display market sentiment data
function loadMarketSentiment(showLoader = false) {
  const sentimentContainer = document.getElementById('sentiment-container');
  const loader = document.getElementById('sentiment-loader');

  if (!sentimentContainer) return;

  // Show loader if requested
  if (showLoader && loader) {
    loader.classList.add('active');
    sentimentContainer.innerHTML = '';
  }

  // Fetch market sentiment data from the server
  fetch('/market-sentiment')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load market sentiment');
      }
      return response.json();
    })
    .then(data => {
      // Hide loader
      if (loader) loader.classList.remove('active');

      // Display sentiment data
      displayMarketSentiment(data, sentimentContainer);
    })
    .catch(error => {
      console.error('Error loading market sentiment:', error);

      // Hide loader
      if (loader) loader.classList.remove('active');

      // Show error message
      sentimentContainer.innerHTML = `
        <div class="alert alert-danger">
          <h4>Error Loading Sentiment Data</h4>
          <p>${error.message}</p>
          <button class="btn btn-outline-danger mt-3" onclick="loadMarketSentiment(true)">
            Try Again
          </button>
        </div>
      `;
    });
}

// Display market sentiment data
function displayMarketSentiment(data, container) {
  if (!data || !data.overall) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <h4>No Sentiment Data Available</h4>
        <p>Check back later for market sentiment.</p>
      </div>
    `;
    return;
  }

  // Calculate overall sentiment class
  let sentimentClass = 'neutral';
  if (data.overall >= 70) sentimentClass = 'very-bullish';
  else if (data.overall >= 55) sentimentClass = 'bullish';
  else if (data.overall <= 30) sentimentClass = 'very-bearish';
  else if (data.overall <= 45) sentimentClass = 'bearish';

  // Create gauge display for overall sentiment
  const html = `
    <div class="sentiment-overview-container">
      <div class="sentiment-gauge-wrapper">
        <div class="sentiment-gauge">
          <div class="gauge-indicator" style="transform: rotate(${(data.overall / 100) * 180 - 90}deg);"></div>
          <div class="gauge-value sentiment-${sentimentClass}">${data.overall}<span>%</span></div>
          <div class="gauge-label">Market Sentiment</div>
        </div>
      </div>

      <div class="sentiment-breakdown">
        <div class="sentiment-title">Market Mood</div>
        <div class="sentiment-mood sentiment-${sentimentClass}">
          <i class="fas ${sentimentClass === 'very-bullish' ? 'fa-grin-stars' : 
                          sentimentClass === 'bullish' ? 'fa-smile' :
                          sentimentClass === 'neutral' ? 'fa-meh' :
                          sentimentClass === 'bearish' ? 'fa-frown' : 'fa-dizzy'}"></i>
          <span>${sentimentClass.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
        </div>

        <div class="sentiment-categories">
          ${Object.entries(data.categories || {}).map(([category, value]) => {
            let catSentimentClass = 'neutral';
            if (value >= 70) catSentimentClass = 'very-bullish';
            else if (value >= 55) catSentimentClass = 'bullish';
            else if (value <= 30) catSentimentClass = 'very-bearish';
            else if (value <= 45) catSentimentClass = 'bearish';

            return `
              <div class="sentiment-category">
                <div class="category-name">${category}</div>
                <div class="category-bar">
                  <div class="category-progress sentiment-${catSentimentClass}" style="width: ${value}%;">
                    <span>${value}%</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="sentiment-insights">
      <div class="sentiment-insight-title">
        <i class="fas fa-brain"></i> AI Sentiment Analysis
      </div>
      <p class="sentiment-summary">${data.summary || 'No sentiment summary available.'}</p>
      <div class="sentiment-time">Last analyzed: ${new Date(data.timestamp).toLocaleString()}</div>
    </div>
  `;

  container.innerHTML = html;
}

// Load and display market news
function loadMarketNews(showLoader = false, category = 'all') {
  const newsContainer = document.getElementById('news-container');
  const loader = document.getElementById('news-loader');

  if (!newsContainer) return;

  // Show loader if requested
  if (showLoader && loader) {
    loader.classList.add('active');
    newsContainer.innerHTML = '';
  }

  // Build the URL with category filter if needed
  let url = '/market-news';
  if (category && category !== 'all') {
    url += `?category=${category}`;
  }

  // Fetch market news from the server
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load market news');
      }
      return response.json();
    })
    .then(news => {
      // Hide loader
      if (loader) loader.classList.remove('active');

      // Display news
      displayMarketNews(news, newsContainer);
    })
    .catch(error => {
      console.error('Error loading market news:', error);

      // Hide loader
      if (loader) loader.classList.remove('active');

      // Show error message
      newsContainer.innerHTML = `
        <div class="alert alert-danger">
          <h4>Error Loading Market News</h4>
          <p>${error.message}</p>
          <button class="btn btn-outline-danger mt-3" onclick="loadMarketNews(true, '${category}')">
            Try Again
          </button>
        </div>
      `;
    });
}

// Display market news
function displayMarketNews(news, container) {
  if (!news || news.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <h4>No Market News Available</h4>
        <p>Check back later for the latest market news.</p>
      </div>
    `;
    return;
  }

  let html = '<div class="news-grid">';

  // Sort news by date (newest first)
  news.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  // Create HTML for each news item
  news.forEach((item, index) => {
    const date = new Date(item.published_at);
    const formattedDate = date.toLocaleString();

    // Add animation delay based on index
    const delay = index * 100;

    // Format source name
    const source = item.source || 'Unknown Source';

    // Default image if none provided
    const imageUrl = item.image_url || 'https://via.placeholder.com/300x200?text=No+Image';

    // Impact indicator
    let impactClass = '';
    let impactLabel = '';

    if (item.impact) {
      if (item.impact === 'high') {
        impactClass = 'high-impact';
        impactLabel = 'High Impact';
      } else if (item.impact === 'medium') {
        impactClass = 'medium-impact';
        impactLabel = 'Medium Impact';
      } else {
        impactClass = 'low-impact';
        impactLabel = 'Low Impact';
      }
    }

    html += `
      <div class="news-item animate-in" style="animation-delay: ${delay}ms;">
        <div class="news-image" style="background-image: url('${imageUrl}');">
          ${item.category ? `<div class="news-category">${item.category}</div>` : ''}
          ${impactLabel ? `<div class="news-impact ${impactClass}">${impactLabel}</div>` : ''}
        </div>
        <div class="news-content">
          <h3 class="news-title">${item.title}</h3>
          <p class="news-summary">${item.summary || 'No summary available.'}</p>
          <div class="news-meta">
            <div class="news-source">${source}</div>
            <div class="news-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</div>
          </div>
          ${item.url ? `<a href="${item.url}" target="_blank" class="news-link">Read More <i class="fas fa-external-link-alt"></i></a>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Add last updated timestamp
  html += `
    <div class="last-updated">
      <i class="fas fa-sync-alt"></i> Last updated: ${new Date().toLocaleString()}
    </div>
  `;

  container.innerHTML = html;
}

// Load and display trending assets
function loadTrendingAssets(showLoader = false) {
  const trendingContainer = document.getElementById('trending-container');
  const loader = document.getElementById('trending-loader');

  if (!trendingContainer) return;

  // Show loader if requested
  if (showLoader && loader) {
    loader.classList.add('active');
    trendingContainer.innerHTML = '';
  }

  // Fetch trending assets from the server
  fetch('/trending-assets')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load trending assets');
      }
      return response.json();
    })
    .then(assets => {
      // Hide loader
      if (loader) loader.classList.remove('active');

      // Display trending assets
      displayTrendingAssets(assets, trendingContainer);
    })
    .catch(error => {
      console.error('Error loading trending assets:', error);

      // Hide loader
      if (loader) loader.classList.remove('active');

      // Show error message
      trendingContainer.innerHTML = `
        <div class="alert alert-danger">
          <h4>Error Loading Trending Assets</h4>
          <p>${error.message}</p>
          <button class="btn btn-outline-danger mt-3" onclick="loadTrendingAssets(true)">
            Try Again
          </button>
        </div>
      `;
    });
}

// Display trending assets
function displayTrendingAssets(assets, container) {
  if (!assets || assets.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <h4>No Trending Assets Available</h4>
        <p>Check back later for trending assets.</p>
      </div>
    `;
    return;
  }

  // Sort assets by change percentage (highest first)
  assets.sort((a, b) => Math.abs(b.change_24h) - Math.abs(a.change_24h));

  let html = '<div class="trending-grid">';

  // Create HTML for each trending asset
  assets.forEach((asset, index) => {
    // Determine change class
    const changeClass = asset.change_24h >= 0 ? 'positive' : 'negative';
    const changeIcon = asset.change_24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

    // Add animation delay based on index
    const delay = index * 100;

    // Format change percentage
    const changePercent = Math.abs(asset.change_24h).toFixed(2);

    // Format current price
    const price = typeof asset.price === 'number' ? asset.price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }) : asset.price;

    // Format volume
    const volume = typeof asset.volume_24h === 'number' ? asset.volume_24h.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) : asset.volume_24h;

    html += `
      <div class="trending-asset animate-in" style="animation-delay: ${delay}ms;">
        <div class="asset-header">
          <div class="asset-name">
            ${asset.symbol} <span class="asset-fullname">${asset.name}</span>
          </div>
          <div class="asset-change ${changeClass}">
            <i class="fas ${changeIcon}"></i> ${changePercent}%
          </div>
        </div>
        <div class="asset-chart">
          <div class="asset-mini-chart ${changeClass}" style="--change: ${asset.change_24h}%;"></div>
        </div>
        <div class="asset-details">
          <div class="asset-stat">
            <div class="stat-label">Price</div>
            <div class="stat-value">${price}</div>
          </div>
          <div class="asset-stat">
            <div class="stat-label">Vol. 24h</div>
            <div class="stat-value">${volume}</div>
          </div>
          ${asset.market_cap ? `
            <div class="asset-stat">
              <div class="stat-label">Market Cap</div>
              <div class="stat-value">${typeof asset.market_cap === 'number' ? asset.market_cap.toLocaleString('en-US') : asset.market_cap}</div>
            </div>
          ` : ''}
        </div>
        <div class="asset-alerts">
          <button class="add-alert-btn" data-symbol="${asset.symbol}">
            <i class="fas fa-bell"></i> Set Alert
          </button>
          <button class="view-chart-btn" data-symbol="${asset.symbol}">
            <i class="fas fa-chart-line"></i> Chart
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Add last updated timestamp
  html += `
    <div class="last-updated">
      <i class="fas fa-sync-alt"></i> Last updated: ${new Date().toLocaleString()}
    </div>
  `;

  container.innerHTML = html;

  // Add event listeners for alert buttons
  container.querySelectorAll('.add-alert-btn').forEach(button => {
    button.addEventListener('click', function() {
      const symbol = this.getAttribute('data-symbol');
      showAlertModal(symbol);
    });
  });

  // Add event listeners for view chart buttons
  container.querySelectorAll('.view-chart-btn').forEach(button => {
    button.addEventListener('click', function() {
      const symbol = this.getAttribute('data-symbol');
      // Redirect to charts tab with the selected symbol
      const chartsTab = document.querySelector('[data-tab="charts-tab"]');
      if (chartsTab) {
        chartsTab.click();
        // Set the symbol in the chart viewer (you'll need to implement this function)
        setTimeout(() => {
          if (window.setChartSymbol) {
            window.setChartSymbol(symbol);
          }
        }, 100);
      }
    });
  });
}

// Show alert modal
function showAlertModal(symbol) {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal-container alert-modal">
      <div class="modal-header">
        <h3>Set Price Alert for ${symbol}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-content">
        <form id="alert-form">
          <div class="form-group">
            <label for="alert-type">Alert Type</label>
            <select id="alert-type" class="form-control">
              <option value="price-above">Price Above</option>
              <option value="price-below">Price Below</option>
              <option value="percent-change">Percent Change</option>
            </select>
          </div>

          <div class="form-group">
            <label for="alert-value">Alert Value</label>
            <input type="number" id="alert-value" class="form-control" step="0.0001" required>
          </div>

          <div class="form-group">
            <label for="alert-expiry">Expires After</label>
            <select id="alert-expiry" class="form-control">
              <option value="1d">1 Day</option>
              <option value="3d">3 Days</option>
              <option value="7d">1 Week</option>
              <option value="30d">1 Month</option>
              <option value="never">Never</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary">Set Alert</button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add close button event listener
  modal.querySelector('.modal-close').addEventListener('click', function() {
    modal.remove();
  });

  // Close on outside click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Handle form submission
  const form = modal.querySelector('#alert-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const alertType = document.getElementById('alert-type').value;
    const alertValue = document.getElementById('alert-value').value;
    const alertExpiry = document.getElementById('alert-expiry').value;

    // Here you would normally send this to the server
    console.log('Setting alert:', { symbol, alertType, alertValue, alertExpiry });

    // Show success message
    showNotification(`Alert set for ${symbol}`, 'success');

    // Close modal
    modal.remove();
  });
}

// Show a notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="notification-close">&times;</button>
  `;

  document.body.appendChild(notification);

  // Add close button handler
  notification.querySelector('.notification-close').addEventListener('click', function() {
    notification.remove();
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}