declare var chrome: any;
// This is the background service worker for the Chrome extension.
import { MessageType, ExtensionMessage, FetchLikersRequestMessage } from './types';

// Log function to send messages to popup console for debugging
function logToPopup(message: string, data?: any) {
  console.log(`Background: ${message}`, data); // Also log to background console
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: MessageType.LOG_MESSAGE, message: `Background: ${message}`, data: data })
      .catch((e: any) => console.warn("Background: Could not log to popup (sendMessage failed):", e.message));
  } else {
    console.warn("Background: chrome.runtime.sendMessage not available for logging to popup.");
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    logToPopup('LinkedIn Liker Insights Extension Installed/Updated.');
  });
} else {
  console.warn("Background: chrome.runtime.onInstalled not available.");
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender: any, sendResponse: (response?: any) => void) => {
    if (message.type === MessageType.FETCH_LIKERS_REQUEST) {
      const { tabId } = message as FetchLikersRequestMessage;
      logToPopup(`Received FETCH_LIKERS_REQUEST for tabId: ${tabId}`);

      if (!tabId) {
        const errorMsg = "Error: Tab ID is missing in FETCH_LIKERS_REQUEST.";
        logToPopup(errorMsg);
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
           chrome.runtime.sendMessage({ type: MessageType.FETCH_LIKERS_ERROR, error: "Tab ID missing." })
             .catch((e: any) => logToPopup("Error sending FETCH_LIKERS_ERROR for missing tabId", e));
        }
        sendResponse({ success: false, error: "Tab ID missing." });
        return true; 
      }
      
      if (typeof chrome.scripting === 'undefined' || !chrome.scripting.executeScript) {
        const errorMsg = 'Error: chrome.scripting API not available. Cannot inject content script.';
        logToPopup(errorMsg);
         if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: MessageType.FETCH_LIKERS_ERROR, error: errorMsg })
                .catch((e: any) => logToPopup("Error sending FETCH_LIKERS_ERROR for scripting unavailable", e));
        }
        sendResponse({ success: false, error: errorMsg });
        return true;
      }

      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content_script.js'], 
      }, (injectionResults?: any[]) => {
        if (chrome.runtime.lastError) {
          const errorMsg = `Error injecting content script: ${chrome.runtime.lastError.message}`;
          logToPopup(errorMsg);
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: MessageType.FETCH_LIKERS_ERROR, error: errorMsg })
              .catch((e: any) => logToPopup("Error sending FETCH_LIKERS_ERROR for injection failure", e));
          }
          sendResponse({ success: false, error: errorMsg });
          return;
        }
        // injectionResults may be undefined if the tab was closed or the script failed to inject for other reasons.
        // The content script is responsible for sending its own success/error message.
        // This callback primarily confirms the attempt to inject.
        if (injectionResults && injectionResults.length > 0) {
            logToPopup('Content script injection attempt successful. Waiting for data from content script.', injectionResults);
            sendResponse({ success: true, message: "Content script injection initiated. Awaiting data." });
        } else {
            // This case can occur if the target tab doesn't exist or is not permitted.
            const errorMsg = 'Content script injection attempt failed or returned no results. The tab might be inaccessible or the script has an issue.';
            logToPopup(errorMsg);
            // We still send a success:true for sendResponse from the listener,
            // as the content_script is expected to message back.
            // But good to log this scenario.
            sendResponse({ success: true, message: errorMsg});
        }
      });
      return true; // Indicates that the response will be sent asynchronously by the content script or after injection.
    }
    
    // Handle profile analysis requests
    if (message.action === 'analyzeLinkedInProfiles') {
      logToPopup('Received analyzeLinkedInProfiles request', { profileCount: message.profiles?.length });
      handleProfileAnalysis(message.profiles, sendResponse);
      return true; // Indicates async response
    }
    
    return false; // No async response for other types by default
  });
} else {
  console.warn("Background: chrome.runtime.onMessage not available. Cannot listen for messages from popup/content scripts.");
}

// Function to handle profile analysis
async function handleProfileAnalysis(profiles: any[], sendResponse: (response?: any) => void) {
  if (!profiles || profiles.length === 0) {
    sendResponse({ success: false, error: 'No profiles to analyze' });
    return;
  }

  try {
    logToPopup(`Starting concurrent analysis of ${profiles.length} profiles`);
    const detailedProfiles: any[] = [];
    
    // Configuration for concurrent processing
    const CONCURRENT_LIMIT = 3; // Process 3 profiles at the same time
    const BATCH_DELAY = 2000; // 2 second delay between batches
    
    // Function to analyze a single profile
    const analyzeProfile = async (profile: any, index: number): Promise<any> => {
      logToPopup(`Analyzing profile ${index + 1}/${profiles.length}: ${profile.name}`);
      
      try {
        // Create a new tab to load the LinkedIn profile
        const tab = await new Promise<any>((resolve, reject) => {
          chrome.tabs.create({ 
            url: profile.profileUrl, 
            active: false // Don't switch to the tab
          }, (newTab: any) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(newTab);
            }
          });
        });

        // Wait for the tab to load and then extract profile data
        const profileData = await new Promise<any>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Profile analysis timeout'));
          }, 30000); // 30 second timeout

          const listener = (tabId: number, changeInfo: any) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              clearTimeout(timeoutId);
              
              // Wait additional time for dynamic content to load, then inject script
              setTimeout(() => {
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: extractLinkedInProfileData
                }, async (results: any[]) => {
                  if (chrome.runtime.lastError || !results || !results[0]) {
                    reject(new Error('Failed to extract profile data'));
                  } else {
                    try {
                      // The extraction function now returns a Promise, so we need to await it
                      const extractedData = await results[0].result;
                      resolve(extractedData);
                    } catch (error: any) {
                      reject(new Error('Failed to process extracted data: ' + error.message));
                    }
                  }
                  
                  // Close the tab
                  chrome.tabs.remove(tab.id).catch(() => {});
                });
              }, 5000); // Wait 5 seconds after page load for dynamic content
            }
          };

          chrome.tabs.onUpdated.addListener(listener);
        });

        return {
          ...profile,
          detailedInfo: profileData
        };

      } catch (error: any) {
        logToPopup(`Error analyzing profile ${profile.name}:`, error.message);
        return {
          ...profile,
          detailedInfo: { error: error.message }
        };
      }
    };

    // Process profiles in concurrent batches
    for (let i = 0; i < profiles.length; i += CONCURRENT_LIMIT) {
      const batch = profiles.slice(i, i + CONCURRENT_LIMIT);
      logToPopup(`Processing batch ${Math.floor(i / CONCURRENT_LIMIT) + 1} of ${Math.ceil(profiles.length / CONCURRENT_LIMIT)} (${batch.length} profiles)`);
      
      // Process the current batch concurrently
      const batchPromises = batch.map((profile, batchIndex) => 
        analyzeProfile(profile, i + batchIndex)
      );
      
      // Wait for all profiles in the current batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add batch results to the main array
      detailedProfiles.push(...batchResults);
      
      // Send progress update after each batch
      chrome.runtime.sendMessage({ 
        type: 'PROFILE_ANALYSIS_PROGRESS', 
        progress: detailedProfiles.length,
        total: profiles.length,
        batchCompleted: Math.floor(i / CONCURRENT_LIMIT) + 1,
        totalBatches: Math.ceil(profiles.length / CONCURRENT_LIMIT)
      }).catch(() => {});
      
      // Delay between batches to be respectful to LinkedIn's servers
      if (i + CONCURRENT_LIMIT < profiles.length) {
        logToPopup(`Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Store the detailed profiles
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ 
        'linkedin_detailed_profiles': detailedProfiles,
        'linkedin_detailed_profiles_timestamp': Date.now()
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    logToPopup('Concurrent profile analysis completed successfully', { 
      count: detailedProfiles.length,
      successful: detailedProfiles.filter(p => !p.detailedInfo?.error).length,
      failed: detailedProfiles.filter(p => p.detailedInfo?.error).length
    });
    
    // Send completion message to all tabs/popup
    chrome.runtime.sendMessage({
      type: 'PROFILE_ANALYSIS_COMPLETE',
      count: detailedProfiles.length,
      successful: detailedProfiles.filter(p => !p.detailedInfo?.error).length,
      failed: detailedProfiles.filter(p => p.detailedInfo?.error).length
    }).catch(() => {
      // Ignore errors if no popup is listening
    });
    
    sendResponse({ success: true, data: detailedProfiles });

  } catch (error: any) {
    logToPopup('Profile analysis failed:', error.message);
    sendResponse({ success: false, error: error.message });
  }
}

// Function to inject into LinkedIn profile pages to extract data
function extractLinkedInProfileData() {
  return new Promise((resolve) => {
    // Function to wait for elements to appear
    const waitForElement = (selector: string, timeout = 10000): Promise<Element | null> => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        
        const check = () => {
          const element = document.querySelector(selector);
          if (element) {
            resolve(element);
          } else if (Date.now() - startTime > timeout) {
            resolve(null); // Timeout, but don't reject
          } else {
            setTimeout(check, 500); // Check every 500ms
          }
        };
        
        check();
      });
    };

    // Wait for page to be fully loaded and then extract data
    const extractData = async () => {
      try {
        const data: any = {
          extractedAt: new Date().toISOString(),
          url: window.location.href
        };

        // Wait for main profile content to load
        console.log('Waiting for LinkedIn profile content to load...');
        
        // Wait for the main profile header
        await waitForElement('main section.artdeco-card, .pv-top-card, .ph5.pb5');
        
        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('Profile content loaded, extracting Location, About and Experience data...');

        // Extract location - try multiple selectors
        console.log('Looking for location...');
        const locationSelectors = [
          '.text-body-small.inline.t-black--light.break-words',
          '.pv-text-details__left-panel .text-body-small',
          '.pv-top-card .pv-top-card__location',
          '.pv-top-card--list li:nth-child(3)',
          'main section .text-body-small',
          '.ph5 .text-body-small',
          '.pv-top-card-v2-ctas .text-body-small',
          '.mt2 .text-body-small'
        ];
        
        let locationElement = null;
        for (const selector of locationSelectors) {
          locationElement = document.querySelector(selector);
          if (locationElement && locationElement.textContent?.trim() && 
              !locationElement.textContent.includes('connection') && 
              !locationElement.textContent.includes('follower') &&
              !locationElement.textContent.includes('Contact info')) {
            break;
          }
        }
        data.location = locationElement?.textContent?.trim() || 'Location not found';

        // Extract about section - wait for it specifically
        console.log('Looking for about section...');
        const aboutSelectors = [
          '#about ~ * .inline-show-more-text',
          '#about ~ * .pv-shared-text-with-see-more',
          '#about ~ * .full-width span[aria-hidden="true"]',
          '.pv-about-section .pv-about__summary-text',
          '.pv-about-section .inline-show-more-text',
          '[data-generated-suggestion-target="#about"] ~ * .pv-shared-text-with-see-more',
          '.artdeco-card.pv-about-section .pv-shared-text-with-see-more',
          '.artdeco-card .pv-shared-text-with-see-more',
          '.pv-about-section .lt-line-clamp__raw-line'
        ];
        
        let aboutElement = null;
        for (const selector of aboutSelectors) {
          await waitForElement(selector, 5000);
          aboutElement = document.querySelector(selector);
          if (aboutElement && aboutElement.textContent?.trim()) break;
        }
        data.about = aboutElement?.textContent?.trim() || 'About section not found';

        // Extract experience - wait for experience section
        console.log('Looking for experience section...');
        const experienceSelectors = [
          '#experience ~ *',
          '[data-generated-suggestion-target="#experience"] ~ *',
          '.pv-profile-section.experience-section',
          '.artdeco-card.pv-profile-section.pv-experience-section',
          '.pvs-list[aria-labelledby="experience"]'
        ];
        
        let experienceSection = null;
        for (const selector of experienceSelectors) {
          await waitForElement(selector, 5000);
          experienceSection = document.querySelector(selector);
          if (experienceSection) break;
        }
        
        const experienceItems = experienceSection?.querySelectorAll('.pvs-list__item--line-separated, .pv-entity__summary-info, .pvs-list__paged-list-item, .pvs-entity') || [];
        data.experience = Array.from(experienceItems).map((item, index) => {
          // Try to extract more detailed experience information
          const titleElement = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span, .pv-entity__summary-info-v2 h3');
          const companyElement = item.querySelector('.pv-entity__secondary-title, .t-14.t-normal span[aria-hidden="true"]');
          const dateElement = item.querySelector('.pv-entity__dates span, .pvs-list__meta-data span[aria-hidden="true"]');
          const descriptionElement = item.querySelector('.pv-entity__description, .pvs-list__item-description span[aria-hidden="true"]');

          return {
            title: titleElement?.textContent?.trim() || '',
            company: companyElement?.textContent?.trim() || '',
            dates: dateElement?.textContent?.trim() || '',
            description: descriptionElement?.textContent?.trim() || '',
            fullText: item.textContent?.trim() || `Experience item ${index + 1}`
          };
        });

        console.log('LinkedIn profile data extraction completed:', data);
        resolve(data);
        
      } catch (error: any) {
        console.error('Error extracting LinkedIn profile data:', error);
        resolve({ error: true, message: error.message, extractedAt: new Date().toISOString() });
      }
    };

    extractData();
  });
}

console.log("Background script file loaded.");
if (typeof chrome !== 'undefined' && chrome.runtime) {
    logToPopup("Background script initialized.");
} else {
    console.warn("Background: chrome.runtime not available at initial load point.");
}
