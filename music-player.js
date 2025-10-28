// --- Music Player Script ---

const audioPlayer = document.getElementById("audioPlayer");
const playPauseBtn = document.getElementById("playPauseBtn");
const playlistContainer = document.getElementById("playlistMini");
const statusMessage = document.getElementById("statusMessage");
const trackCountEl = document.getElementById("trackCount");

// ✅ Default playlist using royalty-free online MP3s
const defaultPlaylist = [
  {
    title: "Coffee Shop",
    artist: "Lofi Beats",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Jazz_Sampler/Kevin_MacLeod_-_Local_Forecast_Slower.mp3"
  },
  {
    title: "Jazz Lofi",
    artist: "Relax Vibes",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Calming/Kevin_MacLeod_-_Porch_Swing_Days_-_slower.mp3"
  },
  {
    title: "Lofi Chill",
    artist: "Study Flow",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Jazz_Sampler/Kevin_MacLeod_-_Backed_Vibes_Clean.mp3"
  },
  {
    title: "Rain Lofi",
    artist: "Ambient Relax",
    src: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/Calming/Kevin_MacLeod_-_At_Rest.mp3"
  }
];

let playlist = [];
let currentTrack = -1;
let isPlaying = false;

// --- Load playlist on popup open ---
document.addEventListener("DOMContentLoaded", () => {
  try {
    chrome.storage.local.get(["playlist"], (data) => {
      if (data.playlist && data.playlist.length > 0) {
        playlist = data.playlist;
      } else {
        playlist = defaultPlaylist;
      }
      renderPlaylist();
    });
  } catch (e) {
    console.warn("Chrome storage unavailable, using defaults:", e);
    playlist = defaultPlaylist;
    renderPlaylist();
  }

  audioPlayer.volume = 0.7;
});

// --- Render the playlist ---
function renderPlaylist() {
  if (!playlistContainer) return;
  playlistContainer.innerHTML = "";

  playlist.forEach((track, index) => {
    const trackEl = document.createElement("div");
    trackEl.className = "track-item";
    trackEl.style.cssText = `
      padding: 10px; 
      border-bottom: 1px solid rgba(255,255,255,0.1); 
      cursor: pointer;
    `;
    trackEl.textContent = `${track.title} — ${track.artist}`;
    trackEl.addEventListener("click", () => playTrack(index));
    playlistContainer.appendChild(trackEl);
  });

  if (trackCountEl) trackCountEl.textContent = playlist.length;
  if (statusMessage) statusMessage.textContent = "✅ Playlist loaded. Click a track to play.";
}

// --- Play selected track ---
function playTrack(index) {
  if (index < 0 || index >= playlist.length) return;

  const track = playlist[index];
  currentTrack = index;
  audioPlayer.src = track.src;
  audioPlayer.play()
    .then(() => {
      isPlaying = true;
      updatePlayButton();
      statusMessage.textContent = `🎵 Playing: ${track.title}`;
    })
    .catch(err => {
      console.error("Playback error:", err);
      statusMessage.textContent = "⚠️ Cannot play this track.";
    });
}

// --- Play/Pause toggle ---
function togglePlay() {
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
  } else {
    if (currentTrack === -1) {
      playTrack(0);
    } else {
      audioPlayer.play();
      isPlaying = true;
    }
  }
  updatePlayButton();
}

function updatePlayButton() {
  if (!playPauseBtn) return;
  playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶️ Play";
}

// --- Listen to play/pause button ---
if (playPauseBtn) {
  playPauseBtn.addEventListener("click", togglePlay);
}

// --- Handle when a song ends ---
audioPlayer.addEventListener("ended", () => {
  if (currentTrack < playlist.length - 1) {
    playTrack(currentTrack + 1);
  } else {
    isPlaying = false;
    updatePlayButton();
  }
});
