// Profile tab functionality
document.addEventListener('DOMContentLoaded', function() {
  const profileTab = document.getElementById('profile-tab');
  if (!profileTab) return;

  // Initialize profile tab listeners
  initProfileTab();

  // Load profile data when the tab is selected
  document.querySelectorAll('.tab, .nav-item').forEach(tab => {
    if (tab.dataset.tab === 'profile-tab') {
      tab.addEventListener('click', function() {
        loadUserProfile();
      });
    }
  });

  // Check if we're already on the profile tab
  setTimeout(() => {
    if (profileTab.classList.contains('active')) {
      loadUserProfile();
    }
  }, 100);
});

function initProfileTab() {
  const profileTab = document.getElementById('profile-tab');

  // Create initial structure
  profileTab.innerHTML = `
    <div class="card">
      <div class="card-title">
        <h2><i class="fas fa-user-circle"></i> User Profile</h2>
      </div>
      <div id="profile-content">
        <div class="loader-container">
          <div class="loader active"></div>
          <div class="loader-text">Loading your profile data...</div>
        </div>
      </div>
    </div>
  `;
}

// Load user profile data
function loadUserProfile() {
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) return;

  // Show loader
  profileContent.innerHTML = `
    <div class="loader-container">
      <div class="loader active"></div>
      <div class="loader-text">Loading profile data...</div>
    </div>
  `;

  // Check user authentication status
  fetch('/user-status')
    .then(response => response.json())
    .then(data => {
      if (data.status === 'authenticated') {
        // User is authenticated, load profile data
        loadAuthenticatedProfile(data.username, data.id);
      } else if (data.status === 'guest') {
        // Guest user
        displayGuestProfile();
      } else {
        // Not authenticated
        displayLoginPrompt();
      }
    })
    .catch(error => {
      console.error('Error fetching user status:', error);
      profileContent.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error loading profile: ${error.message}</p>
          <p>Please try again or check the console for more details.</p>
        </div>
      `;
    });
}

// Display data for authenticated user
function loadAuthenticatedProfile(username, userId) {
  const profileContent = document.getElementById('profile-content');

  // Fetch all user data in parallel
  Promise.all([
    fetch('/get-preferences').then(res => res.ok ? res.json() : {theme: 'dark', default_timeframe: '1d', default_symbol: 'BTCUSDT'}),
    fetch('/get-analyses').then(res => res.ok ? res.json() : []),
    fetch('/get-backtest-results').then(res => res.ok ? res.json() : [])
  ])
  .then(([preferences, analyses, backtestResults]) => {
    console.log("Backtest results:", backtestResults); // Debugging
    // Display the user profile with fetched data
    displayUserProfile(username, userId, preferences, analyses, backtestResults);
  })
  .catch(error => {
    console.error('Error loading profile data:', error);
    profileContent.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading profile data: ${error.message}</p>
        <p>Please try again or check the console for more details.</p>
      </div>
    `;
  });
}

// Display guest profile with limited features
function displayGuestProfile() {
  const profileContent = document.getElementById('profile-content');

  profileContent.innerHTML = `
    <div class="card-content">
      <div class="guest-profile">
        <div class="guest-icon">
          <i class="fas fa-user-secret"></i>
        </div>
        <h3>Guest User</h3>
        <p>You are currently using TrendBar IQ as a guest. To save your analyses and backtest results, please create an account.</p>
        <div class="mt-4">
          <a href="/login" class="btn btn-primary">Login</a>
          <a href="/register" class="btn btn-secondary ml-2">Register</a>
        </div>
      </div>

      <div class="feature-section">
        <h3><i class="fas fa-star"></i> Features Available</h3>
        <div class="feature-grid">
          <div class="feature-item available">
            <i class="fas fa-robot"></i>
            <div class="feature-name">Chart Analysis</div>
          </div>
          <div class="feature-item available">
            <i class="fas fa-chart-line"></i>
            <div class="feature-name">Live Charts</div>
          </div>
          <div class="feature-item available">
            <i class="fas fa-lightbulb"></i>
            <div class="feature-name">Market Tips</div>
          </div>
          <div class="feature-item available">
            <i class="fas fa-flask"></i>
            <div class="feature-name">Backtesting</div>
          </div>
          <div class="feature-item locked">
            <i class="fas fa-save"></i>
            <div class="feature-name">Save Analyses</div>
          </div>
          <div class="feature-item locked">
            <i class="fas fa-history"></i>
            <div class="feature-name">History</div>
          </div>
          <div class="feature-item locked">
            <i class="fas fa-cog"></i>
            <div class="feature-name">Custom Settings</div>
          </div>
          <div class="feature-item locked">
            <i class="fas fa-cloud-upload-alt"></i>
            <div class="feature-name">Cloud Sync</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Display login prompt for unauthenticated users
function displayLoginPrompt() {
  const profileContent = document.getElementById('profile-content');

  profileContent.innerHTML = `
    <div class="auth-container">
      <div class="auth-header">
        <h2>Welcome to TrendBar IQ</h2>
        <p>Please log in or create an account to access your profile</p>
      </div>

      <div class="auth-buttons">
        <a href="/login" class="btn btn-primary btn-lg">
          <i class="fas fa-sign-in-alt"></i> Login
        </a>
        <a href="/register" class="btn btn-secondary btn-lg">
          <i class="fas fa-user-plus"></i> Register
        </a>
        <button id="continue-as-guest" class="btn btn-outline-light mt-3">
          <i class="fas fa-user-secret"></i> Continue as Guest
        </button>
      </div>
    </div>
  `;

  // Add event listener for guest button
  const guestButton = document.getElementById('continue-as-guest');
  if (guestButton) {
    guestButton.addEventListener('click', function() {
      fetch('/skip-login')
        .then(response => {
          if (response.ok) {
            window.location.reload();
          }
        });
    });
  }
}

// Display the full user profile
function displayUserProfile(username, userId, preferences, analyses, backtestResults) {
  const profileContent = document.getElementById('profile-content');

  // Calculate stats
  const totalAnalyses = analyses.length;
  const totalBacktests = backtestResults.length;
  const profitableBacktests = backtestResults.filter(result => {
    // Ensure we're properly parsing the profit_loss value
    const profitLoss = parseFloat(result.profit_loss || 0);
    return profitLoss > 0;
  }).length;

  const winRate = totalBacktests > 0 ? 
    Math.round((profitableBacktests / totalBacktests) * 100) : 0;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // User info
  let userInfo = {
    email: '',
    dob: '',
    mobile: '',
    profession: ''
  };

  // Build profile HTML
  profileContent.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">
        ${username ? username.charAt(0).toUpperCase() : 'U'}
      </div>
      <div class="profile-info">
        <h2>${username || 'User'}</h2>
        <p>Trading enthusiast</p>
      </div>
    </div>

    <div class="profile-stats">
      <div class="stat-item">
        <div class="stat-value">${totalAnalyses}</div>
        <div class="stat-label">Analyses</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalBacktests}</div>
        <div class="stat-label">Backtests</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${winRate}%</div>
        <div class="stat-label">Win Rate</div>
      </div>
    </div>

    <div class="profile-tabs">
      <div class="tab-buttons">
        <button class="profile-tab-btn active" data-target="personal-info-panel">
          <i class="fas fa-user"></i> Personal Info
        </button>
        <button class="profile-tab-btn" data-target="preferences-panel">
          <i class="fas fa-cog"></i> Preferences
        </button>
        <button class="profile-tab-btn" data-target="analyses-panel">
          <i class="fas fa-chart-pie"></i> Analyses
        </button>
        <button class="profile-tab-btn" data-target="backtest-panel">
          <i class="fas fa-flask"></i> Backtests
        </button>
      </div>

      <div class="profile-tab-content">
        <!-- Personal Info Panel -->
        <div id="personal-info-panel" class="tab-panel active">
          <form id="personal-info-form" class="profile-form">
            <div class="form-section">
              <label>
                <span>Username</span>
                <input type="text" name="username" class="form-control" value="${username || ''}" disabled>
              </label>

              <label>
                <span>Email Address</span>
                <input type="email" name="email" class="form-control" value="${userInfo.email || ''}">
              </label>

              <label>
                <span>Date of Birth</span>
                <input type="date" name="dob" class="form-control" value="${userInfo.dob || ''}">
              </label>

              <label>
                <span>Mobile Number</span>
                <input type="tel" name="mobile" class="form-control" value="${userInfo.mobile || ''}">
              </label>

              <label>
                <span>Profession</span>
                <input type="text" name="profession" class="form-control" value="${userInfo.profession || ''}">
              </label>
            </div>

            <button type="submit" class="btn btn-primary save-profile">
              <i class="fas fa-save"></i> Update Profile
            </button>
          </form>
        </div>

        <!-- Preferences Panel -->
        <div id="preferences-panel" class="tab-panel">
          <form id="preferences-form" class="preferences-form">
            <div class="form-section">
              <label>
                <span>Theme</span>
                <select name="theme" class="form-control">
                  <option value="dark" ${preferences.theme === 'dark' ? 'selected' : ''}>Dark</option>
                  <option value="light" ${preferences.theme === 'light' ? 'selected' : ''}>Light</option>
                </select>
              </label>

              <label>
                <span>Default Symbol</span>
                <input type="text" name="default_symbol" class="form-control" 
                  value="${preferences.default_symbol || 'BTCUSDT'}">
              </label>

              <label>
                <span>Default Timeframe</span>
                <select name="default_timeframe" class="form-control">
                  <option value="1m" ${preferences.default_timeframe === '1m' ? 'selected' : ''}>1 Minute</option>
                  <option value="5m" ${preferences.default_timeframe === '5m' ? 'selected' : ''}>5 Minutes</option>
                  <option value="15m" ${preferences.default_timeframe === '15m' ? 'selected' : ''}>15 Minutes</option>
                  <option value="1h" ${preferences.default_timeframe === '1h' ? 'selected' : ''}>1 Hour</option>
                  <option value="4h" ${preferences.default_timeframe === '4h' ? 'selected' : ''}>4 Hours</option>
                  <option value="1d" ${preferences.default_timeframe === '1d' ? 'selected' : ''}>1 Day</option>
                </select>
              </label>

              <label class="checkbox-label">
                <input type="checkbox" name="notifications_enabled" 
                  ${preferences.notifications_enabled ? 'checked' : ''}>
                <span>Enable Notifications</span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary save-preferences">
              <i class="fas fa-save"></i> Save Preferences
            </button>
          </form>
        </div>

        <!-- Analyses Panel -->
        <div id="analyses-panel" class="tab-panel">
          ${analyses.length > 0 ? `
            <div class="analyses-grid">
              ${analyses.map((analysis, index) => `
                <div class="analysis-card">
                  <div class="analysis-header">
                    <h3>${analysis.symbol || 'Chart Analysis'}</h3>
                    <span class="analysis-date">${formatDate(analysis.created_at)}</span>
                  </div>
                  <div class="analysis-tags">
                    <span class="timeframe-tag">${analysis.timeframe || 'N/A'}</span>
                  </div>
                  <button class="btn btn-primary view-analysis-btn" data-index="${index}">
                    <i class="fas fa-eye"></i> View Analysis
                  </button>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <i class="fas fa-chart-area"></i>
              <h3>No Analyses Yet</h3>
              <p>Your saved chart analyses will appear here</p>
              <a href="#" class="btn btn-primary" onclick="document.querySelector('[data-tab=\\'ai-analysis-tab\\']').click()">
                Analyze a Chart
              </a>
            </div>
          `}
        </div>

        <!-- Backtests Panel -->
        <div id="backtest-panel" class="tab-panel">
          ${backtestResults.length > 0 ? `
            <div class="backtests-table">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Strategy</th>
                    <th>Timeframe</th>
                    <th>Profit/Loss</th>
                    <th>Win Rate</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${backtestResults.map(backtest => {
                    // Ensure we safely parse numeric values
                    const profitLoss = parseFloat(backtest.profit_loss || 0);
                    const profitLossPercent = parseFloat(backtest.profit_loss_percent || 0);
                    const winningTrades = parseInt(backtest.winning_trades || 0);
                    const totalTrades = parseInt(backtest.total_trades || 1); // Prevent division by zero
                    const winRate = Math.round((winningTrades / totalTrades) * 100);

                    return `
                      <tr class="${profitLoss >= 0 ? 'profit' : 'loss'}">
                        <td>${backtest.asset || 'Unknown'}</td>
                        <td>${backtest.strategy || 'Custom'}</td>
                        <td>${backtest.timeframe || '1d'}</td>
                        <td class="pnl">${profitLoss.toFixed(2)} 
                          (${profitLossPercent.toFixed(2)}%)</td>
                        <td>${winRate}%</td>
                        <td>${formatDate(backtest.created_at)}</td>
                        <td>
                          <button class="btn btn-sm btn-primary view-backtest-btn" data-id="${backtest.id}">
                            <i class="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i class="fas fa-flask"></i>
              <h3>No Backtests Yet</h3>
              <p>Your backtest results will appear here</p>
              <a href="#" class="btn btn-primary" onclick="document.querySelector('[data-tab=\\'backtest-tab\\']').click()">
                Run a Backtest
              </a>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  const tabButtons = document.querySelectorAll('.profile-tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');

      // Hide all panels
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
      });

      // Show the target panel
      const targetPanel = document.getElementById(this.dataset.target);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // Add form submission handler for preferences
  const preferencesForm = document.getElementById('preferences-form');
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const preferences = {
        theme: formData.get('theme'),
        default_symbol: formData.get('default_symbol'),
        default_timeframe: formData.get('default_timeframe'),
        notifications_enabled: formData.get('notifications_enabled') === 'on'
      };

      fetch('/save-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showNotification('Preferences saved successfully', 'success');
        } else {
          showNotification('Error saving preferences', 'error');
        }
      })
      .catch(error => {
        showNotification('Error saving preferences: ' + error.message, 'error');
      });
    });
  }

  // Add personal info form submission handler
  const personalInfoForm = document.getElementById('personal-info-form');
  if (personalInfoForm) {
    personalInfoForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const personalInfo = {
        email: formData.get('email'),
        dob: formData.get('dob'),
        mobile: formData.get('mobile'),
        profession: formData.get('profession')
      };

      // Here you would typically send this data to a backend endpoint
      // Since there's no actual endpoint, we'll just show a success message
      showNotification('Profile updated successfully', 'success');
    });
  }

  // Add view analysis buttons event listeners
  document.querySelectorAll('.view-analysis-btn').forEach(button => {
    button.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      const analysis = analyses[index];
      if (analysis) {
        try {
          // Parse the result_json safely
          let resultData = {};
          if (analysis.result_json) {
            if (typeof analysis.result_json === 'string') {
              resultData = JSON.parse(analysis.result_json);
            } else if (typeof analysis.result_json === 'object') {
              resultData = analysis.result_json;
            }
          }
          showAnalysisModal(resultData, analysis.symbol, analysis.timeframe);
        } catch (e) {
          console.error("Error parsing analysis JSON:", e);
          showNotification('Error parsing analysis data', 'error');
        }
      }
    });
  });

  // Add view backtest buttons event listeners
  document.querySelectorAll('.view-backtest-btn').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.dataset.id;
      const backtest = backtestResults.find(b => b.id == id);
      if (backtest) {
        showBacktestModal(backtest);
      }
    });
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

// Show analysis modal
function showAnalysisModal(analysisData, symbol, timeframe) {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  let analysisContent = '<p>No analysis data available</p>';

  if (analysisData && typeof analysisData === 'object' && Object.keys(analysisData).length > 0) {
    analysisContent = Object.entries(analysisData).map(([key, value], index) => {
      // Handle different value types
      let formattedValue = '';
      if (typeof value === 'object') {
        formattedValue = `<pre class="json-code">${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        formattedValue = `<p>${value}</p>`;
      }

      return `
        <div class="analysis-section json-block" style="--index: ${index}">
          <h3>${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h3>
          <div class="analysis-details">
            ${formattedValue}
          </div>
        </div>
      `;
    }).join('');
  }

  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>${symbol || 'Chart Analysis'} (${timeframe || 'N/A'})</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-content analysis-content">
        ${analysisContent}
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
}

// Show backtest details modal
function showBacktestModal(backtest) {
  // Safely parse values
  const profitLoss = parseFloat(backtest.profit_loss || 0);
  const profitLossPercent = parseFloat(backtest.profit_loss_percent || 0);
  const winningTrades = parseInt(backtest.winning_trades || 0);
  const losingTrades = parseInt(backtest.losing_trades || 0);
  const totalTrades = parseInt(backtest.total_trades || 0);
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
  const initialCapital = parseFloat(backtest.initial_capital || 0);
  const finalCapital = parseFloat(backtest.final_capital || 0);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Try to parse parameters JSON
  let parameters = {};
  try {
    if (backtest.parameters) {
      if (typeof backtest.parameters === 'string') {
        parameters = JSON.parse(backtest.parameters);
      } else if (typeof backtest.parameters === 'object') {
        parameters = backtest.parameters;
      }
    }
  } catch (e) {
    console.error("Error parsing backtest parameters:", e);
  }

  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container backtest-modal">
      <div class="modal-header">
        <h3>Backtest Details: ${backtest.asset} (${backtest.timeframe})</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-content backtest-content">
        <div class="backtest-summary">
          <div class="backtest-result ${profitLoss >= 0 ? 'profit' : 'loss'}">
            <span class="result-label">Result:</span>
            <span class="result-value">${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(2)}%)</span>
          </div>

          <div class="backtest-metrics">
            <div class="metric">
              <span class="metric-label">Initial Capital:</span>
              <span class="metric-value">${initialCapital.toFixed(2)}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Final Capital:</span>
              <span class="metric-value">${finalCapital.toFixed(2)}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Trades:</span>
              <span class="metric-value">${totalTrades}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Win Rate:</span>
              <span class="metric-value">${winRate}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Strategy:</span>
              <span class="metric-value">${backtest.strategy || 'Custom'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Date:</span>
              <span class="metric-value">${formatDate(backtest.created_at)}</span>
            </div>
          </div>
        </div>

        <h4>Strategy Parameters</h4>
        <div class="parameters-table">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(parameters).map(([key, value]) => `
                <tr>
                  <td>${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                  <td>${value}</td>
                </tr>
              `).join('') || '<tr><td colspan="2">No parameters available</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="trade-summary">
          <h4>Trade Summary</h4>
          <div class="trade-chart">
            <div class="winning-bar" style="width: ${winRate}%;">${winningTrades} Winning (${winRate}%)</div>
            <div class="losing-bar" style="width: ${100-winRate}%;">${losingTrades} Losing (${100-winRate}%)</div>
          </div>
        </div>
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
}