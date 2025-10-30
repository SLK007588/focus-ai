// Prevent double-init
if (window.__focusAI_popup_initialized) {
	// already initialized; stop further execution
	console.warn('Focus AI popup already initialized');
} else {
	window.__focusAI_popup_initialized = true;

	// ============================
	// 🧠 Focus AI Popup Main Script
	// ============================
	document.addEventListener("DOMContentLoaded", () => {
	  console.log("Focus AI popup loaded successfully.");
	  bindUI();
	  loadReminders();
	  renderPlaylist();
	  loadSettings();
	});

	// ============================
	// ⏰ Reminder System
	// ============================
	const reminderList = document.getElementById("reminderList");
	const reminderInput = document.getElementById("reminderInput");
	const reminderTime = document.getElementById("reminderTime");
	const addReminderBtn = document.getElementById("addReminderBtn");

	// Load reminders from storage
	function loadReminders() {
	  chrome.storage.local.get(["reminders"], (data) => {
	    const reminders = data.reminders || [];
	    renderReminders(reminders);
	    // schedule existing reminders for the current popup session (best-effort)
	    reminders.forEach(r => {
	      try { scheduleReminder(r); } catch(e) { /* ignore */ }
	    });
	  });
	}

	// Save a new reminder
	if (addReminderBtn) {
	  addReminderBtn.addEventListener("click", () => {
	    const text = (reminderInput && reminderInput.value || "").trim();
	    const time = reminderTime && reminderTime.value;

	    if (!text || !time) {
	      alert("Please enter reminder text and time!");
	      return;
	    }

	    const reminder = { text, time, id: Date.now() };
	    chrome.storage.local.get(["reminders"], (data) => {
	      const reminders = data.reminders || [];
	      reminders.push(reminder);
	      chrome.storage.local.set({ reminders }, () => {
	        renderReminders(reminders);
	        scheduleReminder(reminder);
	        if (reminderInput) reminderInput.value = "";
	        if (reminderTime) reminderTime.value = "";
	      });
	    });
	  });
	}

	// Render reminder list
	function renderReminders(reminders) {
	  if (!reminderList) return;
	  reminderList.innerHTML = "";

	  if (!reminders || reminders.length === 0) {
	    reminderList.innerHTML = `<p style="opacity:0.6">No reminders set.</p>`;
	    return;
	  }

	  reminders.forEach((r) => {
	    const el = document.createElement("div");
	    el.className = "reminder-item";
	    el.innerHTML = `
	      <div>
	        <strong>${escapeHtml(r.text)}</strong><br>
	        <small>${escapeHtml(r.time)}</small>
	      </div>
	      <button data-id="${r.id}" class="delete-reminder">🗑️</button>
	    `;
	    reminderList.appendChild(el);
	  });

	  // Delete reminder handler
	  document.querySelectorAll(".delete-reminder").forEach((btn) => {
	    btn.addEventListener("click", (e) => {
	      const id = parseInt(e.target.getAttribute("data-id"));
	      chrome.storage.local.get(["reminders"], (data) => {
	        const reminders = (data.reminders || []).filter((r) => r.id !== id);
	        chrome.storage.local.set({ reminders }, () => renderReminders(reminders));
	      });
	    });
	  });
	}

	// Schedule reminder notification
	function scheduleReminder(reminder) {
	  if (!reminder || !reminder.time) {
	    console.error('Invalid reminder:', reminder);
	    return;
	  }

	  const now = new Date();
	  const reminderTime = new Date(reminder.time);

	  if (isNaN(reminderTime.getTime())) {
	    console.error('Invalid reminder time:', reminder.time);
	    return;
	  }

	  const delay = reminderTime.getTime() - now.getTime();
	  if (delay <= 0) return;

	  setTimeout(() => {
	    chrome.notifications.create({
	      type: "basic",
	      iconUrl: "icons/icon128.png",
	      title: "⏰ Focus AI Reminder",
	      message: reminder.text,
	      priority: 2,
	      requireInteraction: true
	    }, (notificationId) => {
	      if (chrome.runtime.lastError) {
	        console.error('Notification error:', chrome.runtime.lastError);
	      }
	    });

	    // Remove completed reminder
	    chrome.storage.local.get(["reminders"], (data) => {
	      try {
	        const reminders = (data.reminders || []).filter((r) => r.id !== reminder.id);
	        chrome.storage.local.set({ reminders }, () => {
	          if (chrome.runtime.lastError) {
	            console.error('Storage error:', chrome.runtime.lastError);
	          } else {
	            renderReminders(reminders);
	          }
	        });
	      } catch (e) {
	        console.error('Error removing reminder:', e);
	      }
	    });
	  }, delay);
	}

	// Small helper to avoid HTML injection
	function escapeHtml(text) {
	  return (text + "").replace(/[&<>"']/g, function (m) {
	    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
	  });
	}

	// ============================
	// Helper: wire UI elements and event handlers
	function bindUI() {
	  // toggles and controls
	  const blockToggle = document.getElementById("blockToggle");
	  const addButton = document.getElementById("addButton");
	  const newSite = document.getElementById("newSite");
	  const reminderToggle = document.getElementById("reminderToggle");
	  const reminderInterval = document.getElementById("reminderInterval");
	  const testReminderBtn = document.getElementById("testReminder");
	  const prevBtn = document.getElementById("prevTrack");
	  const playBtn = document.getElementById("playPause");
	  const nextBtn = document.getElementById("nextTrack");
	  const volSlider = document.getElementById("volume");
	  const fileInput = document.getElementById("musicFileInput");
	  const tabs = document.querySelectorAll(".tab");

	  // tab switching
	  tabs.forEach(t => t.addEventListener("click", () => {
	    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
	    document.querySelectorAll(".tab-content").forEach(x => x.classList.remove("active"));
	    t.classList.add("active");
	    const id = t.getAttribute("data-tab");
	    const el = document.getElementById(id);
	    if (el) el.classList.add("active");
	  }));

	  // blocked sites management
	  if (addButton && newSite) {
	    addButton.addEventListener("click", () => {
	      const site = (newSite.value || "").trim();
	      if (!site) return;
	      chrome.storage.sync.get(["blockedSites"], (data) => {
	        const list = Array.isArray(data.blockedSites) ? data.blockedSites : [];
	        if (!list.includes(site)) {
	          list.push(site);
	          chrome.storage.sync.set({ blockedSites: list }, () => {
	            renderBlockedSites(list);
	            newSite.value = "";
	          });
	        }
	      });
	    });
	  }

	  // blocking toggle
	  if (blockToggle) {
	    blockToggle.addEventListener("change", () => {
	      const val = blockToggle.checked;
	      chrome.runtime.sendMessage({ action: "toggleBlocking", enabled: val }, () => {});
	    });
	  }

	  // reminder toggle and interval
	  if (reminderToggle) {
	    reminderToggle.addEventListener("change", () => {
	      const enabled = reminderToggle.checked;
	      chrome.runtime.sendMessage({ action: "toggleReminders", enabled }, () => {});
	    });
	  }
	  if (reminderInterval) {
	    reminderInterval.addEventListener("change", () => {
	      const val = parseInt(reminderInterval.value, 10) || 30;
	      chrome.storage.sync.set({ reminderInterval: val }, () => {
	        // notify background to re-setup alarms
	        chrome.runtime.sendMessage({ action: "updateReminderInterval" }, () => {});
	      });
	    });
	  }
	  if (testReminderBtn) {
	    testReminderBtn.addEventListener("click", () => {
	      chrome.runtime.sendMessage({ action: "testReminder" }, () => {});
	    });
	  }

	  // music controls
	  if (playBtn) playBtn.addEventListener("click", togglePlay);
	  if (prevBtn) prevBtn.addEventListener("click", () => {
	    if (currentTrack > 0) playTrack(currentTrack - 1);
	  });
	  if (nextBtn) nextBtn.addEventListener("click", () => {
	    if (currentTrack < playlist.length - 1) playTrack(currentTrack + 1);
	  });

	  // volume slider (0-100 -> audio.volume 0-1)
	  if (volSlider && audioPlayer) {
	    volSlider.addEventListener("input", () => {
	      const v = Number(volSlider.value) / 100;
	      audioPlayer.volume = v;
	      chrome.storage.local.set({ playerVolume: v }, () => {});
	    });
	    // sync initial UI from storage when loaded (if audioPlayer exists this is handled in loadSettings)
	  }

	  // file upload -> add to playlist as object URLs
	  if (fileInput) {
	    fileInput.addEventListener("change", (e) => {
	      const files = Array.from(e.target.files || []);
	      files.forEach(f => {
	        const url = URL.createObjectURL(f);
	        playlist.push({
	          title: f.name,
	          artist: "Local file",
	          src: url,
	          _local: true
	        });
	      });
	      renderPlaylist();
	    });
	  }

	  // click handlers for playlist items delegated in renderPlaylist()
	}

	// Load settings (blocked sites, toggles, volume)
	function loadSettings() {
	  // load blocked sites and blocking state
	  chrome.storage.sync.get(['blockedSites', 'isBlocking'], (data) => {
	    const list = Array.isArray(data.blockedSites) ? data.blockedSites : [];
	    renderBlockedSites(list);
	    const blockToggle = document.getElementById("blockToggle");
	    if (blockToggle) blockToggle.checked = !!data.isBlocking;
	  });

	  // load reminders toggle & interval
	  chrome.storage.sync.get(['aiRemindersEnabled', 'reminderInterval'], (data) => {
	    const rt = document.getElementById("reminderToggle");
	    if (rt) rt.checked = (data.aiRemindersEnabled !== false);
	    const ri = document.getElementById("reminderInterval");
	    if (ri && data.reminderInterval) ri.value = String(data.reminderInterval);
	  });

	  // load saved volume into UI
	  chrome.storage.local.get(['playerVolume'], (data) => {
	    const volSlider = document.getElementById("volume");
	    if (audioPlayer) {
	      const v = (data.playerVolume !== undefined) ? Number(data.playerVolume) : 0.7;
	      audioPlayer.volume = v;
	      if (volSlider) volSlider.value = String(Math.round(v * 100));
	    }
	  });

	  // load today's stats from background
	  refreshStats();
	}

	// Render blocked sites list
	function renderBlockedSites(list) {
	  const blockedList = document.getElementById("blockedList");
	  if (!blockedList) return;
	  blockedList.innerHTML = "";
	  if (!list || list.length === 0) {
	    blockedList.innerHTML = `<div class="empty-state">No blocked sites</div>`;
	    return;
	  }
	  list.forEach(site => {
	    const el = document.createElement("div");
	    el.className = "blocked-tag";
	    el.innerHTML = `${escapeHtml(site)} <button data-site="${escapeHtml(site)}" style="margin-left:8px;background:transparent;border:none;color:white;cursor:pointer;">✖</button>`;
	    blockedList.appendChild(el);
	    const btn = el.querySelector("button");
	    btn.addEventListener("click", () => {
	      chrome.storage.sync.get(['blockedSites'], (data) => {
	        const arr = Array.isArray(data.blockedSites) ? data.blockedSites : [];
	        const newArr = arr.filter(s => s !== site);
	        chrome.storage.sync.set({ blockedSites: newArr }, () => renderBlockedSites(newArr));
	      });
	    });
	  });
	}

	// Refresh stats (requests tracking data from background)
	function refreshStats() {
	  chrome.runtime.sendMessage({ action: 'getTrackingData' }, (resp) => {
	    const statsEl = document.getElementById("statsContent");
	    if (!statsEl) return;
	    const today = new Date().toDateString();
	    const data = resp && resp.data ? resp.data : {};
	    const todayData = data[today] || {};
	    const entries = Object.entries(todayData).sort((a,b) => (b[1].visits||0) - (a[1].visits||0));
	    if (entries.length === 0) {
	      statsEl.innerHTML = `<div class="empty-state">No activity tracked yet</div>`;
	      return;
	    }
	    statsEl.innerHTML = "";
	    entries.slice(0, 10).forEach(([domain, info]) => {
	      const el = document.createElement("div");
	      el.className = "site-item";
	      el.innerHTML = `<div class="site-name">${escapeHtml(domain)}</div><div class="site-visits">${info.visits || 0} visits</div>`;
	      statsEl.appendChild(el);
	    });
	  });
	}

	// ============================
	// 🎧 Integrated Music Player
	// ============================

	// Primary element lookups. Support multiple possible IDs used in HTML.
	const audioPlayer = document.getElementById("audioPlayer");
	const playlistContainer = document.getElementById("playlistMini");
	const playPauseBtn = document.getElementById("playPauseBtn") || document.getElementById("playPause");
	const trackCountEl = document.getElementById("trackCount");
	const statusMessage = document.getElementById("statusMessage") || document.getElementById("musicStatus");

	// --- Default online playlist (free, CORS-safe) ---
	const playlist = [
	  {
	    title: "☕ Coffee Shop",
	    artist: "Lofi Beats",
	    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Jazz_Sampler/Kevin_MacLeod_-_Local_Forecast_Slower.mp3"
	  },
	  {
	    title: "🎷 Jazz Lofi",
	    artist: "Relax Vibes",
	    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Calming/Kevin_MacLeod_-_Porch_Swing_Days_-_slower.mp3"
	  },
	  {
	    title: "🎵 Lofi Chill",
	    artist: "Study Flow",
	    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Jazz_Sampler/Kevin_MacLeod_-_Backed_Vibes_Clean.mp3"
	  },
	  {
	    title: "🌧 Rain Lofi",
	    artist: "Ambient Relax",
	    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Calming/Kevin_MacLeod_-_At_Rest.mp3"
	  }
	];

	let currentTrack = -1;
	let isPlaying = false;

	// --- Render Playlist ---
	function renderPlaylist() {
	  if (!playlistContainer) return;
	  playlistContainer.innerHTML = "";

	  if (!playlist || playlist.length === 0) {
	    playlistContainer.innerHTML = `<div class="empty-state">No tracks</div>`;
	    return;
	  }

	  playlist.forEach((track, index) => {
	    const el = document.createElement("div");
	    el.className = "track-item" + (index === currentTrack ? " active" : "");
	    el.innerHTML = `
	      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;cursor:pointer;">
	        <div style="display:flex;gap:8px;align-items:center;">
	          <span class="track-icon">🎵</span>
	          <div class="track-name">${escapeHtml(track.title)}</div>
	        </div>
	        <div style="opacity:0.7;font-size:12px;">${escapeHtml(track.artist)}</div>
	      </div>
	    `;
	    el.addEventListener("click", () => playTrack(index));
	    playlistContainer.appendChild(el);
	  });

	  if (trackCountEl) trackCountEl.textContent = String(playlist.length);
	  if (statusMessage && !isPlaying) statusMessage.textContent = "🎶 Choose a song to play below.";
	}

	// --- Play selected track ---
	// function playTrack(index) {
	//   if (index < 0 || index >= playlist.length) return;
	//   currentTrack = index;
	//   const track = playlist[index];

	//   if (!audioPlayer) {
	//     console.error('Audio player not found');
	//     if (statusMessage) statusMessage.textContent = "⚠️ Audio player not available";
	//     return;
	//   }

	//   if (statusMessage) statusMessage.textContent = `⌛ Loading: ${track.title}`;
	//   audioPlayer.src = track.src;

	//   const promise = audioPlayer.play();
	//   if (promise && typeof promise.then === "function") {
	//     promise.then(() => {
	//       isPlaying = true;
	//       updatePlayButton();
	//       if (statusMessage) statusMessage.textContent = `▶️ Now playing: ${track.title}`;
	//       highlightTrack(index);
	//       updateNowPlaying(track);
	//     }).catch((err) => {
	//       console.error("Playback failed:", err);
	//       // Friendly handling for browser autoplay/permission blocks
	//       if (err && (err.name === 'NotAllowedError' || err.name === 'DOMException' || (err.message && /play/i.test(err.message)))) {
	//         if (statusMessage) statusMessage.textContent = "🔒 Playback blocked by browser. Click the play button to allow audio.";
	//       } else if (statusMessage) {
	//         statusMessage.textContent = `⚠️ Playback failed`;
	//       }
	//       isPlaying = false;
	//       updatePlayButton();
	//     });
	//   } else {
	//     // older browsers may not return a promise
	//     isPlaying = true;
	//     updatePlayButton();
	//     highlightTrack(index);
	//     updateNowPlaying(track);
	//   }
	// }

	// Play selected track: call load() before play() to improve reliability
	function playTrack(index) {
	  if (index < 0 || index >= playlist.length) return;
	  currentTrack = index;
	  const track = playlist[index];

	  if (!audioPlayer) {
	    console.error('Audio player not found');
	    if (statusMessage) statusMessage.textContent = "⚠️ Audio player not available";
	    return;
	  }

	  if (statusMessage) statusMessage.textContent = `⌛ Loading: ${track.title}`;
	  audioPlayer.src = track.src;
	  try {
	    // ensure source is loaded
	    audioPlayer.load();
	  } catch (e) {
	    // ignore load() errors
	  }
	  const promise = audioPlayer.play();
	  if (promise && typeof promise.then === "function") {
	    promise.then(() => {
	      isPlaying = true;
	      updatePlayButton();
	      if (statusMessage) statusMessage.textContent = `▶️ Now playing: ${track.title}`;
	      highlightTrack(index);
	      updateNowPlaying(track);
	    }).catch((err) => {
	      console.error("Playback failed:", err);
	      if (err && (err.name === 'NotAllowedError' || err.name === 'DOMException' || (err.message && /play/i.test(err.message)))) {
	        if (statusMessage) statusMessage.textContent = "🔒 Playback blocked by browser. Click the play button to allow audio.";
	      } else if (statusMessage) {
	        statusMessage.textContent = `⚠️ Playback failed`;
	      }
	      isPlaying = false;
	      updatePlayButton();
	    });
	  } else {
	    isPlaying = true;
	    updatePlayButton();
	    highlightTrack(index);
	    updateNowPlaying(track);
	  }
	}

	function updateNowPlaying(track) {
	  const currentTrackName = document.getElementById("currentTrackName");
	  const albumIcon = document.getElementById("albumIcon");
	  if (currentTrackName) currentTrackName.textContent = track.title;
	  if (albumIcon) albumIcon.classList.toggle("playing", isPlaying);
	}

	// --- Toggle play/pause ---
	function togglePlay() {
	  if (!audioPlayer) {
	    if (playlist.length > 0) playTrack(0);
	    return;
	  }
	  if (isPlaying) {
	    audioPlayer.pause();
	    isPlaying = false;
	    if (statusMessage) statusMessage.textContent = "⏸ Paused";
	  } else {
	    if (currentTrack === -1) {
	      playTrack(0);
	    } else {
	      const promise = audioPlayer.play();
	      if (promise && typeof promise.then === "function") {
	        promise.then(() => {
	          isPlaying = true;
	          if (statusMessage) statusMessage.textContent = `▶️ Resumed: ${playlist[currentTrack].title}`;
	        }).catch(err => {
	          console.error("Resume failed:", err);
	          if (err && (err.name === 'NotAllowedError' || err.name === 'DOMException' || (err.message && /play/i.test(err.message)))) {
	            if (statusMessage) statusMessage.textContent = "🔒 Playback blocked by browser. Tap/click the play button again to allow audio.";
	          } else if (statusMessage) {
	            statusMessage.textContent = "⚠️ Could not resume playback.";
	          }
	        });
	      } else {
	        isPlaying = true;
	      }
	    }
	  }
	  updatePlayButton();
	}

	// --- Update play/pause button ---
	function updatePlayButton() {
	  if (playPauseBtn) playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶️ Play";
	}

	// --- Highlight current track ---
	function highlightTrack(index) {
	  if (!playlistContainer) return;
	  const allTracks = playlistContainer.querySelectorAll(".track-item");
	  allTracks.forEach((item, i) => {
	    item.classList.toggle("active", i === index);
	    item.style.background = i === index ? "rgba(0,0,0,0.05)" : "transparent";
	  });
	}

	// --- Auto-play next track ---
	if (audioPlayer) {
	  audioPlayer.addEventListener("ended", () => {
	    if (currentTrack < playlist.length - 1) playTrack(currentTrack + 1);
	    else {
	      isPlaying = false;
	      updatePlayButton();
	      if (statusMessage) statusMessage.textContent = "🎵 Playlist finished.";
	    }
	  });

	  audioPlayer.addEventListener("volumechange", () => {
	    chrome.storage.local.set({ playerVolume: audioPlayer.volume }, () => {});
	  });

	  audioPlayer.addEventListener("error", (e) => {
	    console.error("Audio error:", e);
	    if (statusMessage) {
	      const msg = audioPlayer.error && audioPlayer.error.message ? audioPlayer.error.message : 'Audio playback error';
	      statusMessage.textContent = `⚠️ Audio error: ${msg}`;
	    }
	    isPlaying = false;
	    updatePlayButton();
	  });
	}

	// --- Spacebar shortcut ---
	document.addEventListener("keydown", (e) => {
	  if (e.code === "Space") {
	    // allow spacebar when not typing in inputs
	    const tag = document.activeElement && document.activeElement.tagName;
	    if (tag === "INPUT" || tag === "TEXTAREA") return;
	    e.preventDefault();
	    togglePlay();
	  }
	});

} // end init guard