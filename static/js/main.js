// Global variables
let currentUser = null;
let isGuest = false;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check user status
  checkUserStatus();
  
  // Initialize tabs
  initTabs();
  
  // Setup flash message functionality
  setupFlashMessages();
});

// Check if user is logged in, guest, or not authenticated
function checkUserStatus() {
  fetch('/user-status')
    .then(response => response.json())
    .then(data => {
      if (data.status === 'authenticated') {
        currentUser = data.username;
        isGuest = false;
        updateUIForAuthenticatedUser(currentUser);
      } else if (data.status === 'guest') {
        isGuest = true;
        updateUIForGuestUser();
      } else {
        // Not authenticated, redirect to login
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
      }
    })
    .catch(error => {
      console.error('Error checking user status:', error);
    });
}

// Update UI for authenticated users
function updateUIForAuthenticatedUser(username) {
  const userInfoElement = document.getElementById('user-info');
  if (userInfoElement) {
    userInfoElement.innerHTML = `
      <span>Welcome, ${username}</span>
      <a href="/logout" class="btn btn-outline-light btn-sm ml-2">Logout</a>
    `;
  }
  
  // Show full functionality
  const restrictedElements = document.querySelectorAll('.auth-required');
  restrictedElements.forEach(el => {
    el.style.display = 'block';
  });
  
  // Update profile tab if exists
  const profileTab = document.getElementById('profile-tab-content');
  if (profileTab) {
    loadUserProfile(username);
  }
}

// Update UI for guest users
function updateUIForGuestUser() {
  const userInfoElement = document.getElementById('user-info');
  if (userInfoElement) {
    userInfoElement.innerHTML = `
      <span>Guest User</span>
      <a href="/login" class="btn btn-primary btn-sm ml-2">Login</a>
    `;
  }
  
  // Restrict certain functionalities
  const restrictedElements = document.querySelectorAll('.auth-required');
  restrictedElements.forEach(el => {
    el.style.display = 'none';
  });
  
  // Show guest message on restricted tabs
  const restrictedTabs = document.querySelectorAll('.auth-required-tab');
  restrictedTabs.forEach(tab => {
    tab.innerHTML = `
      <div class="card">
        <div class="card-body text-center">
          <h3>This feature requires an account</h3>
          <p>Please login or register to access full functionality.</p>
          <div class="mt-4">
            <a href="/login" class="btn btn-primary">Login</a>
            <a href="/register" class="btn btn-secondary ml-3">Register</a>
          </div>
        </div>
      </div>
    `;
  });
}

// Initialize tab functionality
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab, .nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    // Remove active class from all tabs and contents
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(tabId);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
  }

  // Add click handlers to all tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Set initial active tab
  const initialTab = document.querySelector('.tab');
  if (initialTab) {
    switchTab(initialTab.getAttribute('data-tab'));
  }
});
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (tabs.length === 0 || tabContents.length === 0) return;
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
      
      // Save the active tab to session storage for persistence
      sessionStorage.setItem('activeTab', targetId);
    });
  });
  
  // Restore active tab from session storage or set default
  const activeTabId = sessionStorage.getItem('activeTab') || 'ai-analysis-tab';
  document.querySelector(`[data-tab="${activeTabId}"]`).click();
}

// Handle flash messages
function setupFlashMessages() {
  const flashMessages = document.querySelectorAll('.flash-message');
  
  flashMessages.forEach(message => {
    // Auto-remove flash message after 5 seconds
    setTimeout(() => {
      message.remove();
    }, 5000);
    
    // Allow user to dismiss message
    message.addEventListener('click', () => {
      message.remove();
    });
  });
}

// Create and display a flash message programmatically
function showFlashMessage(message, type = 'info') {
  const flashContainer = document.querySelector('.flash-messages');
  if (!flashContainer) {
    const container = document.createElement('div');
    container.className = 'flash-messages';
    document.body.appendChild(container);
  }
  
  const messageElement = document.createElement('div');
  messageElement.className = `flash-message flash-${type}`;
  messageElement.textContent = message;
  
  document.querySelector('.flash-messages').appendChild(messageElement);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    messageElement.remove();
  }, 5000);
  
  // Allow user to dismiss by clicking
  messageElement.addEventListener('click', () => {
    messageElement.remove();
  });
}

// Load user profile data
function loadUserProfile(username) {
  const profileTab = document.getElementById('profile-tab-content');
  if (!profileTab) return;
  
  // Show profile info
  profileTab.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">
        ${username.charAt(0).toUpperCase()}
      </div>
      <div class="profile-info">
        <h2>${username}</h2>
        <p>Member since: ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
    
    <div class="profile-stats">
      <div class="stat-item">
        <div class="stat-value">0</div>
        <div class="stat-label">Chart Analysis</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">0</div>
        <div class="stat-label">Backtest Runs</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">0%</div>
        <div class="stat-label">Win Rate</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">
        <h3>Preferences</h3>
      </div>
      <div class="form-group">
        <label class="form-label">Theme</label>
        <select id="theme-preference" class="form-control">
          <option value="dark" selected>Dark Theme</option>
          <option value="darker">Darker Theme</option>
          <option value="blue">Blue Accent</option>
          <option value="purple">Purple Accent</option>
          <option value="green">Green Accent</option>
        </select>
      </div>
      <div class="form-group">
        <div class="custom-control custom-switch">
          <input type="checkbox" class="custom-control-input" id="notifications-preference" checked>
          <label class="custom-control-label" for="notifications-preference">Enable Notifications</label>
        </div>
      </div>
      <button id="save-preferences" class="btn btn-primary">Save Preferences</button>
    </div>
    
    <div class="card mt-4">
      <div class="card-title">
        <h3>Backtest History</h3>
      </div>
      <div id="backtest-history">
        <p>No backtest results yet.</p>
      </div>
    </div>
  `;
  
  // Load preferences
  fetch('/get-preferences')
    .then(response => response.json())
    .then(data => {
      if (data && Object.keys(data).length > 0) {
        // Set theme preference
        const themeSelect = document.getElementById('theme-preference');
        if (themeSelect && data.theme) {
          themeSelect.value = data.theme;
        }
        
        // Set notifications preference
        const notificationsCheck = document.getElementById('notifications-preference');
        if (notificationsCheck && data.notifications !== undefined) {
          notificationsCheck.checked = data.notifications;
        }
      }
    })
    .catch(error => {
      console.error('Error loading preferences:', error);
    });
  
  // Load backtest history
  fetch('/get-backtest-results')
    .then(response => response.json())
    .then(data => {
      const historyContainer = document.getElementById('backtest-history');
      if (!data || data.length === 0) {
        return;
      }
      
      let historyHTML = '<div class="backtest-history-list">';
      data.forEach((result, index) => {
        const profitClass = result.profit >= 0 ? 'result-positive' : 'result-negative';
        historyHTML += `
          <div class="card mb-2">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <h4>${result.asset} ${result.timeframe}</h4>
                <span class="badge ${profitClass}">${result.profit >= 0 ? '+' : ''}${result.profit}%</span>
              </div>
              <div class="result-item">
                <span>Strategy:</span>
                <span>${result.strategy}</span>
              </div>
              <div class="result-item">
                <span>Date:</span>
                <span>${new Date(result.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        `;
      });
      historyHTML += '</div>';
      
      historyContainer.innerHTML = historyHTML;
    })
    .catch(error => {
      console.error('Error loading backtest history:', error);
    });
  
  // Save preferences event
  document.getElementById('save-preferences').addEventListener('click', function() {
    const themePreference = document.getElementById('theme-preference').value;
    const notificationsPreference = document.getElementById('notifications-preference').checked;
    
    const preferences = {
      theme: themePreference,
      notifications: notificationsPreference
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
          showFlashMessage('Preferences saved successfully', 'success');
        } else {
          showFlashMessage('Error saving preferences', 'error');
        }
      })
      .catch(error => {
        console.error('Error saving preferences:', error);
        showFlashMessage('Error saving preferences', 'error');
      });
  });
}
