// Focus AI Popup Main Script

console.log("Focus AI popup initializing...");

// Base Playlist
let currentTrackIndex = 0;

const basePlaylist = [
  { title: "Coffee Shop", icon: "☕", src: chrome.runtime.getURL("music/coffee-shop.mp3") },
  { title: "Jazz Lofi", icon: "🎷", src: chrome.runtime.getURL("music/jazz-lofi.mp3") },
  { title: "Lofi Chill", icon: "🎵", src: chrome.runtime.getURL("music/lofi-chill.mp3") },
  { title: "Rain Lofi", icon: "🌧", src: chrome.runtime.getURL("music/rain-lofi.mp3") },
];


// Tabs Setup

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      
      btn.classList.add("active");
      const content = document.getElementById(target);
      if (content) content.classList.add("active");

     
      if (target === "ai") {
        updateAnalytics();
      }
    });
  });
  
  console.log("✅ Tabs initialized");
}


// Focus Controls

function initFocusControls() {
  const blockToggle = document.getElementById("blockToggle");
  const blockedListEl = document.getElementById("blockedList");
  const newSiteInput = document.getElementById("newSite");
  const addButton = document.getElementById("addButton");
  const statsContent = document.getElementById("statsContent");

  if (!chrome?.storage) {
    console.error("Chrome storage API not available");
    return;
  }

  chrome.storage.sync.get(["isBlocking", "blockedSites"], (data) => {
    if (chrome.runtime.lastError) {
      console.error("Storage get error:", chrome.runtime.lastError);
      return;
    }
    if (blockToggle) blockToggle.checked = !!data.isBlocking;
    renderBlockedSites(blockedListEl, data.blockedSites || []);
  });

  if (blockToggle) {
    blockToggle.addEventListener("change", () => {
      const enabled = blockToggle.checked;
      chrome.storage.sync.set({ isBlocking: enabled }, () => {
        if (chrome.runtime.lastError) {
          console.error("Storage set error:", chrome.runtime.lastError);
          return;
        }
        try {
          chrome.runtime.sendMessage({ action: "toggleBlocking", enabled });
          console.log("Blocking toggled:", enabled);
        } catch (err) {
          console.error("Failed to send message:", err);
        }
      });
    });
  }

  if (addButton && newSiteInput) {
    addButton.addEventListener("click", () => {
      const site = (newSiteInput.value || "").trim().replace(/^https?:\/\//, "");
      if (!site) return;
      
      chrome.storage.sync.get(["blockedSites"], (data) => {
        if (chrome.runtime.lastError) {
          console.error("Storage get error:", chrome.runtime.lastError);
          return;
        }
        const list = data.blockedSites || [];
        if (!list.includes(site)) {
          list.push(site);
          chrome.storage.sync.set({ blockedSites: list }, () => {
            if (chrome.runtime.lastError) {
              console.error("Storage set error:", chrome.runtime.lastError);
              return;
            }
            renderBlockedSites(blockedListEl, list);
            newSiteInput.value = "";
            console.log("Site added:", site);
          });
        }
      });
    });
    
    newSiteInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addButton.click();
    });
  }

  if (statsContent) {
    renderStats(statsContent);
    setTimeout(() => renderStats(statsContent), 500);
  }
  
  console.log("✅ Focus controls initialized");
}

function renderBlockedSites(container, sites) {
  if (!container) return;
  container.innerHTML = "";
  
  if (!sites.length) {
    container.innerHTML = '<div class="empty-state">No sites blocked yet</div>';
    return;
  }
  
  sites.forEach((site) => {
    const tag = document.createElement("div");
    tag.className = "blocked-tag";
    tag.textContent = site;
    tag.title = "Click to remove";
    tag.style.cursor = "pointer";
    
    tag.addEventListener("click", () => {
      chrome.storage.sync.get(["blockedSites"], (data) => {
        if (chrome.runtime.lastError) {
          console.error("Storage get error:", chrome.runtime.lastError);
          return;
        }
        const list = (data.blockedSites || []).filter((s) => s !== site);
        chrome.storage.sync.set({ blockedSites: list }, () => {
          if (chrome.runtime.lastError) {
            console.error("Storage set error:", chrome.runtime.lastError);
            return;
          }
          renderBlockedSites(container, list);
          console.log("Site removed:", site);
        });
      });
    });
    
    container.appendChild(tag);
  });
}

function renderStats(container) {
  if (!chrome?.storage) {
    console.error("Chrome storage API not available");
    return;
  }
  
  chrome.storage.local.get(["trackingData"], (data) => {
    if (chrome.runtime.lastError) {
      console.error("Storage get error:", chrome.runtime.lastError);
      return;
    }
    
    const tracking = data.trackingData || {};
    const today = new Date().toDateString();
    const dayData = tracking[today] || {};
    const domains = Object.keys(dayData);
    
    if (!domains.length) {
      container.innerHTML = '<div class="empty-state">No activity tracked yet</div>';
      return;
    }
    
    container.innerHTML = domains
      .sort((a, b) => (dayData[b].timeSpent || 0) - (dayData[a].timeSpent || 0))
      .slice(0, 8)
      .map((d) => {
        const visits = dayData[d].visits || 0;
        const secs = dayData[d].timeSpent || 0;
        const mins = Math.round(secs / 60);
        return `
          <div class="site-item">
            <span class="site-name">${d}</span>
            <span class="site-visits">${visits} visits • ${mins} min</span>
          </div>`;
      })
      .join("");
  });
}


// AI Analytics 

function initAnalytics() {
  updateAnalytics();
  setInterval(() => {
    const aiTab = document.getElementById("ai");
    if (aiTab && aiTab.classList.contains("active")) {
      updateAnalytics();
    }
  }, 60000);
}

function updateAnalytics() {
  chrome.storage.local.get(["trackingData", "focusStats", "blocksCount"], (data) => {
    const trackingData = data.trackingData || {};
    const focusStats = data.focusStats || {};
    const blocksCount = data.blocksCount || {};

    const today = new Date().toDateString();
    const todayBlocks = blocksCount[today] || 0;

    // --- Calculate total focus time from today's tracking data ---
    const totalFocusSeconds = Object.values(trackingData[today] || {}).reduce(
      (sum, site) => sum + (site.timeSpent || 0),
      0
    );

    const todayFocusMinutes = Math.round(totalFocusSeconds / 60);
    focusStats[today] = todayFocusMinutes; // update focus stats
    chrome.storage.local.set({ focusStats }); // save progress

    // --- Calculate productivity score ---
    const score = calculateProductivityScore(todayFocusMinutes, todayBlocks, trackingData);

    // --- Update UI ---
    updateScoreDisplay(score);
    updateStatsCards(todayFocusMinutes, todayBlocks, focusStats);
    update7DayChart(focusStats);
    generateInsights(todayFocusMinutes, todayBlocks, trackingData, score);
  });
}

function calculateProductivityScore(focusMinutes, blocksCount, trackingData) {
  const focusScore = Math.min(focusMinutes * 1.5, 60);
  const blockScore = Math.min(blocksCount * 2, 20);
  const today = new Date().toDateString();
  const dayData = trackingData[today] || {};
  const domains = Object.keys(dayData);
  const productiveSites = ["github.com", "stackoverflow.com", "docs", "learn", "edu"];
  const productiveTime = domains
    .filter(d => productiveSites.some(ps => d.includes(ps)))
    .reduce((sum, d) => sum + (dayData[d].timeSpent || 0), 0);
  const totalTime = domains.reduce((sum, d) => sum + (dayData[d].timeSpent || 0), 0);
  const qualityScore = totalTime > 0 ? (productiveTime / totalTime) * 20 : 0;
  return Math.min(Math.round(focusScore + blockScore + qualityScore), 100);
}

function updateScoreDisplay(score) {
  const scoreValue = document.getElementById("scoreValue");
  const scoreRating = document.getElementById("scoreRating");
  const scoreDescription = document.getElementById("scoreDescription");
  const scoreCircle = document.getElementById("scoreCircle");
  if (scoreValue) {
    const currentScore = parseInt(scoreValue.textContent) || 0;
    animateValue(scoreValue, currentScore, score, 1000);
  }
  if (scoreCircle) {
    const degrees = (score / 100) * 360;
    scoreCircle.style.background = `conic-gradient(#4CAF50 ${degrees}deg, rgba(255,255,255,0.2) ${degrees}deg)`;
  }
  let rating, description;
  if (score >= 80) { rating = "🏆 Exceptional"; description = "Outstanding productivity! You're crushing it today!"; }
  else if (score >= 60) { rating = "⭐ Great"; description = "Excellent focus and discipline. Keep up the momentum!"; }
  else if (score >= 40) { rating = "👍 Good"; description = "Solid performance. A few more focused sessions will boost your score!"; }
  else if (score >= 20) { rating = "📈 Building"; description = "You're making progress. Try blocking more distractions!"; }
  else { rating = "🌱 Getting Started"; description = "Every journey starts somewhere. Let's build those habits!"; }
  if (scoreRating) scoreRating.textContent = rating;
  if (scoreDescription) scoreDescription.textContent = description;
}

function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}

function updateStatsCards(focusMinutes, blocksCount, focusStats) {
  const focusTimeValue = document.getElementById("focusTimeValue");
  if (focusTimeValue) {
    const hours = Math.floor(focusMinutes / 60);
    const mins = focusMinutes % 60;
    focusTimeValue.textContent = hours > 0 ? `${hours} h ${mins} m` : `${mins} m`;
  }
  const blocksCountValue = document.getElementById("blocksCountValue");
  if (blocksCountValue) { blocksCountValue.textContent = blocksCount; }
  const streakValue = document.getElementById("streakValue");
  if (streakValue) { const streak = calculateStreak(focusStats); streakValue.textContent = streak; }
  const avgScoreValue = document.getElementById("avgScoreValue");
  if (avgScoreValue) { const avg = calculateWeeklyAverage(focusStats); avgScoreValue.textContent = avg; }
}

function calculateStreak(focusStats) {
  const dates = Object.keys(focusStats).sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let currentDate = new Date();
  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i]);
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - i);
    if (date.toDateString() === expectedDate.toDateString() && focusStats[dates[i]] >= 30) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateWeeklyAverage(focusStats) {
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    last7Days.push(focusStats[dateStr] || 0);
  }
  const sum = last7Days.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / 7);
  return avg;
}

function update7DayChart(focusStats) {
  const chartBars = document.getElementById("chartBars");
  const chartLabels = document.getElementById("chartLabels");
  if (!chartBars || !chartLabels) return;
  chartBars.innerHTML = "";
  chartLabels.innerHTML = "";
  const last7Days = [];
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    const minutes = focusStats[dateStr] || 0;
    last7Days.push({ date, minutes, label: labels[date.getDay()] });
  }
  const maxMinutes = Math.max(...last7Days.map(d => d.minutes), 1);
  last7Days.forEach(day => {
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    const heightPercent = (day.minutes / maxMinutes) * 100;
    bar.style.height = `${Math.max(heightPercent, 5)}%`;
    bar.title = `${day.label}: ${day.minutes} minutes`;
    chartBars.appendChild(bar);
    const label = document.createElement("div");
    label.textContent = day.label;
    chartLabels.appendChild(label);
  });
}

function generateInsights(focusMinutes, blocksCount, trackingData, score) {
  const insightsList = document.getElementById("insightsList");
  if (!insightsList) return;
  insightsList.innerHTML = "";
  const insights = [];
  if (score >= 80) insights.push({ icon: "🎉", text: "You're in the top productivity zone! Amazing work ethic." });
  else if (score < 40) insights.push({ icon: "💪", text: "Try setting a goal of 60 minutes focused work today." });
  if (focusMinutes < 30) insights.push({ icon: "⏰", text: "Aim for at least 2 hours of focused work for optimal productivity." });
  else if (focusMinutes >= 120) insights.push({ icon: "🔥", text: "Over 2 hours focused! Don't forget to take short breaks." });
  if (blocksCount === 0) insights.push({ icon: "🚫", text: "Enable website blocking to prevent distractions automatically." });
  else if (blocksCount >= 5) insights.push({ icon: "🛡️", text: `Blocked ${blocksCount} distractions today. Your focus is improving!` });
  const today = new Date().toDateString();
  const dayData = trackingData[today] || {};
  const domains = Object.keys(dayData);
  if (domains.length > 15) insights.push({ icon: "🎯", text: "You're switching between many sites. Try focusing on fewer tasks." });
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 12 && focusMinutes < 30) insights.push({ icon: "☀️", text: "Morning is prime focus time. Use it wisely!" });
  if (insights.length === 0) insights.push({ icon: "📊", text: "Keep tracking your activity to receive personalized insights." });
  insights.forEach(insight => {
    const item = document.createElement("div");
    item.className = "insight-item";
    item.innerHTML = `<span class="insight-icon">${insight.icon}</span><span>${insight.text}</span>`;
    insightsList.appendChild(item);
  });
}

// Music Player 

function initMusicPlayer() {
  const trackGrid = document.getElementById("trackGrid");
  const currentTrackName = document.getElementById("currentTrackName");
  const playingIcon = document.getElementById("playingIcon");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const addSongBtn = document.getElementById("addSongBtn");
  const customSongInput = document.getElementById("customSongInput");

  if (!trackGrid) return console.error("Music player elements not found");

  let isPlaying = false;
  let currentIndex = 0;
  let userPlaylist = [];

  chrome.storage.local.get(["customSongs", "musicVolume", "currentTrack", "musicPlaying"], (data) => {
    userPlaylist = data.customSongs || [];
    if (data.musicVolume !== undefined) {
      const v = Math.round((data.musicVolume || 0.7) * 100);
      volumeSlider.value = v;
      volumeValue.textContent = `${v}%`;
    }
    if (data.currentTrack !== undefined) currentIndex = data.currentTrack;
    isPlaying = !!data.musicPlaying;
    renderTrackGrid();
 
  });

  function getFullPlaylist() {
    return [...basePlaylist, ...userPlaylist];
  }

  function renderTrackGrid() {
    trackGrid.innerHTML = "";
    const full = getFullPlaylist();
    full.forEach((t, i) => {
      const card = document.createElement("div");
      card.className = "track-card";
      if (i === currentIndex) card.classList.add("active");
      card.innerHTML = `<div class="track-icon">${t.icon || "🎵"}</div><div class="track-title">${t.title}</div>`;
      card.addEventListener("click", async () => await playTrack(i));
      trackGrid.appendChild(card);
    });
  }

  async function playTrack(index) {
    try {
      const full = getFullPlaylist();
      const volume = volumeSlider.value / 100;

     
      await chrome.runtime.sendMessage({ action: "audio:init", playlist: full, volume });

     
      const response = await chrome.runtime.sendMessage({ action: "audio:playTrack", index });

      if (response?.success) {
        currentIndex = index;
        isPlaying = true;
        const track = full[index];
        currentTrackName.textContent = `${track.icon || "🎵"} ${track.title}`;
        document.querySelectorAll(".track-card").forEach((c, i) => c.classList.toggle("active", i === index));
        playPauseBtn.textContent = "⏸ Pause Music";
        chrome.storage.local.set({ currentTrack: index, musicPlaying: true });
        console.log(`▶️ Now playing: ${full[index].title}`);
      } else {
        currentTrackName.textContent = "⚠️ " + (response?.error || "Playback failed");
      }
    } catch (err) {
      currentTrackName.textContent = "⚠️ " + err.message;
      console.error("Play error:", err);
    }
  }

  // Volume control
  volumeSlider.addEventListener("input", async () => {
    const v = volumeSlider.value / 100;
    volumeValue.textContent = `${Math.round(v * 100)}%`;
    chrome.storage.local.set({ musicVolume: v });
    try {
      await chrome.runtime.sendMessage({ action: "audio:setVolume", volume: v });
    } catch (e) {
      console.warn("Failed to set volume:", e);
    }
  });

  // Play / Pause
  playPauseBtn.addEventListener("click", async () => {
    try {
      const full = getFullPlaylist();
      const volume = volumeSlider.value / 100;

      // Ensure offscreen is created/initialized
      await chrome.runtime.sendMessage({ action: "audio:init", playlist: full, volume });

      // Then toggle playback
      await chrome.runtime.sendMessage({ action: "audio:toggle" });

      isPlaying = !isPlaying;
      playPauseBtn.textContent = isPlaying ? "⏸ Pause Music" : "▶️ Resume Music";
      chrome.storage.local.set({ musicPlaying: isPlaying });
    } catch (err) {
      console.error("Toggle play error:", err);
    }
  });

  // Add custom song handler
  addSongBtn.addEventListener("click", () => customSongInput.click());

  customSongInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

  
    const blobUrl = URL.createObjectURL(file);
    const song = { title: file.name.replace(/\.[^/.]+$/, ""), icon: "🎶", src: blobUrl };

    userPlaylist.push(song);
    await chrome.storage.local.set({ customSongs: userPlaylist });
    renderTrackGrid();

    // auto-play the newly added song
    const newIndex = basePlaylist.length + (userPlaylist.length - 1);
    await playTrack(newIndex);

    // Clear file input so same file can be added again if needed
    customSongInput.value = "";
  });

  renderTrackGrid();
  console.log("✅ Music UI ready");
}


// Initialize on DOM Load

document.addEventListener("DOMContentLoaded", () => {
  console.log("Focus AI popup loaded successfully.");

  if (!chrome?.runtime?.id) {
    console.error("Extension context invalidated - please reload the extension");
    return;
  }

  try {
    setupTabs();
    initFocusControls();
    initAnalytics();
    initMusicPlayer();
    console.log("✅ All modules initialized successfully");
  } catch (err) {
    console.error("Initialization error:", err);
  }
});
