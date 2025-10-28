// Background service worker for Focus AI

let blockedSites = [];
let isBlocking = false;
let trackingData = {};
let aiRemindersEnabled = true;

// AI Reminder messages
const aiReminders = {
  water: [
    "💧 Time to hydrate! Your brain is 73% water. Drink up!",
    "💧 Hey there! Been a while since you had water. Stay hydrated!",
    "💧 Hydration check! Grab some water to keep your focus sharp.",
    "💧 Your body needs water! Take a quick sip and get back to crushing it."
  ],
  posture: [
    "🧘 Posture check! Sit up straight and relax those shoulders.",
    "🧘 Time to adjust your posture. Your back will thank you!",
    "🧘 Quick reminder: Roll your shoulders and straighten your spine.",
    "🧘 Sitting properly? Let's fix that posture for better focus!"
  ],
  eyes: [
    "👀 Eye break time! Look at something 20 feet away for 20 seconds.",
    "👀 Your eyes need a rest. Look away from the screen for a moment.",
    "👀 20-20-20 rule: Look 20 feet away for 20 seconds every 20 minutes.",
    "👀 Give your eyes a break! Blink and look into the distance."
  ],
  stretch: [
    "🤸 Time to stretch! Stand up and move around for a minute.",
    "🤸 Your body needs movement. Quick stretch break!",
    "🤸 Stretch those muscles! A 1-minute break boosts productivity.",
    "🤸 Stand up, stretch, and shake it out. You've earned it!"
  ],
  break: [
    "☕ You've been focused for a while! Take a 5-minute break.",
    "☕ Great work! Time for a short break to recharge.",
    "☕ Break time! Step away and come back refreshed.",
    "☕ You're doing awesome! Quick break to maintain that momentum."
  ],
  motivation: [
    "⚡ You're doing great! Keep up the focused work!",
    "⚡ Productivity mode activated! You're on fire today!",
    "⚡ Small progress is still progress. Keep going!",
    "⚡ Every focused moment counts. You've got this!"
  ]
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Focus AI installed');
  
  chrome.storage.sync.get(['blockedSites', 'isBlocking', 'aiRemindersEnabled', 'reminderInterval'], (data) => {
    blockedSites = data.blockedSites || [
      'youtube.com',
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'reddit.com',
      'tiktok.com'
    ];
    isBlocking = data.isBlocking || false;
    aiRemindersEnabled = data.aiRemindersEnabled !== false;
    
    chrome.storage.sync.set({ 
      blockedSites, 
      isBlocking, 
      aiRemindersEnabled,
      reminderInterval: data.reminderInterval || 30
    }, () => {
      console.log('Settings initialized');
      setupReminders();
    });
  });
});

// Load settings on startup
chrome.storage.sync.get(['blockedSites', 'isBlocking', 'aiRemindersEnabled'], (data) => {
  blockedSites = data.blockedSites || [];
  isBlocking = data.isBlocking || false;
  aiRemindersEnabled = data.aiRemindersEnabled !== false;
  console.log('Settings loaded:', { isBlocking, aiRemindersEnabled });
  setupReminders();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
  
  if (changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue;
  }
  if (changes.isBlocking) {
    isBlocking = changes.isBlocking.newValue;
  }
  if (changes.aiRemindersEnabled) {
    aiRemindersEnabled = changes.aiRemindersEnabled.newValue;
    if (aiRemindersEnabled) {
      setupReminders();
    } else {
      chrome.alarms.clear('aiReminder');
    }
  }
  if (changes.reminderInterval) {
    setupReminders();
  }
});

// Set up AI reminders using alarms
function setupReminders() {
  chrome.alarms.clear('aiReminder', (wasCleared) => {
    console.log('Previous alarm cleared:', wasCleared);
    
    chrome.storage.sync.get(['reminderInterval', 'aiRemindersEnabled'], (data) => {
      console.log('Setting up reminders with data:', data);
      
      if (data.aiRemindersEnabled !== false) {
        const interval = data.reminderInterval || 30;
        chrome.alarms.create('aiReminder', { 
          delayInMinutes: interval,
          periodInMinutes: interval 
        }, () => {
          console.log(`Reminder alarm created with ${interval} minute interval`);
        });
      }
    });
  });
}

// Handle alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  
  if (alarm.name === 'aiReminder') {
    sendAIReminder();
  }
});

// Send AI reminder notification
function sendAIReminder() {
  console.log('sendAIReminder called');
  
  chrome.storage.sync.get(['aiRemindersEnabled'], (data) => {
    console.log('AI Reminders enabled:', data.aiRemindersEnabled);
    
    if (data.aiRemindersEnabled === false) {
      console.log('Reminders are disabled');
      return;
    }
    
    // Randomly select a reminder category
    const categories = Object.keys(aiReminders);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const messages = aiReminders[category];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    console.log('Creating notification with message:', message);
    
    // Create notification with higher priority and require interaction
    chrome.notifications.create('focusai-reminder-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Focus AI Reminder',
      message: message,
      priority: 2,
      requireInteraction: true,  // Makes notification stay until user dismisses
      silent: false
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Notification error:', chrome.runtime.lastError);
      } else {
        console.log('Notification created successfully:', notificationId);
      }
    });
  });
}

// Check if URL is blocked
function isUrlBlocked(url) {
  if (!isBlocking) return false;
  
  try {
    const urlObj = new URL(url);
    return blockedSites.some(site => urlObj.hostname.includes(site));
  } catch (e) {
    return false;
  }
}

// Track time spent on sites
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      trackTimeOnSite(tab.url);
    }
  } catch (e) {
    console.error('Error tracking tab:', e);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    trackTimeOnSite(changeInfo.url);
  }
  
  // Block if necessary
  if (changeInfo.url && isBlocking && isUrlBlocked(changeInfo.url)) {
    console.log('Blocking site:', changeInfo.url);
    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(changeInfo.url)
    });
  }
});

function trackTimeOnSite(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const today = new Date().toDateString();
    
    chrome.storage.local.get(['trackingData'], (data) => {
      const tracking = data.trackingData || {};
      
      if (!tracking[today]) {
        tracking[today] = {};
      }
      
      if (!tracking[today][domain]) {
        tracking[today][domain] = { visits: 0, timeSpent: 0 };
      }
      
      tracking[today][domain].visits++;
      
      chrome.storage.local.set({ trackingData: tracking });
    });
  } catch (e) {
    // Invalid URL
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'getTrackingData') {
    chrome.storage.local.get(['trackingData'], (data) => {
      sendResponse({ data: data.trackingData || {} });
    });
    return true;
  }
  
  if (request.action === 'toggleBlocking') {
    isBlocking = request.enabled;
    chrome.storage.sync.set({ isBlocking }, () => {
      console.log('Blocking toggled:', isBlocking);
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'toggleReminders') {
    aiRemindersEnabled = request.enabled;
    chrome.storage.sync.set({ aiRemindersEnabled }, () => {
      console.log('Reminders toggled:', aiRemindersEnabled);
      if (aiRemindersEnabled) {
        setupReminders();
      } else {
        chrome.alarms.clear('aiReminder');
      }
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'testReminder') {
    console.log('Test reminder triggered');
    sendAIReminder();
    sendResponse({ success: true });
    return true;
  }
});