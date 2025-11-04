// =============================
// 🎧 Offscreen Audio Controller
// =============================

console.log("[Offscreen] Audio controller loaded");

let playlist = [];
let currentIndex = -1;
let audio;

function getAudio() {
  if (!audio) {
    audio = document.getElementById("bgAudio");
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "bgAudio";
      audio.volume = 0.7;
      audio.preload = "auto";
      document.body.appendChild(audio);
      console.log("[Offscreen] Audio element created");
    }
  }
  return audio;
}

async function playTrack(index) {
  const a = getAudio();
  if (!playlist.length) {
    console.warn("[Offscreen] Empty playlist!");
    return;
  }
  if (index < 0) index = playlist.length - 1;
  if (index >= playlist.length) index = 0;
  currentIndex = index;

  const track = playlist[currentIndex];
  a.src = track.src;
  try {
    await a.play();
    console.log("[Offscreen] ▶️ Playing:", track.title);
  } catch (e) {
    console.warn("[Offscreen] Play failed:", e);
  }
}

chrome.runtime.onMessage.addListener(async (msg) => {
  const a = getAudio();
  console.log("[Offscreen] Message received:", msg);

  try {
    switch (msg.action) {
      case "audio:init":
        playlist = msg.playlist || [];
        a.volume = msg.volume ?? 0.7;
        console.log("[Offscreen] Playlist loaded:", playlist.length);
        break;

      case "audio:playTrack":
      case "audio:playIndex":
        await playTrack(msg.index);
        break;

      case "audio:toggle":
        if (a.paused) {
          await a.play();
          console.log("[Offscreen] ▶️ Resumed playback");
        } else {
          a.pause();
          console.log("[Offscreen] ⏸ Paused playback");
        }
        break;

      case "audio:next":
        await playTrack(currentIndex + 1);
        break;

      case "audio:prev":
        await playTrack(currentIndex - 1);
        break;

      case "audio:setVolume":
        a.volume = msg.volume ?? 0.7;
        console.log("[Offscreen] 🔊 Volume set:", a.volume);
        break;

      default:
        console.warn("[Offscreen] Unknown action:", msg.action);
    }
  } catch (err) {
    console.warn("[Offscreen] Audio error:", err);
  }
});
