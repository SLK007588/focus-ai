// ============================
// 🧠 Focus AI Popup Main Script
// ============================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Focus AI popup loaded successfully.");
  loadReminders();
  renderPlaylist();
  if (audioPlayer) audioPlayer.volume = 0.7;
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
  });
}

// Save a new reminder
if (addReminderBtn) {
  addReminderBtn.addEventListener("click", () => {
    const text = reminderInput.value.trim();
    const time = reminderTime.value;

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
        reminderInput.value = "";
        reminderTime.value = "";
      });
    });
  });
}

// Render reminder list
function renderReminders(reminders) {
  if (!reminderList) return;
  reminderList.innerHTML = "";

  if (reminders.length === 0) {
    reminderList.innerHTML = `<p style="opacity:0.6">No reminders set.</p>`;
    return;
  }

  reminders.forEach((r) => {
    const el = document.createElement("div");
    el.className = "reminder-item";
    el.innerHTML = `
      <div>
        <strong>${r.text}</strong><br>
        <small>${r.time}</small>
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
  const now = new Date();
  const reminderTime = new Date(reminder.time);

  const delay = reminderTime.getTime() - now.getTime();
  if (delay <= 0) return; // skip past reminders

  setTimeout(() => {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "⏰ Focus AI Reminder",
      message: reminder.text,
      priority: 2,
    });

    // auto-remove after firing
    chrome.storage.local.get(["reminders"], (data) => {
      const reminders = (data.reminders || []).filter((r) => r.id !== reminder.id);
      chrome.storage.local.set({ reminders }, () => renderReminders(reminders));
    });
  }, delay);
}

// ============================
// 🎧 Integrated Music Player
// ============================

const audioPlayer = document.getElementById("audioPlayer");
const playlistContainer = document.getElementById("playlistMini");
const playPauseBtn = document.getElementById("playPauseBtn");
const trackCountEl = document.getElementById("trackCount");
const statusMessage = document.getElementById("statusMessage");

// --- Default online playlist (free, CORS-safe) ---
const playlist = [
  {
    title: "☕ Coffee Shop",
    artist: "Lofi Beats",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Jazz_Sampler/Kevin_MacLeod_-_Local_Forecast_Slower.mp3",
  },
  {
    title: "🎷 Jazz Lofi",
    artist: "Relax Vibes",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Calming/Kevin_MacLeod_-_Porch_Swing_Days_-_slower.mp3",
  },
  {
    title: "🎵 Lofi Chill",
    artist: "Study Flow",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Jazz_Sampler/Kevin_MacLeod_-_Backed_Vibes_Clean.mp3",
  },
  {
    title: "🌧 Rain Lofi",
    artist: "Ambient Relax",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Calming/Kevin_MacLeod_-_At_Rest.mp3",
  },
];

let currentTrack = -1;
let isPlaying = false;

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

  if (trackCountEl) trackCountEl.textContent = playlist.length;
  if (statusMessage) statusMessage.textContent = "🎶 Choose a song to play below.";
}

// --- Play selected track ---
function playTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentTrack = index;
  const track = playlist[index];

  audioPlayer.src = track.src;
  audioPlayer.play()
    .then(() => {
      isPlaying = true;
      updatePlayButton();
      statusMessage.textContent = `▶️ Now playing: ${track.title}`;
      highlightTrack(index);
    })
    .catch((err) => {
      console.error("Playback failed:", err);
      statusMessage.textContent = "⚠️ Could not play track.";
    });
}

// --- Toggle play/pause ---
function togglePlay() {
  if (!audioPlayer) return;
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
    statusMessage.textContent = "⏸ Paused";
  } else {
    if (currentTrack === -1) {
      playTrack(0);
    } else {
      audioPlayer.play();
      isPlaying = true;
      statusMessage.textContent = `▶️ Resumed: ${playlist[currentTrack].title}`;
    }
  }
  updatePlayButton();
}

// --- Update play/pause button ---
function updatePlayButton() {
  if (playPauseBtn) {
    playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶️ Play";
  }
}

// --- Highlight current track ---
function highlightTrack(index) {
  const allTracks = playlistContainer.querySelectorAll(".track-item");
  allTracks.forEach((item, i) => {
    item.style.background = i === index ? "rgba(255,255,255,0.1)" : "transparent";
  });
}

// --- Auto-play next track ---
audioPlayer.addEventListener("ended", () => {
  if (currentTrack < playlist.length - 1) {
    playTrack(currentTrack + 1);
  } else {
    isPlaying = false;
    updatePlayButton();
    statusMessage.textContent = "🎵 Playlist finished.";
  }
});

// --- Bind play/pause button ---
if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);

// --- Spacebar shortcut ---
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }
});
