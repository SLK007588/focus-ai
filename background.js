console.log("🧠 Focus AI background service worker active");

let audioPort = null;


// 🔧 Extension Installation Setup

chrome.runtime.onInstalled.addListener(() => {
  console.log("Focus AI installed");

  chrome.storage.sync.get(
    ["blockedSites", "isBlocking", "aiRemindersEnabled", "reminderInterval"],
    (data) => {
      const blockedSites =
        data.blockedSites || [
          "youtube.com",
          "facebook.com",
          "instagram.com",
          "twitter.com",
          "reddit.com",
          "tiktok.com",
        ];
      const isBlocking = data.isBlocking || false;
      const aiRemindersEnabled = data.aiRemindersEnabled !== false;
      const reminderInterval = data.reminderInterval || 30;

      chrome.storage.sync.set(
        {
          blockedSites,
          isBlocking,
          aiRemindersEnabled,
          reminderInterval,
        },
        () => {
          console.log("✅ Settings initialized");
          setupReminders();
        }
      );
    }
  );
});


//  Reminder Scheduling

function setupReminders() {
  chrome.alarms.clear("focusReminder", () => {
    chrome.storage.sync.get(["aiRemindersEnabled", "reminderInterval"], (data) => {
      if (!data.aiRemindersEnabled) {
        console.log("AI reminders disabled");
        return;
      }

      const intervalMinutes = data.reminderInterval || 30;
      chrome.alarms.create("focusReminder", { periodInMinutes: intervalMinutes });
      console.log(`⏰ Reminder scheduled every ${intervalMinutes} minutes`);
    });
  });
}

// Handle reminder trigger
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focusReminder") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Focus Reminder 🧠",
      message: "Take a deep breath, refocus, and stay productive!",
      priority: 2,
    });
  }
});


//  Offscreen Audio Logic

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("offscreenAudio.html");
  const hasDoc = await chrome.offscreen.hasDocument();
  if (!hasDoc) {
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: "Background music playback for Focus AI",
    });
    console.log("✅ Offscreen document created");
  }
}


//  Message Handler

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.action) return;

  // --- AUDIO COMMANDS ---
  if (msg.action.startsWith("audio:")) {
    (async () => {
      try {
        await ensureOffscreenDocument();

        if (audioPort) {
          audioPort.postMessage(msg);
          sendResponse({ success: true });
          return;
        }

        // Create a new connection to offscreen document
        const port = chrome.runtime.connect({ name: "audio" });
        audioPort = port;

        port.onMessage.addListener((response) => {
          console.log("🎵 Offscreen replied:", response);
        });

        port.onDisconnect.addListener(() => {
          console.warn("⚠️ Audio port disconnected");
          audioPort = null;
        });

        port.postMessage(msg);
        sendResponse({ success: true });
      } catch (err) {
        console.error("❌ Background audio init error:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  
  if (msg.action === "refreshReminders") {
    setupReminders();
    sendResponse({ success: true });
    return true;
  }
});
