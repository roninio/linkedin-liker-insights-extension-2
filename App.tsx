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
  
  // Modal state for popup
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<LinkedInProfile | null>(null);

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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showProfileModal) {
        closeProfileModal();
      }
    };

    if (showProfileModal) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore body scroll
      document.body.style.overflow = 'unset';
    };
  }, [showProfileModal]);

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

  // Modal open/close handlers for popup
  const openProfileModal = (profile: LinkedInProfile) => {
    console.log('🔍 openProfileModal called with profile:', profile);
    setSelectedProfile(profile);
    setShowProfileModal(true);
    console.log('🔍 Modal should now be open');
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedProfile(null);
  };

  return (
    <div className="w-full max-w-none md:w-[800px] md:max-w-full bg-white min-h-screen">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-3">
              LinkedIn Liker Insights
            </h1>
            <p className="text-blue-100 text-sm mt-2 font-medium">
              Enhanced with AI-powered scrolling & analytics
            </p>
          </div>
          <button
            className="bg-white/20 text-white hover:bg-white/30 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
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
        </div>
      </div>

      {/* Profile Details Modal */}
      {showProfileModal && selectedProfile && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 animate-fade-in"
          onClick={closeProfileModal}
        >
          <div 
            className="relative bg-white rounded-lg shadow-lg max-w-4xl w-full mx-auto max-h-[90vh] flex animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Left Panel */}
            <div className="w-[30%] bg-blue-600 text-white p-8 rounded-l-lg flex flex-col items-center justify-center text-center">
              <div className="w-28 h-28 rounded-full bg-blue-700 flex items-center justify-center mb-4">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold leading-tight">{selectedProfile.name}</h2>
              <p className="text-sm text-blue-200 mt-1 mb-4">{selectedProfile.title || 'LinkedIn Profile'}</p>
              <a
                href={selectedProfile.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md text-xs font-semibold transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                View on LinkedIn
              </a>
            </div>

            {/* Right Panel */}
            <div className="w-[70%] p-8 overflow-y-auto">
              <button
                onClick={closeProfileModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-blue-100"
                aria-label="Close profile details"
              >
                &times;
              </button>
              
              <div className="space-y-6">
                {selectedProfile.detailedInfo?.location && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Location</h3>
                    <p className="text-gray-800">{selectedProfile.detailedInfo.location}</p>
                  </div>
                )}

                {selectedProfile.detailedInfo?.about && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">About</h3>
                    <p className="text-gray-800 leading-relaxed">{selectedProfile.detailedInfo.about}</p>
                  </div>
                )}

                {selectedProfile.detailedInfo?.experience && selectedProfile.detailedInfo.experience.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Experience</h3>
                    <ul className="space-y-4">
                      {selectedProfile.detailedInfo.experience.map((exp: any, idx: number) => (
                        <li key={idx} className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex-shrink-0 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v6l-3-2-3 2V6" /></svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{exp.title || 'Position'}</p>
                            <p className="text-sm text-gray-600">{exp.company || 'Company'}</p>
                            <p className="text-xs text-gray-500 mt-1">{exp.dates || 'Dates not specified'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!selectedProfile.detailedInfo && (
                  <div className="text-center py-10">
                    <p className="text-gray-600">No detailed information available for this profile.</p>
                    <p className="text-sm text-gray-500 mt-2">Click "Analyze Profiles" to extract more details.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Main Content (hidden when profile details are shown) */}
      {!showProfileModal && (
        <div className="p-6 space-y-6">
          {/* Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:hover:shadow-md"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div style={{width: '16px', height: '16px'}} className="border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Scanning...
                    </>
                  ) : (
                    <>
                      Scan LinkedIn Post
                    </>
                  )}
                </span>
              </button>
              {(likers.length > 0 || error) && (
                <button
                  onClick={handleClearData}
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3 text-blue-700">
                <div style={{width: '16px', height: '16px'}} className="border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                <div>
                  <p className="font-semibold">Scanning LinkedIn profiles...</p>
                  <p className="text-sm text-blue-600 mt-1">Using enhanced AI-powered scrolling technology</p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3 text-red-700">
                <div style={{width: '16px', height: '16px'}} className="bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Error occurred</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          {/* Results */}
          {likers.length > 0 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3 text-emerald-700">
                  <div style={{width: '16px', height: '16px'}} className="bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold">
                    Successfully found {likers.length} LinkedIn profiles
                  </p>
                </div>
              </div>
              <LikersReviewSection likers={likers} onOpenProfileModal={openProfileModal} />
            </div>
          )}
          {/* Debug Logs */}
          {debugLogs.length > 0 && (
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
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg style={{width: '20px', height: '20px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Ready to analyze LinkedIn engagement
                </h3>
                <p className="text-gray-600 mb-6">
                  Navigate to any LinkedIn post and click "Scan LinkedIn Post" to discover who engaged with it.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-left">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    How to use:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Navigate to a LinkedIn post with reactions</li>
                    <li>Click "Scan LinkedIn Post" above</li>
                    <li>Our AI will automatically scroll and gather all profile data</li>
                    <li>Export or analyze the complete engagement data</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
