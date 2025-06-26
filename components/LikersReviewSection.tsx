import React, { useState } from 'react';
import { LinkedInProfile } from '../types';

interface LikersReviewSectionProps {
  likers: LinkedInProfile[];
  isPopupMode?: boolean;
}

export const LikersReviewSection: React.FC<LikersReviewSectionProps> = ({ likers, isPopupMode = false }) => {
  const [sortBy, setSortBy] = useState<'name' | 'title'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [analyzingProfiles, setAnalyzingProfiles] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [detailedProfiles, setDetailedProfiles] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Function to load detailed profiles from storage
  const loadDetailedProfiles = () => {
    chrome.storage?.local.get(['linkedin_detailed_profiles'], (result: any) => {
      if (result && Array.isArray(result.linkedin_detailed_profiles)) {
        setDetailedProfiles(result.linkedin_detailed_profiles);
      }
    });
  };

  // Load detailed profiles from storage on mount
  React.useEffect(() => {
    loadDetailedProfiles();
  }, []);

  const openProfileModal = (profile: LinkedInProfile) => {
    // Find detailed profile data if available
    const detailedProfile = detailedProfiles.find(dp => dp.profileUrl === profile.profileUrl);
    setSelectedProfile({
      ...profile,
      detailedInfo: detailedProfile?.detailedInfo || null
    });
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedProfile(null);
  };

  if (likers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg style={{width: '24px', height: '24px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-3">No Profiles Found</h3>
        <p className="text-gray-600">Click the scan button to find profiles that reacted to the LinkedIn post.</p>
      </div>
    );
  }

  // Sort the profiles
  const sortedLikers = [...likers].sort((a, b) => {
    const aValue = sortBy === 'name' ? a.name : (a.title || '');
    const bValue = sortBy === 'name' ? b.name : (b.title || '');
    
    if (sortOrder === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const handleSort = (column: 'name' | 'title') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: 'name' | 'title') => {
    if (sortBy !== column) {
      return (
        <svg style={{width: '16px', height: '16px'}} className="text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4-4v12" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg style={{width: '16px', height: '16px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg style={{width: '16px', height: '16px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  const handleAnalyzeProfiles = async () => {
    if (likers.length === 0) return;
    
    setAnalyzingProfiles(true);
    setAnalysisProgress(0);
    
    try {
      // Send message to background script to start profile analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeLinkedInProfiles',
        profiles: likers
      });
      
      if (response?.success) {
        console.log('✅ Profile analysis completed successfully');
        // The detailed profile data will be available in chrome.storage
        // You could update the UI to show enhanced profile information
      } else {
        console.error('❌ Profile analysis failed:', response?.error);
        alert('Failed to analyze profiles. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error analyzing profiles:', error);
      alert('Error analyzing profiles: ' + (error.message || 'Unknown error'));
    } finally {
      setAnalyzingProfiles(false);
      setAnalysisProgress(0);
    }
  };

  // Listen for progress updates
  React.useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'PROFILE_ANALYSIS_PROGRESS') {
        setAnalysisProgress(message.progress);
        // Log batch progress for better user feedback
        if (message.batchCompleted && message.totalBatches) {
          console.log(`Batch ${message.batchCompleted}/${message.totalBatches} completed. Progress: ${message.progress}/${message.total || likers.length}`);
        }
      } else if (message.type === 'PROFILE_ANALYSIS_COMPLETE') {
        // Analysis completed, reload the detailed profiles data
        setAnalyzingProfiles(false);
        setAnalysisProgress(0);
        loadDetailedProfiles(); // Reload the data from storage
        
        // Show completion stats if available
        if (message.successful !== undefined && message.failed !== undefined) {
          console.log(`Analysis complete: ${message.successful} successful, ${message.failed} failed out of ${message.count} total`);
        }
      }
    };

    chrome.runtime?.onMessage.addListener(handleMessage);
    return () => {
      try {
        chrome.runtime?.onMessage.removeListener(handleMessage);
      } catch (e) {
        console.warn("Could not remove message listener:", e);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl shadow-sm">
        <div className={`${isPopupMode ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-bold text-gray-800 flex items-center gap-2 ${isPopupMode ? 'text-lg' : 'text-xl'}`}>
                <div className="w-4 h-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <svg style={{width: '12px', height: '12px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                {isPopupMode ? 'Profiles' : 'LinkedIn Profiles'}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                  {likers.length}
                </span>
              </h3>
              <p className={`text-gray-600 mt-1 ${isPopupMode ? 'text-xs' : 'text-sm'}`}>
                Sorted by {sortBy} ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Table */}
      <div className={`bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl shadow-lg overflow-hidden ${isPopupMode ? 'popup-responsive-table' : ''}`}>
        <div className="overflow-auto">
          <table className={`w-full ${isPopupMode ? 'min-w-[380px]' : 'min-w-[750px]'}`}>
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm">
                <th className={`text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200/50 ${isPopupMode ? 'px-3 py-2' : 'px-6 py-4'}`}>
                  <div className="flex items-center gap-2">
                    <div style={{width: '12px', height: '12px'}} className="bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-500">#</span>
                    </div>
                    {!isPopupMode && 'Index'}
                  </div>
                </th>
                <th 
                  className={`text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-blue-100/50 transition-colors border-b border-gray-200/50 ${isPopupMode ? 'px-3 py-2' : 'px-6 py-4'}`}
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    <div style={{width: '12px', height: '12px'}} className="bg-blue-100 rounded-md flex items-center justify-center">
                      <svg style={{width: '8px', height: '8px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    Name
                    {getSortIcon('name')}
                  </div>
                </th>
                {!isPopupMode && (
                  <th 
                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-blue-100/50 transition-colors border-b border-gray-200/50"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-2">
                      <div style={{width: '12px', height: '12px'}} className="bg-green-100 rounded-md flex items-center justify-center">
                        <svg style={{width: '8px', height: '8px'}} className="text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v6l-3-2-3 2V6" />
                        </svg>
                      </div>
                      Title
                      {getSortIcon('title')}
                    </div>
                  </th>
                )}
                <th className={`text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200/50 ${isPopupMode ? 'px-3 py-2' : 'px-6 py-4'}`}>
                  <div className="flex items-center gap-2">
                    <div style={{width: '12px', height: '12px'}} className="bg-purple-100 rounded-md flex items-center justify-center">
                      <svg style={{width: '8px', height: '8px'}} className="text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    Profile
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {sortedLikers.map((profile, index) => (
                <tr 
                  key={profile.id} 
                  className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                  }`}
                >
                  <td className={`whitespace-nowrap ${isPopupMode ? 'px-3 py-2' : 'px-6 py-4'}`}>
                    <div className="flex items-center gap-2">
                      <div style={{width: '16px', height: '16px'}} className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                        <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={`${isPopupMode ? 'px-3 py-2' : 'px-6 py-4'} ${!isPopupMode ? 'whitespace-nowrap' : ''}`}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openProfileModal(profile)}
                        className={`font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors ${isPopupMode ? 'text-sm truncate max-w-[120px]' : ''}`}
                        title={profile.name}
                      >
                        {profile.name}
                      </button>
                    </div>
                    {/* Show title below name in popup mode */}
                    {isPopupMode && profile.title && (
                      <div className="text-xs text-gray-500 truncate max-w-[120px] mt-1" title={profile.title}>
                        {profile.title}
                      </div>
                    )}
                  </td>
                  {!isPopupMode && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 font-medium max-w-xs">
                        {profile.title || (
                          <span className="text-gray-400 italic font-normal">No title available</span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className={`whitespace-nowrap ${isPopupMode ? 'px-3 py-2' : 'px-6 py-4'}`}>
                    <a
                      href={profile.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md ${isPopupMode ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm gap-2'}`}
                    >
                      <svg style={{width: isPopupMode ? '12px' : '16px', height: isPopupMode ? '12px' : '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {isPopupMode ? 'View' : 'View Profile'}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export & Stats Section */}
      {!isPopupMode && (
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg px-4 py-2">
                <p className="text-sm font-semibold text-emerald-700">
                  Total: {likers.length} profiles found
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Create enhanced CSV with detailed profile data
                  const enhancedProfiles = sortedLikers.map(profile => {
                    const detailedProfile = detailedProfiles.find(dp => dp.profileUrl === profile.profileUrl);
                    const detailedInfo = detailedProfile?.detailedInfo;
                    
                    return {
                      name: profile.name,
                      title: profile.title,
                      profileUrl: profile.profileUrl,
                      location: detailedInfo?.location || 'Not extracted',
                      about: detailedInfo?.about || 'Not extracted',
                      experience: detailedInfo?.experience ? 
                        detailedInfo.experience.map((exp: any) => {
                          if (exp.title && exp.company) {
                            return `${exp.title} at ${exp.company}${exp.dates ? ` (${exp.dates})` : ''}${exp.description ? ` - ${exp.description}` : ''}`;
                          }
                          return exp.fullText || exp.text || 'Experience item';
                        }).join(' | ') : 'Not extracted',
                      hasDetailedData: !!detailedInfo && !detailedInfo.error,
                      extractedAt: detailedInfo?.extractedAt || 'Not extracted'
                    };
                  });

                  const csvHeaders = [
                    'Basic Name',
                    'Basic Title', 
                    'Profile URL',
                    'Location',
                    'About',
                    'Experience',
                    'Has Detailed Data',
                    'Data Extracted At'
                  ];

                  const csvRows = enhancedProfiles.map(p => [
                    `"${p.name}"`,
                    `"${p.title || ''}"`,
                    `"${p.profileUrl}"`,
                    `"${p.location.replace(/"/g, '""')}"`, // Escape quotes in location
                    `"${p.about.replace(/"/g, '""')}"`, // Escape quotes in about section
                    `"${p.experience.replace(/"/g, '""')}"`, // Escape quotes in experience
                    `"${p.hasDetailedData ? 'Yes' : 'No'}"`,
                    `"${p.extractedAt}"`
                  ].join(','));

                  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `linkedin-likers-enhanced-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
              >
                <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              
              <button
                onClick={() => {
                  // Create enhanced JSON with detailed profile data
                  const enhancedProfiles = sortedLikers.map(profile => {
                    const detailedProfile = detailedProfiles.find(dp => dp.profileUrl === profile.profileUrl);
                    const detailedInfo = detailedProfile?.detailedInfo;
                    
                    return {
                      basic: {
                        name: profile.name,
                        title: profile.title,
                        profileUrl: profile.profileUrl,
                        id: profile.id
                      },
                      enhanced: {
                        location: detailedInfo?.location || 'Not extracted',
                        about: detailedInfo?.about || 'Not extracted',
                        experience: detailedInfo?.experience ? 
                          detailedInfo.experience.map((exp: any) => {
                            if (exp.title && exp.company) {
                              return {
                                title: exp.title,
                                company: exp.company,
                                dates: exp.dates || '',
                                description: exp.description || '',
                                fullText: exp.fullText || ''
                              };
                            }
                            return { fullText: exp.fullText || exp.text || 'Experience item' };
                          }) : [],
                        extractedAt: detailedInfo?.extractedAt || 'Not extracted'
                      },
                      detailed: detailedInfo || null, // Keep original detailed info for full data access
                      hasDetailedData: !!detailedInfo && !detailedInfo.error,
                      exportedAt: new Date().toISOString()
                    };
                  });

                  const exportData = {
                    metadata: {
                      totalProfiles: sortedLikers.length,
                      profilesWithDetailedData: enhancedProfiles.filter(p => p.hasDetailedData).length,
                      exportedAt: new Date().toISOString(),
                      sortedBy: sortBy,
                      sortOrder: sortOrder
                    },
                    profiles: enhancedProfiles
                  };

                  const jsonContent = JSON.stringify(exportData, null, 2);
                  const blob = new Blob([jsonContent], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `linkedin-likers-enhanced-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
              >
                <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export JSON
              </button>

              <button
                onClick={handleAnalyzeProfiles}
                disabled={analyzingProfiles || likers.length === 0}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-300 disabled:to-pink-300 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md disabled:hover:scale-100"
              >
                {analyzingProfiles ? (
                  <>
                    <div style={{width: '16px', height: '16px'}} className="border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing... ({analysisProgress}/{likers.length})
                  </>
                ) : (
                  <>
                    <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Analyze Profiles
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      {showProfileModal && selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedProfile.name}</h2>
                  <p className="text-blue-100 mt-1">{selectedProfile.title || 'LinkedIn Profile'}</p>
                </div>
                <button
                  onClick={closeProfileModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {selectedProfile.detailedInfo ? (
                selectedProfile.detailedInfo.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Analysis Failed</span>
                    </div>
                    <p className="text-red-600 mt-2">{selectedProfile.detailedInfo.message || 'Could not extract profile data'}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Location */}
                      {selectedProfile.detailedInfo.location && selectedProfile.detailedInfo.location !== 'Location not found' && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Location
                          </h3>
                          <p className="text-sm text-gray-700">{selectedProfile.detailedInfo.location}</p>
                        </div>
                      )}

                      {/* Profile Link */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                          <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Profile Link
                        </h3>
                        <a
                          href={selectedProfile.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm break-all"
                        >
                          {selectedProfile.profileUrl}
                        </a>
                      </div>
                    </div>

                    {/* About Section */}
                    {selectedProfile.detailedInfo.about && selectedProfile.detailedInfo.about !== 'About section not found' && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          About
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{selectedProfile.detailedInfo.about}</p>
                      </div>
                    )}

                    {/* Experience */}
                    {selectedProfile.detailedInfo.experience && selectedProfile.detailedInfo.experience.length > 0 && (
                      <div className="bg-orange-50 rounded-lg p-4">
                        <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                          <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v6l-3-2-3 2V6" />
                          </svg>
                          Experience
                        </h3>
                        <div className="space-y-3">
                          {selectedProfile.detailedInfo.experience.map((exp: any, index: number) => (
                            <div key={index} className="text-sm text-gray-700 bg-white rounded-lg p-3 border-l-4 border-orange-300">
                              {exp.title && exp.company ? (
                                <div>
                                  <div className="font-semibold text-gray-900">{exp.title}</div>
                                  <div className="text-orange-700 font-medium">{exp.company}</div>
                                  {exp.dates && <div className="text-gray-500 text-xs mt-1">{exp.dates}</div>}
                                  {exp.description && <div className="text-gray-600 mt-2">{exp.description}</div>}
                                </div>
                              ) : (
                                <div>{exp.fullText || exp.text || 'Experience item'}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extraction Info */}
                    <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Data extracted: {new Date(selectedProfile.detailedInfo.extractedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg style={{width: '24px', height: '24px'}} className="text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Detailed Data Available</h3>
                  <p className="text-gray-500 mb-4">Click "Analyze Profiles" to extract detailed information from LinkedIn profiles.</p>
                  <div className="space-y-2 text-sm text-left bg-gray-50 rounded-lg p-4">
                    <div><span className="font-medium">Basic Name:</span> {selectedProfile.name}</div>
                    <div><span className="font-medium">Basic Title:</span> {selectedProfile.title || 'Not available'}</div>
                    <div><span className="font-medium">Profile URL:</span> 
                      <a href={selectedProfile.profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1 break-all">
                        {selectedProfile.profileUrl}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl">
              <div className="flex justify-end">
                <button
                  onClick={closeProfileModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
    