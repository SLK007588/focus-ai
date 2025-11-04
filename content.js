// =============================================
// 🚫 Focus AI — Content Script (Blocker + Time Tracker)
// =============================================

// 🛡️ Safe Chrome API wrapper
function safeChrome(fn) {
  try {
    if (chrome?.runtime?.id) fn();
    else console.warn("[Focus AI] Chrome context not ready yet.");
  } catch (err) {
    console.warn("[Focus AI] Ignored invalid context:", err.message);
  }
}

// ----------- 1️⃣  BLOCK DISTRACTING SITES -----------
safeChrome(() => {
  chrome.storage.sync.get(["isBlocking", "blockedSites"], (data) => {
    if (!data.isBlocking) return; // Blocking disabled

    const blockedSites = data.blockedSites || [];
    const currentHost = window.location.hostname;
    const isBlocked = blockedSites.some((site) => currentHost.includes(site));

    if (isBlocked) {
      const redirectUrl = chrome.runtime.getURL(
        `blocked.html?site=${encodeURIComponent(window.location.href)}`
      );
      console.log(`[Focus AI] 🚫 Blocking access to: ${currentHost}`);
      window.location.replace(redirectUrl);
      return;
    }
  });
});

// ----------- 2️⃣  TRACK ACTIVE TIME ON PAGE -----------
let activeTime = 0;
let isActive = true;
let intervalId = null;

window.addEventListener("load", () => {
  console.log("[Focus AI] ⏱️ Tracking started for:", window.location.hostname);
  startTracking();
});

["mousemove", "keypress", "scroll", "click"].forEach((event) => {
  document.addEventListener(event, () => {
    isActive = true;
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && activeTime > 0) {
    updateTimeSpent();
  }
});

setInterval(() => {
  if (isActive) isActive = false;
}, 5000);

function startTracking() {
  intervalId = setInterval(() => {
    if (isActive && document.visibilityState === "visible") {
      activeTime++;
      if (activeTime % 10 === 0) {
        updateTimeSpent();
      }
    }
  }, 1000);
}

function updateTimeSpent() {
  safeChrome(() => {
    const today = new Date().toDateString();
    const domain = window.location.hostname;

    chrome.storage.local.get(["trackingData"], (data) => {
      const tracking = data.trackingData || {};

      if (!tracking[today]) tracking[today] = {};
      if (!tracking[today][domain])
        tracking[today][domain] = { visits: 0, timeSpent: 0 };

      tracking[today][domain].timeSpent += 10;
      tracking[today][domain].visits += 1;

      chrome.storage.local.set({ trackingData: tracking }, () => {
        console.log(`[Focus AI] ⏱️ Updated ${domain}: +10s`);
        safeChrome(() => {
          chrome.runtime.sendMessage({ action: "updateAnalytics" });
        });
      });
    });
  });
}

window.addEventListener("beforeunload", () => {
  if (activeTime > 0) updateTimeSpent();
  if (intervalId) clearInterval(intervalId);
});

// Handle context invalidation
window.addEventListener("error", (e) => {
  if (e.message.includes("Extension context invalidated")) {
    console.warn("[Focus AI] Context invalidated — reloading page...");
    setTimeout(() => location.reload(), 1500);
  }
});
