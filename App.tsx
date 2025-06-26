declare var chrome: any;
import React, { useState, useEffect } from 'react';
import { LinkedInProfile } from './types';
import { LikersReviewSection } from './components/LikersReviewSection';

const STORAGE_KEY = 'linkedin_likers_data';

const App: React.FC = () => {
  const [likers, setLikers] = useState<LinkedInProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isPopupMode, setIsPopupMode] = useState(false);

  // Detect if we're in popup mode or full tab mode
  useEffect(() => {
    const detectMode = () => {
      // Check if window is small (likely popup) or large (likely tab)
      const isSmallWindow = window.innerWidth <= 500;
      setIsPopupMode(isSmallWindow);
    };

    detectMode();
    window.addEventListener('resize', detectMode);
    return () => window.removeEventListener('resize', detectMode);
  }, []);

  // Load likers from storage on mount
  useEffect(() => {
    chrome.storage?.local.get([STORAGE_KEY], (result: any) => {
      if (result && Array.isArray(result[STORAGE_KEY])) {
        setLikers(result[STORAGE_KEY]);
      }
    });
  }, []);

  // Auto-scan when the popup opens
  useEffect(() => {
    console.log("🚀 App component mounted, starting auto-scan...");
    handleScanLikers();

    // Listen for messages from content script
    const messageListener = (message: any) => {
      console.log("📨 App received message:", message);
      
      if (message.type === 'FETCH_LIKERS_SUCCESS') {
        console.log("✅ Received successful scan result:", message.data);
        setLikers(message.data || []);
        // Save to storage
        chrome.storage?.local.set({ [STORAGE_KEY]: message.data || [] });
        setLoading(false);
        setError('');
      } else if (message.type === 'FETCH_LIKERS_ERROR') {
        console.log("❌ Received scan error:", message.error);
        setError(message.error || 'Unknown error occurred');
        setLoading(false);
      } else if (message.type === 'DEBUG_LOG') {
        setDebugLogs(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${message.log}`]);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      try {
        chrome.runtime.onMessage.removeListener(messageListener);
      } catch (e) {
        console.warn("Could not remove message listener:", e);
      }
    };
  }, []);

  const handleScanLikers = async () => {
    try {
      console.log("🎯 Starting manual scan...");
      setLoading(true);
      setError('');
      setLikers([]);
      setDebugLogs([]);

      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.url?.includes('linkedin.com')) {
        throw new Error('Please navigate to a LinkedIn post first');
      }

      console.log("📤 Sending scan message to content script...");
      
      // Send message to content script to start scanning
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'scanLinkedInLikers'
      });

      console.log("📨 Response from content script:", response);

      if (response?.success) {
        setLikers(response.data || []);
        // Save to storage
        chrome.storage?.local.set({ [STORAGE_KEY]: response.data || [] });
        setLoading(false);
      } else {
        throw new Error(response?.error || 'Failed to scan profiles');
      }

    } catch (error: any) {
      console.error("❌ Error in handleScanLikers:", error);
      const errorMessage = error.message || 'An error occurred while scanning';
      setError(errorMessage);
      setLoading(false);
      
      // If the content script isn't available, try to inject it
      if (errorMessage.includes('Could not establish connection')) {
        console.log("🔄 Content script not available, attempting to inject...");
        await injectContentScript();
      }
    }
  };

  const injectContentScript = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        throw new Error('No active tab found');
      }

      console.log("💉 Injecting content script...");
      
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content_script.js']
      });

      console.log("✅ Content script injected successfully");
      
      // Wait a moment for the script to load, then try scanning again
      setTimeout(() => {
        handleScanLikers();
      }, 1000);
      
    } catch (error: any) {
      console.error("❌ Failed to inject content script:", error);
      setError('Failed to inject content script. Please refresh the page and try again.');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    console.log("🔄 Retry button clicked");
    handleScanLikers();
  };

  const handleClearData = () => {
    console.log("🗑️ Clear data button clicked");
    setLikers([]);
    setError('');
    setDebugLogs([]);
    // Remove from storage
    chrome.storage?.local.remove([STORAGE_KEY]);
  };

  return (
    <div className={`w-full bg-gradient-to-br from-slate-50 to-blue-50 ${isPopupMode ? 'min-h-screen' : 'min-h-screen md:w-[800px] md:max-w-full'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg">
        <div className={`p-4 ${isPopupMode ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`font-bold flex items-center gap-2 ${isPopupMode ? 'text-lg' : 'text-xl'}`}>
                <div className="w-4 h-4 bg-white/20 rounded-lg flex items-center justify-center">
                  💙
                </div>
                {isPopupMode ? 'LinkedIn Insights' : 'LinkedIn Liker Insights'}
              </h1>
              <p className={`text-blue-100 font-medium mt-1 ${isPopupMode ? 'text-xs' : 'text-sm'}`}>
                {isPopupMode ? 'AI-powered analytics' : 'Enhanced with AI-powered scrolling & analytics'}
              </p>
            </div>
            {!isPopupMode && (
              <button
                className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
                title="Open in new tab"
                onClick={() => window.open('index.html', '_blank')}
              >
                <span className="flex items-center gap-2">
                  <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Tab
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`space-y-4 ${isPopupMode ? 'p-3' : 'p-6 space-y-6'}`}>
        {/* Controls */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-3 shadow-sm">
          <div className={`flex gap-2 ${isPopupMode ? 'flex-col' : ''}`}>
            <button
              onClick={handleRetry}
              disabled={loading}
              className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:hover:scale-100 ${isPopupMode ? 'py-2 px-4' : 'flex-1 py-3 px-6'}`}
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div style={{width: '16px', height: '16px'}} className="border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {isPopupMode ? 'Scanning...' : 'Scanning...'}
                  </>
                ) : (
                  <>
                    {isPopupMode ? 'Scan Post' : 'Scan LinkedIn Post'}
                  </>
                )}
              </span>
            </button>
            
            {(likers.length > 0 || error) && (
              <button
                onClick={handleClearData}
                className={`bg-white/80 hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md ${isPopupMode ? 'py-2 px-4' : 'py-3 px-4'}`}
              >
                <span className="flex items-center gap-2">
                  Clear
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {loading && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-3 text-blue-700">
              <div style={{width: '16px', height: '16px'}} className="border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <div>
                <p className={`font-semibold ${isPopupMode ? 'text-sm' : ''}`}>Scanning LinkedIn profiles...</p>
                <p className={`text-blue-600 mt-1 ${isPopupMode ? 'text-xs' : 'text-sm'}`}>Using enhanced AI-powered scrolling technology</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-start gap-3 text-red-700">
              <div style={{width: '16px', height: '16px'}} className="bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className={`font-semibold ${isPopupMode ? 'text-sm' : ''}`}>Error occurred</p>
                <p className={`mt-1 ${isPopupMode ? 'text-xs' : 'text-sm'}`}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {likers.length > 0 && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-3 text-emerald-700">
                <div style={{width: '16px', height: '16px'}} className="bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className={`font-semibold ${isPopupMode ? 'text-sm' : ''}`}>
                  Found {likers.length} LinkedIn profiles
                </p>
              </div>
            </div>

            <LikersReviewSection likers={likers} isPopupMode={isPopupMode} />
          </div>
        )}

        {/* Debug Logs */}
        {debugLogs.length > 0 && !isPopupMode && (
          <details className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
              🔧 Debug Logs ({debugLogs.length})
            </summary>
            <div className="mt-3 bg-gray-900 border rounded-lg p-3 max-h-40 overflow-y-auto">
              {debugLogs.slice(-20).map((log, index) => (
                <div key={index} className="text-xs text-green-400 font-mono leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Instructions */}
        {!loading && !error && likers.length === 0 && (
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm">
            <div className={`text-center ${isPopupMode ? 'p-4' : 'p-6'}`}>
              <div className={`bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isPopupMode ? 'w-8 h-8' : 'w-10 h-10'}`}>
                <svg style={{width: isPopupMode ? '16px' : '20px', height: isPopupMode ? '16px' : '20px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className={`font-semibold text-gray-800 mb-2 ${isPopupMode ? 'text-base' : 'text-lg'}`}>
                Ready to analyze LinkedIn engagement
              </h3>
              <p className={`text-gray-600 ${isPopupMode ? 'text-sm mb-4' : 'mb-6'}`}>
                Navigate to any LinkedIn post and click "{isPopupMode ? 'Scan Post' : 'Scan LinkedIn Post'}" to discover who engaged with it.
              </p>
              
              {!isPopupMode && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-left">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span style={{width: '16px', height: '16px'}} className="bg-blue-100 rounded-full flex items-center justify-center text-xs">📋</span>
                    How to use:
                  </h4>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-3">
                      <span style={{width: '16px', height: '16px'}} className="bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      Navigate to a LinkedIn post with reactions
                    </li>
                    <li className="flex items-start gap-3">
                      <span style={{width: '16px', height: '16px'}} className="bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      Click "Scan LinkedIn Post" above
                    </li>
                    <li className="flex items-start gap-3">
                      <span style={{width: '16px', height: '16px'}} className="bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      Our AI will automatically scroll and gather all profile data
                    </li>
                    <li className="flex items-start gap-3">
                      <span style={{width: '16px', height: '16px'}} className="bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                      Export or analyze the complete engagement data
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
