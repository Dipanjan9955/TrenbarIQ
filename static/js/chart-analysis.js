  // Chart Analysis functionality
  document.addEventListener('DOMContentLoaded', function () {
    const analysisTab = document.getElementById('ai-analysis-tab');
    if (!analysisTab) return;

    initChartAnalysis();
  });

  function initChartAnalysis() {
    const fileInput = document.getElementById('chart-upload');
    const imagePreview = document.getElementById('chart-preview');
    const analysisResult = document.getElementById('analysis-result');
    const analyzeButton = document.getElementById('analyze-button');
    const loader = document.getElementById('analysis-loader');

    if (!fileInput || !imagePreview || !analysisResult || !analyzeButton || !loader) return;

    // Handle file selection for preview
    fileInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (!file) return;

      // Show image preview
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.style.display = 'block';

      // Clear previous results
      analysisResult.innerHTML = '';
      analysisResult.style.display = 'none';

      // Enable analyze button
      analyzeButton.disabled = false;
    });

    // Handle analyze button click
    analyzeButton.addEventListener('click', function() {
      const file = fileInput.files[0];
      if (!file) {
        showMessage('Please select a chart image first', 'warning');
        return;
      }

      // Show loader
      loader.classList.add('active');
      analysisResult.style.display = 'none';
      analyzeButton.disabled = true;

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);

      // Send request to analyze endpoint
      fetch('/analyze', {
        method: 'POST',
        body: formData,
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }

        // Process the result
        let resultText = data.result.trim();
        let jsonData;

        // Remove backticks if present
        if (resultText.includes('```json')) {
          resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        } else if (resultText.startsWith('```') && resultText.endsWith('```')) {
          resultText = resultText.substring(3, resultText.length - 3).trim();
        }

        try {
          // Parse JSON
          jsonData = typeof resultText === 'string' ? JSON.parse(resultText) : resultText;
          displayAnalysisResult(jsonData, file.name);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          displayAnalysisAsText(resultText, file.name);
        }
      })
      .catch(error => {
        console.error('Error analyzing chart:', error);
        analysisResult.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error analyzing chart: ${error.message}</p>
            <p>Please try again or check the console for more details.</p>
          </div>`;
        analysisResult.style.display = 'block';
      })
      .finally(() => {
        // Hide loader
        loader.classList.remove('active');
        analyzeButton.disabled = false;
      });
    });
  }

  function displayAnalysisAsText(text, filename) {
    const analysisResult = document.getElementById('analysis-result');
    if (!analysisResult) return;

    // Try to extract symbol from filename
    let symbol = extractSymbolFromFilename(filename);

    analysisResult.innerHTML = `
      <div class="analysis-content">
        <div class="analysis-section">
          <h3>Analysis Result</h3>
          <div class="analysis-details">
            <p>${text}</p>
          </div>
        </div>
        <div class="save-analysis-container">
          <button id="save-analysis-btn" class="btn btn-primary">
            <i class="fas fa-save"></i> Save Analysis to Profile
          </button>
        </div>
      </div>`;

    analysisResult.style.display = 'block';
    analysisResult.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Add event listener to save button
    document.getElementById('save-analysis-btn').addEventListener('click', function() {
      saveAnalysisToProfile(text, symbol);
    });
  }

  function displayAnalysisResult(data, filename) {
    const analysisResult = document.getElementById('analysis-result');
    if (!analysisResult) return;

    // Try to extract symbol from filename
    let symbol = extractSymbolFromFilename(filename);

    analysisResult.innerHTML = '';
    analysisResult.style.display = 'block';

    try {
      let html = '<div class="analysis-content">';

      // If result is an object, format it properly
      if (typeof data === 'object' && data !== null) {
        let index = 0;
        for (const [key, value] of Object.entries(data)) {
          html += `
            <div class="analysis-section json-block" style="--index: ${index}">
              <h3>${formatKey(key)}</h3>
              <div class="analysis-details">
                ${formatValue(value, 0)}
              </div>
            </div>`;
          index++;
        }
      } else {
        // Display as text (fallback)
        html += `<p>${data}</p>`;
      }

      // Add save button after analysis content
      html += `
        <div class="save-analysis-container">
          <button id="save-analysis-btn" class="btn btn-primary">
            <i class="fas fa-save"></i> Save Analysis to Profile
          </button>
        </div>
      `;

      html += '</div>';
      analysisResult.innerHTML = html;

      // Scroll to result
      analysisResult.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Add event listener to save button
      document.getElementById('save-analysis-btn').addEventListener('click', function() {
        saveAnalysisToProfile(data, symbol);
      });

    } catch (error) {
      console.error('Error displaying analysis:', error);
      analysisResult.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error displaying analysis results. Please try again.</p>
        </div>`;
    }
  }

  // Try to extract symbol from filename (e.g., "BTCUSDT_1d.png" → "BTCUSDT")
  function extractSymbolFromFilename(filename) {
    if (!filename) return 'UNKNOWN';

    // Common patterns: BTCUSDT.png, BTCUSDT_1d.png, BTC_USD_1d.png
    const symbolMatch = filename.match(/^([A-Za-z0-9_]+)/);
    if (symbolMatch) {
      return symbolMatch[1].toUpperCase();
    }
    return 'UNKNOWN';
  }

  // Format JSON keys nicely (e.g., "price_trend" → "Price Trend")
  function formatKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, function(char) {
      return char.toUpperCase();
    });
  }

  // Format JSON values with better readability and nesting control
  function formatValue(value, nestLevel = 0) {
    // Limit nesting to prevent excessive depth
    const MAX_NEST_LEVEL = 2;

    if (value === null || value === undefined) {
      return '<p class="null-value">No data available</p>';
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return '<p class="empty-array">Empty list</p>';
        }

        // For deep nesting, simplify the display
        if (nestLevel >= MAX_NEST_LEVEL) {
          return `<p class="json-array-summary">[${value.length} items]</p>`;
        }

        return `<ul class="json-array">${value.map(item => 
          `<li>${formatValue(item, nestLevel + 1)}</li>`).join('')}</ul>`;
      } else {
        if (Object.keys(value).length === 0) {
          return '<p class="empty-object">Empty object</p>';
        }

        // For deep nesting, simplify the display
        if (nestLevel >= MAX_NEST_LEVEL) {
          return `<p class="json-object-summary">{${Object.keys(value).length} properties}</p>`;
        }

        let result = '<div class="json-object">';
        for (const [k, v] of Object.entries(value)) {
          result += `<div class="json-property">
            <span class="json-key">${formatKey(k)}</span>
            <div class="json-value">${formatValue(v, nestLevel + 1)}</div>
          </div>`;
        }
        result += '</div>';
        return result;
      }
    }

    if (typeof value === 'string') {
      // Check if value is a URL
      const urlPattern = /^(https?:\/\/[^\s]+)$/;
      if (urlPattern.test(value)) {
        return `<a href="${value}" target="_blank" class="json-link">${value}</a>`;
      }

      // Add line breaks for multiline text
      if (value.includes('\n')) {
        return `<span class="json-string json-multiline">${value.replace(/\n/g, '<br>')}</span>`;
      }
    }

    // Handle different data types with appropriate classes
    const valueClass = typeof value;
    return `<span class="json-${valueClass}">${value}</span>`;
  }

  // Display a message notification
  function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `notification ${type}`;
    messageDiv.innerHTML = `
      <div class="notification-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
      </div>
      <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(messageDiv);

    // Add close button handler
    messageDiv.querySelector('.notification-close').addEventListener('click', function() {
      messageDiv.remove();
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add('fade-out');
      setTimeout(() => messageDiv.remove(), 500);
    }, 5000);
  }

  // Save analysis to user profile
  function saveAnalysisToProfile(analysis, symbol = 'UNKNOWN') {
    fetch('/user-status')
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'authenticated') {
          // Convert analysis to string if it's an object
          const analysisData = typeof analysis === 'object' ? JSON.stringify(analysis) : analysis;

          fetch('/save-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              analysis: analysisData,
              symbol: symbol,
              timeframe: '1d',
            }),
          })
          .then((response) => response.json())
          .then((result) => {
            if (result.success) {
              showMessage('Analysis saved successfully!', 'success');
            } else {
              showMessage('Error saving analysis: ' + (result.error || 'Unknown error'), 'error');
            }
          })
          .catch((error) => {
            console.error('Error saving analysis:', error);
            showMessage('Error saving analysis', 'error');
          });
        } else {
          showMessage('Please log in to save analysis', 'warning');
        }
      })
      .catch((error) => {
        console.error('Error checking user status:', error);
        showMessage('Error checking user status', 'error');
      });
  }