// ============================
// 🧠 Focus AI Popup Main Script
// ============================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Focus AI popup loaded successfully.");
  setupTabs();
  initFocusControls();
  initAIControls();
  initMusicPlayer();
});

// ============================
// ⏰ Reminder System
// ============================

// Tabs
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
    });
  });
}

// Focus tab controls
function initFocusControls() {
  const blockToggle = document.getElementById("blockToggle");
  const blockedListEl = document.getElementById("blockedList");
  const newSiteInput = document.getElementById("newSite");
  const addButton = document.getElementById("addButton");
  const statsContent = document.getElementById("statsContent");

  // Load initial state
  chrome.storage.sync.get(["isBlocking", "blockedSites"], (data) => {
    if (blockToggle) blockToggle.checked = !!data.isBlocking;
    renderBlockedSites(blockedListEl, data.blockedSites || []);
  });

  // Toggle blocking
  if (blockToggle) {
    blockToggle.addEventListener("change", () => {
      const enabled = blockToggle.checked;
      chrome.storage.sync.set({ isBlocking: enabled }, () => {
        chrome.runtime.sendMessage({ action: "toggleBlocking", enabled });
      });
    });
  }

  // Add blocked site
  if (addButton && newSiteInput) {
    addButton.addEventListener("click", () => {
      const site = (newSiteInput.value || "").trim().replace(/^https?:\/\//, "");
      if (!site) return;
      chrome.storage.sync.get(["blockedSites"], (data) => {
        const list = data.blockedSites || [];
        if (!list.includes(site)) list.push(site);
        chrome.storage.sync.set({ blockedSites: list }, () => {
          renderBlockedSites(blockedListEl, list);
          newSiteInput.value = "";
        });
      });
    });
  }

  // Render stats (today)
  if (statsContent) {
    renderStats(statsContent);
    // Refresh briefly after open
    setTimeout(() => renderStats(statsContent), 500);
  }
}

function renderBlockedSites(container, sites) {
  if (!container) return;
  container.innerHTML = "";
  if (!sites.length) {
    container.innerHTML = '<div class="empty-state">No sites blocked yet</div>';
    return;
  }
  sites.forEach((site, idx) => {
    const tag = document.createElement("div");
    tag.className = "blocked-tag";
    tag.textContent = site;
    tag.title = "Click to remove";
    tag.style.cursor = "pointer";
    tag.addEventListener("click", () => {
      chrome.storage.sync.get(["blockedSites"], (data) => {
        const list = (data.blockedSites || []).filter((s) => s !== site);
        chrome.storage.sync.set({ blockedSites: list }, () => renderBlockedSites(container, list));
      });
    });
    container.appendChild(tag);
  });
}

function renderStats(container) {
  chrome.storage.local.get(["trackingData"], (data) => {
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

// AI tab controls
function initAIControls() {
  const reminderToggle = document.getElementById("reminderToggle");
  const intervalSelect = document.getElementById("reminderInterval");
  const testBtn = document.getElementById("testReminder");

  chrome.storage.sync.get(["aiRemindersEnabled", "reminderInterval"], (data) => {
    if (reminderToggle) reminderToggle.checked = data.aiRemindersEnabled !== false;
    if (intervalSelect && data.reminderInterval) intervalSelect.value = String(data.reminderInterval);
  });

  if (reminderToggle) {
    reminderToggle.addEventListener("change", () => {
      const enabled = reminderToggle.checked;
      chrome.storage.sync.set({ aiRemindersEnabled: enabled }, () => {
        chrome.runtime.sendMessage({ action: "toggleReminders", enabled });
      });
    });
  }

  if (intervalSelect) {
    intervalSelect.addEventListener("change", () => {
      const minutes = parseInt(intervalSelect.value, 10) || 30;
      chrome.storage.sync.set({ reminderInterval: minutes }, () => {
        // ask background to re-arm immediately
        chrome.runtime.sendMessage({ action: "toggleReminders", enabled: true });
        // show next alarm time if available
        if (typeof chrome.alarms?.get === 'function') {
          chrome.alarms.get('aiReminder', (alarm) => {
            if (alarm) {
              const when = new Date(alarm.scheduledTime);
              console.log('Next AI reminder at', when.toLocaleTimeString());
            }
          });
        }
      });
    });
  }

  if (testBtn) {
    testBtn.addEventListener("click", () => {
      let responded = false;
      try {
        chrome.runtime.sendMessage({ action: "testReminder" }, () => {
          responded = true;
          if (chrome.runtime.lastError) {
            // fallback to create from popup context
            tryCreateLocalNotification();
          }
        });
        // if background doesn't respond (service worker asleep), fallback after short delay
        setTimeout(() => {
          if (!responded) tryCreateLocalNotification();
        }, 300);
      } catch (_) {
        tryCreateLocalNotification();
      }
    });
  }

  // Listen for background confirmation of reminders
  try {
    chrome.runtime.onMessage.addListener((req) => {
      if (req && req.action === 'aiReminderFired') {
        console.log('AI reminder fired:', req.message);
      }
    });
  } catch (_) {}
}

function tryCreateLocalNotification() {
  try {
    chrome.notifications.create('focusai-test-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Focus AI Reminder',
      message: 'Test reminder from popup',
      priority: 2,
      requireInteraction: true
    });
  } catch (e) {
    console.warn('Local notification failed:', e && (e.message || e));
    alert('Notifications appear blocked by the OS or browser. Please enable notifications for Chrome.');
  }
}

// ============================
// 🎧 Integrated Music Player
// ============================

let audioPlayer;
let playlistContainer;
let playPauseBtn;
let prevBtn;
let nextBtn;
let volumeSlider;
let albumIcon;
let currentTrackNameEl;
let statusMessageEl;

// --- Default local playlist (packaged in extension for reliability) ---
const playlist = [
  {
    title: "☕ Coffee Shop",
    artist: "Lofi Beats",
    src: chrome.runtime.getURL("music/coffee-shop.mp3.mp3"),
  },
  {
    title: "🎷 Jazz Lofi",
    artist: "Relax Vibes",
    src: chrome.runtime.getURL("music/jazz-lofi.mp3"),
  },
  {
    title: "🎵 Lofi Chill",
    artist: "Study Flow",
    src: chrome.runtime.getURL("music/lofi-chill.mp3"),
  },
  {
    title: "🌧 Rain Lofi",
    artist: "Ambient Relax",
    src: chrome.runtime.getURL("music/rain-lofi.mp3"),
  },
];

let currentTrack = -1;
let isPlaying = false;
let useOffscreenAudio = true;

// --- Render Playlist ---
function renderPlaylist() {
  if (!playlistContainer) return;
  playlistContainer.innerHTML = "";
  playlist.forEach((track, index) => {
    const el = document.createElement("div");
    el.className = "track-item";
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.1);">
        <span>${track.title}</span>
        <span style="opacity:0.7;font-size:12px;">${track.artist}</span>
      </div>
    `;
    el.addEventListener("click", () => playTrack(index));
    playlistContainer.appendChild(el);
  });
  if (statusMessageEl) statusMessageEl.textContent = "🎶 Choose a song to play below.";
}

// --- Centralized autoplay fallback helper ---
function playWithAutoplayFallback() {
  return new Promise((resolve, reject) => {
    if (!audioPlayer) return reject(new Error("No audio element"));
    audioPlayer.play()
      .then(resolve)
      .catch((err) => {
        const name = (err && err.name) || "";
        if (name === "NotAllowedError" || name === "DOMException") {
          try {
            audioPlayer.muted = true;
            audioPlayer.play()
              .then(() => {
                setTimeout(() => {
                  audioPlayer.muted = false;
                  resolve();
                }, 200);
              })
              .catch(reject);
          } catch (e) {
            reject(err || e);
          }
        } else {
          reject(err);
        }
      });
  });
}

// --- Play selected track ---
function playTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentTrack = index;
  const track = playlist[index];
  if (useOffscreenAudio) {
    sendAudioCommand('audio:init', { playlist, volume: 0.7 }).finally(() => {
      sendAudioCommand('audio:playIndex', { index })
        .then(() => {
          isPlaying = true;
          updatePlayButton();
          if (statusMessageEl) statusMessageEl.textContent = `▶️ Now playing: ${track.title}`;
          if (currentTrackNameEl) currentTrackNameEl.textContent = track.title;
          if (albumIcon) albumIcon.classList.add("playing");
          highlightTrack(index);
        })
        .catch((e) => {
          console.error('Playback failed:', e);
          if (statusMessageEl) statusMessageEl.textContent = "⚠️ Could not play track.";
        });
    });
  } else {
    audioPlayer.src = track.src;
    try { audioPlayer.crossOrigin = "anonymous"; } catch (_) {}
    audioPlayer.load();
    playWithAutoplayFallback()
      .then(() => {
        isPlaying = true;
        updatePlayButton();
        if (statusMessageEl) statusMessageEl.textContent = `▶️ Now playing: ${track.title}`;
        if (currentTrackNameEl) currentTrackNameEl.textContent = track.title;
        if (albumIcon) albumIcon.classList.add("playing");
        highlightTrack(index);
      })
      .catch((err) => {
        console.error("Playback failed:", err && (err.name + ": " + (err.message || "")));
        if (statusMessageEl) statusMessageEl.textContent = "⚠️ Could not play track. Try another or click ▶️ again.";
      });
  }
}

// --- Toggle play/pause ---
function togglePlay() {
  if (!useOffscreenAudio && !audioPlayer) return;
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
    if (statusMessageEl) statusMessageEl.textContent = "⏸ Paused";
    if (albumIcon) albumIcon.classList.remove("playing");
  } else {
    if (currentTrack === -1) {
      playTrack(0);
    } else {
      if (useOffscreenAudio) {
        sendAudioCommand('audio:toggle').then(() => {
          isPlaying = !isPlaying;
          if (statusMessageEl) statusMessageEl.textContent = isPlaying ? `▶️ Resumed: ${playlist[currentTrack].title}` : '⏸ Paused';
          if (albumIcon) albumIcon.classList.toggle('playing', isPlaying);
        });
      } else {
        playWithAutoplayFallback()
          .then(() => {
            isPlaying = true;
            if (statusMessageEl) statusMessageEl.textContent = `▶️ Resumed: ${playlist[currentTrack].title}`;
            if (albumIcon) albumIcon.classList.add("playing");
          })
          .catch((err) => {
            console.error("Playback failed:", err && (err.name + ": " + (err.message || "")));
            if (statusMessageEl) statusMessageEl.textContent = "🔈 Click ▶️ to allow audio playback.";
          });
      }
    }
  }
  updatePlayButton();
}

// --- Update play/pause button ---
function updatePlayButton() {
  if (playPauseBtn) playPauseBtn.textContent = isPlaying ? "⏸" : "▶️";
}

// --- Highlight current track ---
function highlightTrack(index) {
  if (!playlistContainer) return;
  const allTracks = playlistContainer.querySelectorAll(".track-item");
  allTracks.forEach((item, i) => {
    item.style.background = i === index ? "rgba(255,255,255,0.1)" : "transparent";
  });
}

// --- Auto-play next track ---
function bindAudioEvents() {
  if (!audioPlayer) return;
  audioPlayer.addEventListener("ended", () => {
    if (currentTrack < playlist.length - 1) {
      playTrack(currentTrack + 1);
    } else {
      isPlaying = false;
      updatePlayButton();
      if (statusMessageEl) statusMessageEl.textContent = "🎵 Playlist finished.";
      if (albumIcon) albumIcon.classList.remove("playing");
    }
  });
}

// --- Bind play/pause button ---
function initMusicPlayer() {
  audioPlayer = document.getElementById("audioPlayer");
  playlistContainer = document.getElementById("playlistMini");
  playPauseBtn = document.getElementById("playPause");
  prevBtn = document.getElementById("prevTrack");
  nextBtn = document.getElementById("nextTrack");
  volumeSlider = document.getElementById("volume");
  albumIcon = document.getElementById("albumIcon");
  currentTrackNameEl = document.getElementById("currentTrackName");
  statusMessageEl = document.getElementById("musicStatus");

  if (audioPlayer) {
    audioPlayer.volume = 0.7;
    try { audioPlayer.preload = "auto"; } catch (_) {}
    bindAudioEvents();
  }
  renderPlaylist();

  if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);
  if (prevBtn) prevBtn.addEventListener("click", () => {
    if (useOffscreenAudio) {
      const idx = currentTrack > 0 ? currentTrack - 1 : playlist.length - 1;
      sendAudioCommand('audio:playIndex', { index: idx }).then(() => {
        currentTrack = idx;
        isPlaying = true;
        updatePlayButton();
        if (statusMessageEl) statusMessageEl.textContent = `▶️ Now playing: ${playlist[idx].title}`;
        if (currentTrackNameEl) currentTrackNameEl.textContent = playlist[idx].title;
        if (albumIcon) albumIcon.classList.add("playing");
        highlightTrack(idx);
      }).catch((e) => console.error('Playback failed:', e));
    } else if (currentTrack > 0) {
      playTrack(currentTrack - 1);
    }
  });
  if (nextBtn) nextBtn.addEventListener("click", () => {
    if (useOffscreenAudio) {
      const idx = currentTrack < playlist.length - 1 ? currentTrack + 1 : 0;
      sendAudioCommand('audio:playIndex', { index: idx }).then(() => {
        currentTrack = idx;
        isPlaying = true;
        updatePlayButton();
        if (statusMessageEl) statusMessageEl.textContent = `▶️ Now playing: ${playlist[idx].title}`;
        if (currentTrackNameEl) currentTrackNameEl.textContent = playlist[idx].title;
        if (albumIcon) albumIcon.classList.add("playing");
        highlightTrack(idx);
      }).catch((e) => console.error('Playback failed:', e));
    } else if (currentTrack < playlist.length - 1) {
      playTrack(currentTrack + 1);
    }
  });
  if (volumeSlider) volumeSlider.addEventListener("input", () => {
    const v = Math.max(0, Math.min(100, parseInt(volumeSlider.value || "70", 10)));
    if (!useOffscreenAudio && audioPlayer) audioPlayer.volume = v / 100;
    if (useOffscreenAudio) sendAudioCommand('audio:setVolume', { volume: v / 100 });
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    }
  });
}

function sendAudioCommand(action, payload = {}) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ action, ...payload }, (resp) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!resp || resp.ok === false) return reject(resp && resp.error ? new Error(resp.error) : new Error('Unknown audio error'));
        resolve(resp);
      });
    } catch (e) { reject(e); }
  });
}
