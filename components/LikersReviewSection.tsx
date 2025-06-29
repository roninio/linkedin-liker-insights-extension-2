import React, { useState } from 'react';
declare var chrome: any;
import { LinkedInProfile } from '../types';

interface LikersReviewSectionProps {
  likers: LinkedInProfile[];
  onOpenProfileModal?: (profile: LinkedInProfile) => void;
}

export const LikersReviewSection: React.FC<LikersReviewSectionProps> = ({ likers, onOpenProfileModal }) => {
  const [sortBy, setSortBy] = useState<'name' | 'title'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [analyzingProfiles, setAnalyzingProfiles] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [detailedProfiles, setDetailedProfiles] = useState<any[]>([]);

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

  const handleShowProfileModal = (profile: LinkedInProfile) => {
    // Find detailed profile data if available
    const detailedProfile = detailedProfiles.find(dp => dp.profileUrl === profile.profileUrl);
    const profileWithDetails = {
      ...profile,
      detailedInfo: detailedProfile?.detailedInfo || null
    };
    if (onOpenProfileModal) {
      onOpenProfileModal(profileWithDetails);
    }
  };

  if (likers.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-6">
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
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg style={{width: '16px', height: '16px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              LinkedIn Profiles
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {likers.length}
              </span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Sorted by {sortBy} ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Profile Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">Enhanced Analysis</h4>
            <p className="text-sm text-gray-600">Extract detailed profile information using AI</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAnalyzeProfiles}
              disabled={analyzingProfiles || likers.length === 0}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:hover:shadow-md"
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

      {/* Modern Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div style={{width: '16px', height: '16px'}} className="bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-500">#</span>
                    </div>
                    Index
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    <div style={{width: '16px', height: '16px'}} className="bg-blue-100 rounded-md flex items-center justify-center">
                      <svg style={{width: '12px', height: '12px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    <div style={{width: '16px', height: '16px'}} className="bg-indigo-100 rounded-md flex items-center justify-center">
                      <svg style={{width: '12px', height: '12px'}} className="text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v6l-3-2-3 2V6" />
                      </svg>
                    </div>
                    Title
                    {getSortIcon('title')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div style={{width: '16px', height: '16px'}} className="bg-purple-100 rounded-md flex items-center justify-center">
                      <svg style={{width: '12px', height: '12px'}} className="text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    Profile
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedLikers.map((profile, index) => (
                <tr 
                  key={profile.id} 
                  className={`group hover:bg-gray-100 transition-colors duration-200 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div style={{width: '20px', height: '20px'}} className="bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {profile.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 font-medium max-w-xs">
                      {profile.title || (
                        <span className="text-gray-400 italic font-normal">No title available</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleShowProfileModal(profile);
                        }}
                        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                        title="View detailed information"
                      >
                        <svg style={{width: '14px', height: '14px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Details
                      </button>
                      <a
                        href={profile.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                        title="Open LinkedIn profile"
                      >
                        <svg style={{width: '14px', height: '14px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        LinkedIn
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export & Stats Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
          </div>
        </div>
      </div>
    </div>
  );
};
    