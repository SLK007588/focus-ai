// Content script for Focus AI
// This runs on every page to help track and manage focus

// Check if site should be blocked
chrome.storage.sync.get(['isBlocking', 'blockedSites'], (data) => {
  if (!data.isBlocking) return;

  const blockedSites = data.blockedSites || [];
  const currentHost = window.location.hostname;

  const isBlocked = blockedSites.some(site => currentHost.includes(site));

  if (isBlocked) {
    // Site is blocked, redirect will be handled by background script
    return;
  }
});

// Track active time on page
let activeTime = 0;
let isActive = true;
let intervalId = null;

// Start tracking when page loads
window.addEventListener('load', () => {
  startTracking();
});

// Detect if user is active on the page
document.addEventListener('mousemove', () => {
  isActive = true;
});

document.addEventListener('keypress', () => {
  isActive = true;
});

document.addEventListener('scroll', () => {
  isActive = true;
});

// Check for inactivity
setInterval(() => {
  if (isActive) {
    isActive = false;
  }
}, 5000);

function startTracking() {
  intervalId = setInterval(() => {
    if (isActive && document.visibilityState === 'visible') {
      activeTime += 1;

      // Update storage every 10 seconds
      if (activeTime % 10 === 0) {
        updateTimeSpent();
      }
    }
  }, 1000);
}

function updateTimeSpent() {
  const today = new Date().toDateString();
  const domain = window.location.hostname;

  chrome.storage.local.get(['trackingData'], (data) => {
    const tracking = data.trackingData || {};

    if (!tracking[today]) {
      tracking[today] = {};
    }

    if (!tracking[today][domain]) {
      tracking[today][domain] = { visits: 0, timeSpent: 0 };
    }

    tracking[today][domain].timeSpent = (tracking[today][domain].timeSpent || 0) + 10;

    chrome.storage.local.set({ trackingData: tracking });
  });
}

// Save data when leaving page
window.addEventListener('beforeunload', () => {
  if (activeTime > 0) {
    updateTimeSpent();
  }
  if (intervalId) {
    clearInterval(intervalId);
  }
});
