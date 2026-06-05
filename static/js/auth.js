// Authentication functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    
    // Set up skip login button
    const skipLoginButton = document.getElementById('skip-login');
    if (skipLoginButton) {
      skipLoginButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/skip-login';
      });
    }
  }
  
  // Initialize registration form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegistration);
  }
  
  // Handle password visibility toggle
  const passwordToggles = document.querySelectorAll('.password-toggle');
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const passwordField = document.getElementById(this.getAttribute('data-target'));
      if (passwordField) {
        if (passwordField.type === 'password') {
          passwordField.type = 'text';
          this.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
          passwordField.type = 'password';
          this.innerHTML = '<i class="fas fa-eye"></i>';
        }
      }
    });
  });
});

function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    showFlashMessage('Please enter both username and password', 'warning');
    return;
  }
  
  // Form is handled by the server via POST submission
  // Since our server implementation handles the login form directly
  // we just need to submit the form
  this.submit();
}

function handleRegistration(e) {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    showFlashMessage('Please fill out all fields', 'warning');
    return;
  }
  
  if (password !== confirmPassword) {
    showFlashMessage('Passwords do not match', 'warning');
    return;
  }
  
  if (password.length < 6) {
    showFlashMessage('Password must be at least 6 characters', 'warning');
    return;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showFlashMessage('Please enter a valid email address', 'warning');
    return;
  }
  
  // Form is handled by the server via POST submission
  this.submit();
}

// Function to show flash messages (already defined in main.js)
// Included here for completeness
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
