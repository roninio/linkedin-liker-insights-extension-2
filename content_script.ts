declare var chrome: any;
// This script runs in the context of the LinkedIn page.
// IMPORTANT: This is a conceptual placeholder. Robust LinkedIn scraping is complex.
// LinkedIn's HTML structure can change, breaking this script.

// Define types inline to avoid import issues
enum MessageType {
  FETCH_LIKERS_SUCCESS = 'FETCH_LIKERS_SUCCESS',
  FETCH_LIKERS_ERROR = 'FETCH_LIKERS_ERROR',
  LOG_MESSAGE = 'LOG_MESSAGE'
}

interface PartialProfile {
  name: string;
  profileUrl: string;
  title?: string;
}

// Log function to send messages to popup console via background for debugging
function logToPopup(message: string, data?: any) {
  console.log(`🔍 ContentScript: ${message}`, data);
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'DEBUG_LOG', log: message })
      .catch((e: any) => console.warn("ContentScript: Could not log to popup", e));
  }
}

// NEW APPROACH: Research-based LinkedIn modal scrolling
const scanLikersFromLinkedIn = async () => {
  try {
    logToPopup("🚀 Starting enhanced LinkedIn likers scan...");

    // Step 1: Find and click the likes/reactions button
    const likesButton = await findLikesButton();
    if (!likesButton) {
      throw new Error('Could not find likes/reactions button. Make sure you are on a LinkedIn post with reactions.');
    }

    logToPopup("✅ Found likes button, clicking...");
    (likesButton as HTMLElement).click();

    // Step 2: Wait for modal and get the scrollable container
    const modalContainer = await waitForModalAndGetScrollContainer();
    if (!modalContainer) {
      throw new Error('Could not find the reactions modal or its scrollable content.');
    }

    logToPopup("✅ Modal found, starting profile collection...");

    // Step 3: Use the research-proven scrolling method
    const allProfiles = await collectAllProfilesWithScrolling(modalContainer);
    
    logToPopup(`🎉 Collection complete! Found ${allProfiles.length} total profiles`);

    // Send results back to popup
    chrome.runtime.sendMessage({
      type: MessageType.FETCH_LIKERS_SUCCESS,
      data: allProfiles
    }).catch((error: any) => {
      logToPopup("❌ Failed to send message to popup", error);
    });

    return allProfiles;

  } catch (error: any) {
    logToPopup(`❌ Error during scan: ${error.message}`);
    chrome.runtime.sendMessage({
      type: MessageType.FETCH_LIKERS_ERROR,
      error: error.message
    }).catch(() => {
      logToPopup("❌ Failed to send error message to popup");
    });
    throw error;
  }
};

// Enhanced likes button detection based on research
async function findLikesButton(): Promise<Element | null> {
  const selectors = [
    // Primary selectors for reactions button
    'button[aria-label*="reaction" i]',
    'button[aria-label*="like" i]',
    'button[aria-label*="see who reacted" i]',
    'button[data-test-id*="reactions-count"]',
    
    // Secondary selectors
    '.social-details-social-counts__reactions-count',
    'button:has(.reactions-icon)',
    'span.reactions-count',
    
    // Fallback selectors
    'button[aria-label*="people reacted" i]',
    'button:has(span[aria-hidden="false"])'
  ];

  // Try direct selectors first
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button && isValidLikesButton(button)) {
        logToPopup(`🎯 Found likes button with selector: ${selector}`);
        return button;
      }
    } catch (e) {
      continue;
    }
  }

  // Comprehensive search through all interactive elements
  logToPopup("🔍 Trying comprehensive button search...");
  const interactiveElements = document.querySelectorAll('button, [role="button"], a, span[role="button"]');
  
  for (const element of interactiveElements) {
    if (isValidLikesButton(element)) {
      logToPopup(`🎯 Found likes button via comprehensive search`);
      return element;
    }
  }

  return null;
}

function isValidLikesButton(element: Element): boolean {
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
  const text = element.textContent?.toLowerCase() || '';
  const innerHTML = element.innerHTML.toLowerCase();

  // Check for reaction-related text
  const reactionKeywords = ['reaction', 'like', 'see who reacted', 'people reacted'];
  const hasReactionKeyword = reactionKeywords.some(keyword => 
    ariaLabel.includes(keyword) || text.includes(keyword) || innerHTML.includes(keyword)
  );

  // Check for numeric patterns that indicate reaction counts
  const hasNumericPattern = /\d+/.test(ariaLabel) || /\d+/.test(text);

  // Must have both reaction keywords and be clickable
  return hasReactionKeyword && (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button' || element.tagName === 'A');
}

// Research-based modal detection
async function waitForModalAndGetScrollContainer(): Promise<Element | null> {
  logToPopup("⏳ Waiting for modal to appear...");
  
  let attempts = 0;
  const maxAttempts = 20; // Increased attempts
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to find the modal
    const modalSelectors = [
      '[role="dialog"]',
      '.artdeco-modal',
      'div[aria-modal="true"]',
      '.reactions-modal',
      '.artdeco-modal-overlay [role="dialog"]'
    ];

    for (const selector of modalSelectors) {
      const modal = document.querySelector(selector);
      if (modal && isValidModal(modal)) {
        logToPopup(`✅ Found valid modal with selector: ${selector}`);
        
        // Find the scrollable container within the modal
        const scrollContainer = findScrollableContainer(modal);
        if (scrollContainer) {
          logToPopup(`✅ Found scrollable container within modal`);
          return scrollContainer;
        }
        
        // If no specific scrollable container, use the modal itself
        logToPopup(`📦 Using modal itself as scroll target`);
        return modal;
      }
    }
    
    attempts++;
    logToPopup(`🔄 Modal search attempt ${attempts}/${maxAttempts}`);
  }

  return null;
}

function isValidModal(modal: Element): boolean {
  const rect = modal.getBoundingClientRect();
  const hasProfiles = modal.querySelectorAll('a[href*="/in/"]').length > 0;
  const hasGoodDimensions = rect.height > 200 && rect.width > 300;
  
  logToPopup(`🔍 Modal validation: height=${rect.height}, width=${rect.width}, profiles=${modal.querySelectorAll('a[href*="/in/"]').length}`);
  
  return hasGoodDimensions && (hasProfiles || modal.textContent?.includes('reacted') || false);
}

function findScrollableContainer(modal: Element): Element | null {
  // Look for elements that have overflow scroll and contain profiles
  const potentialContainers = modal.querySelectorAll('div, section');
  
  for (const container of potentialContainers) {
    const style = getComputedStyle(container);
    const hasScroll = style.overflowY === 'scroll' || style.overflowY === 'auto' || 
                     style.overflow === 'scroll' || style.overflow === 'auto';
    const hasProfiles = container.querySelectorAll('a[href*="/in/"]').length >= 3;
    const isScrollable = container.scrollHeight > container.clientHeight;
    
    if ((hasScroll || isScrollable) && hasProfiles) {
      logToPopup(`🎯 Found scrollable container with ${container.querySelectorAll('a[href*="/in/"]').length} profiles`);
      return container;
    }
  }
  
  return null;
}

// Research-proven profile collection with scrolling
async function collectAllProfilesWithScrolling(container: Element): Promise<PartialProfile[]> {
  const collectedProfiles = new Set<string>(); // Use URL as unique key
  const profilesArray: PartialProfile[] = [];
  
  let consecutiveNoNewProfiles = 0;
  let scrollAttempt = 0;
  const maxScrollAttempts = 50;
  const maxConsecutiveNoNewProfiles = 3;

  logToPopup(`🚀 Starting profile collection with scrolling`);

  while (scrollAttempt < maxScrollAttempts && consecutiveNoNewProfiles < maxConsecutiveNoNewProfiles) {
    // Collect current profiles
    const beforeCount = collectedProfiles.size;
    extractProfilesFromContainer(container, collectedProfiles, profilesArray);
    const afterCount = collectedProfiles.size;
    const newProfilesFound = afterCount - beforeCount;

    logToPopup(`📊 Scroll ${scrollAttempt + 1}: Found ${newProfilesFound} new profiles (total: ${afterCount})`);

    if (newProfilesFound === 0) {
      consecutiveNoNewProfiles++;
      logToPopup(`⚠️ No new profiles found (${consecutiveNoNewProfiles}/${maxConsecutiveNoNewProfiles})`);
    } else {
      consecutiveNoNewProfiles = 0; // Reset counter
    }

    // Perform scrolling using multiple strategies
    await performScrolling(container, scrollAttempt + 1);
    
    // Wait for new content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    scrollAttempt++;
  }

  logToPopup(`✅ Scrolling complete! Total profiles collected: ${profilesArray.length}`);
  return profilesArray;
}

function extractProfilesFromContainer(container: Element, collectedProfiles: Set<string>, profilesArray: PartialProfile[]): void {
  const profileLinks = container.querySelectorAll('a[href*="/in/"]');
  
  profileLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Normalize the URL
    const profileUrl = href.startsWith('http') ? href : `https://linkedin.com${href}`;
    
    // Check if we've already collected this profile
    if (collectedProfiles.has(profileUrl)) return;
    
    // Extract name and title
    const name = extractNameFromProfileLink(link);
    const title = extractTitleFromProfileLink(link);
    
    if (name) {
      collectedProfiles.add(profileUrl);
      profilesArray.push({
        name,
        profileUrl,
        title
      });
    }
  });
}

function extractNameFromProfileLink(link: Element): string {
  // Try multiple methods to get the name
  const nameSelectors = [
    '.artdeco-entity-lockup__title',
    '.artdeco-entity-lockup__name',
    'span[aria-hidden="false"]',
    '.profile-card__name',
    '.member-name'
  ];

  for (const selector of nameSelectors) {
    const nameElement = link.querySelector(selector);
    if (nameElement?.textContent?.trim()) {
      return nameElement.textContent.trim();
    }
  }

  // Fallback: use aria-label or text content
  const ariaLabel = link.getAttribute('aria-label');
  if (ariaLabel) {
    // Extract name from aria-label patterns like "View John Doe's profile"
    const match = ariaLabel.match(/view\s+(.+?)'s\s+profile/i);
    if (match) return match[1].trim();
  }

  // Last resort: use any text content
  const textContent = link.textContent?.trim();
  if (textContent && textContent.length > 0 && textContent.length < 100) {
    return textContent;
  }

  return 'Unknown';
}

function extractTitleFromProfileLink(link: Element): string | undefined {
  const titleSelectors = [
    '.artdeco-entity-lockup__subtitle',
    '.artdeco-entity-lockup__caption',
    '.profile-card__headline',
    '.member-headline'
  ];

  for (const selector of titleSelectors) {
    const titleElement = link.querySelector(selector);
    if (titleElement?.textContent?.trim()) {
      return titleElement.textContent.trim();
    }
  }

  // Try to find title in parent elements
  const parent = link.closest('li, div[data-test-id], .profile-card');
  if (parent) {
    for (const selector of titleSelectors) {
      const titleElement = parent.querySelector(selector);
      if (titleElement?.textContent?.trim()) {
        return titleElement.textContent.trim();
      }
    }
  }

  return undefined;
}

// Research-based scrolling implementation
async function performScrolling(container: Element, attemptNumber: number): Promise<void> {
  const beforeScroll = {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight
  };

  logToPopup(`🔄 SCROLL ATTEMPT ${attemptNumber} - Before: scrollTop=${beforeScroll.scrollTop}, scrollHeight=${beforeScroll.scrollHeight}`);

  // Method 1: Direct scrollTop manipulation (most reliable)
  container.scrollTop = container.scrollHeight;
  await new Promise(resolve => setTimeout(resolve, 200));

  // Method 2: scrollBy for good measure
  if ('scrollBy' in container) {
    (container as any).scrollBy(0, 1000);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Method 3: Scroll to bottom using scrollIntoView on last element
  const allElements = container.querySelectorAll('*');
  if (allElements.length > 0) {
    const lastElement = allElements[allElements.length - 1];
    try {
      lastElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch (e) {
      // Ignore scrollIntoView errors
    }
  }

  // Method 4: For stubborn cases, try wheel events
  try {
    container.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 1000,
      bubbles: true,
      cancelable: true
    }));
  } catch (e) {
    // Ignore wheel event errors
  }

  const afterScroll = {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight
  };

  const scrollDelta = afterScroll.scrollTop - beforeScroll.scrollTop;
  const heightDelta = afterScroll.scrollHeight - beforeScroll.scrollHeight;

  logToPopup(`📈 SCROLL RESULT - After: scrollTop=${afterScroll.scrollTop}, scrollHeight=${afterScroll.scrollHeight}`);
  logToPopup(`📏 SCROLL DELTA - Position: +${scrollDelta}, Height: +${heightDelta}`);

  // Check if we're at the bottom
  const isAtBottom = afterScroll.scrollTop + container.clientHeight >= afterScroll.scrollHeight - 10;
  if (isAtBottom) {
    logToPopup(`🏁 Reached bottom of scrollable area`);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === 'scanLinkedInLikers') {
    logToPopup("📨 Received scan request from popup");
    scanLikersFromLinkedIn()
      .then((result) => {
        logToPopup("✅ Scan completed successfully");
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        logToPopup(`❌ Scan failed: ${error.message}`);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

logToPopup("🎯 Enhanced content script loaded and ready!");