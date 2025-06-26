declare var chrome: any;

// Storage key for LinkedIn likers data
const STORAGE_KEY = 'linkedin_likers_data';

// DOM Elements
let scanBtn: HTMLButtonElement;
let scanBtnText: HTMLSpanElement;
let statusArea: HTMLDivElement;
let resultsArea: HTMLDivElement;
let resultsCount: HTMLDivElement;
let viewResultsBtn: HTMLButtonElement;
let clearDataBtn: HTMLButtonElement;
let openTabBtn: HTMLButtonElement;
let instructionsArea: HTMLDivElement;
let showModalBtn: HTMLButtonElement;

// State
let currentLikers: any[] = [];
let isScanning = false;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  loadStoredData();
  setupMessageListener();
  
  // Auto-start scan when popup opens
  startAutoScan();
});

function initializeElements() {
  scanBtn = document.getElementById('scanBtn') as HTMLButtonElement;
  scanBtnText = document.getElementById('scanBtnText') as HTMLSpanElement;
  statusArea = document.getElementById('statusArea') as HTMLDivElement;
  resultsArea = document.getElementById('resultsArea') as HTMLDivElement;
  resultsCount = document.getElementById('resultsCount') as HTMLDivElement;
  viewResultsBtn = document.getElementById('viewResultsBtn') as HTMLButtonElement;
  clearDataBtn = document.getElementById('clearDataBtn') as HTMLButtonElement;
  openTabBtn = document.getElementById('openTabBtn') as HTMLButtonElement;
  instructionsArea = document.getElementById('instructionsArea') as HTMLDivElement;
  showModalBtn = document.getElementById('showModalBtn') as HTMLButtonElement;
}

function setupEventListeners() {
  scanBtn.addEventListener('click', handleScanClick);
  viewResultsBtn.addEventListener('click', openFullInterface);
  clearDataBtn.addEventListener('click', handleClearData);
  openTabBtn.addEventListener('click', openFullInterface);
  if (showModalBtn) {
    showModalBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, {
        action: 'show_modal',
        profile: {
          name: 'Jane Doe',
          title: 'Product Manager',
          profileUrl: 'https://linkedin.com/in/janedoe',
          detailedInfo: {
            location: 'New York, NY',
            about: 'Product leader with 10+ years experience.',
            experience: [
              { title: 'PM', company: 'BigTech', dates: '2018-2023' }
            ]
          }
        }
      });
    });
  }
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message: any) => {
    if (message.type === 'FETCH_LIKERS_SUCCESS') {
      handleScanSuccess(message.data || []);
    } else if (message.type === 'FETCH_LIKERS_ERROR') {
      handleScanError(message.error || 'Unknown error occurred');
    } else if (message.type === 'DEBUG_LOG') {
      console.log('Debug:', message.log);
    }
  });
}

async function loadStoredData() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    if (result && Array.isArray(result[STORAGE_KEY])) {
      currentLikers = result[STORAGE_KEY];
      updateResultsDisplay();
    }
  } catch (error) {
    console.error('Error loading stored data:', error);
  }
}

async function startAutoScan() {
  // Check if we're on LinkedIn before auto-scanning
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.url?.includes('linkedin.com')) {
      // Small delay then auto-start
      setTimeout(() => {
        handleScanClick();
      }, 500);
    }
  } catch (error) {
    console.log('Could not auto-scan:', error);
  }
}

async function handleScanClick() {
  if (isScanning) return;
  
  try {
    isScanning = true;
    updateScanButton(true);
    showStatusMessage('Scanning LinkedIn post...', 'loading');
    hideResults();
    
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url?.includes('linkedin.com')) {
      throw new Error('Please navigate to a LinkedIn post first');
    }
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'scanLinkedInLikers'
    });
    
    if (response?.success) {
      handleScanSuccess(response.data || []);
    } else {
      throw new Error(response?.error || 'Failed to scan profiles');
    }
    
  } catch (error: any) {
    console.error('Scan error:', error);
    handleScanError(error.message || 'An error occurred while scanning');
    
    // Try to inject content script if connection failed
    if (error.message.includes('Could not establish connection')) {
      await injectContentScript();
    }
  }
}

async function injectContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      throw new Error('No active tab found');
    }
    
    showStatusMessage('Initializing scanner...', 'loading');
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content_script.js']
    });
    
    // Wait and retry scan
    setTimeout(() => {
      handleScanClick();
    }, 1000);
    
  } catch (error: any) {
    console.error('Failed to inject content script:', error);
    handleScanError('Failed to initialize scanner. Please refresh the page and try again.');
  }
}

function handleScanSuccess(data: any[]) {
  isScanning = false;
  currentLikers = data || [];
  
  // Save to storage
  chrome.storage?.local.set({ [STORAGE_KEY]: currentLikers });
  
  updateScanButton(false);
  hideStatusMessage();
  updateResultsDisplay();
  
  if (currentLikers.length > 0) {
    showStatusMessage(`Successfully found ${currentLikers.length} profiles!`, 'success');
  } else {
    showStatusMessage('No profiles found. Make sure the post has visible reactions.', 'error');
  }
}

function handleScanError(errorMessage: string) {
  isScanning = false;
  updateScanButton(false);
  showStatusMessage(errorMessage, 'error');
}

function updateScanButton(scanning: boolean) {
  scanBtn.disabled = scanning;
  
  if (scanning) {
    scanBtnText.innerHTML = '<div class="spinner"></div>Scanning...';
  } else {
    scanBtnText.innerHTML = 'Scan LinkedIn Post';
  }
}

function showStatusMessage(message: string, type: 'loading' | 'error' | 'success') {
  statusArea.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
}

function hideStatusMessage() {
  statusArea.innerHTML = '';
}

function updateResultsDisplay() {
  if (currentLikers.length > 0) {
    resultsCount.textContent = currentLikers.length.toString();
    resultsArea.style.display = 'block';
    instructionsArea.style.display = 'none';
  } else {
    resultsArea.style.display = 'none';
    instructionsArea.style.display = 'block';
  }
}

function hideResults() {
  resultsArea.style.display = 'none';
  instructionsArea.style.display = 'block';
}

function openFullInterface() {
  chrome.tabs.create({ url: 'index.html' });
  window.close(); // Close popup after opening tab
}

function handleClearData() {
  currentLikers = [];
  chrome.storage?.local.remove([STORAGE_KEY]);
  hideStatusMessage();
  updateResultsDisplay();
  showStatusMessage('Data cleared successfully', 'success');
  
  // Hide success message after a moment
  setTimeout(() => {
    hideStatusMessage();
  }, 2000);
} 