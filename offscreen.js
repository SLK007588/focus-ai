// Offscreen audio controller

const audio = document.getElementById('player');
try { audio.preload = 'auto'; } catch (_) {}
try { audio.crossOrigin = 'anonymous'; } catch (_) {}

let playlist = [
  { title: '☕ Coffee Shop', src: chrome.runtime.getURL('music/coffee-shop.mp3.mp3') },
  { title: '🎷 Jazz Lofi', src: chrome.runtime.getURL('music/jazz-lofi.mp3') },
  { title: '🎵 Lofi Chill', src: chrome.runtime.getURL('music/lofi-chill.mp3') },
  { title: '🌧 Rain Lofi', src: chrome.runtime.getURL('music/rain-lofi.mp3') },
];
let current = -1;
let isPlaying = false;
let volume = 0.7;
audio.volume = volume;
audio.addEventListener('error', (e) => {
  const code = (audio.error && audio.error.code) || 'unknown';
  console.warn('Offscreen audio error code:', code);
});

// signal readiness to background
try { chrome.runtime.sendMessage({ action: 'offscreen:ready' }); } catch (_) {}

function setIndex(i) {
  if (i < 0 || i >= playlist.length) return false;
  current = i;
  audio.src = playlist[i].src;
  try { audio.load(); } catch (_) {}
  return true;
}

function playWithFallback() {
  return new Promise((resolve, reject) => {
    audio.play().then(resolve).catch((err) => {
      const name = (err && err.name) || '';
      if (name === 'NotAllowedError' || name === 'DOMException') {
        try {
          audio.muted = true;
          audio.play().then(() => {
            setTimeout(() => { audio.muted = false; resolve(); }, 200);
          }).catch(reject);
        } catch (e) { reject(err || e); }
      } else { reject(err); }
    });
  });
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (!req || typeof req.action !== 'string') return;
  if (!req.action.startsWith('audio:')) return;

  const done = (payload) => sendResponse({ ok: true, ...payload });
  const fail = (e) => sendResponse({ ok: false, error: String(e && e.message || e) });

  if (req.action === 'audio:init') {
    if (Array.isArray(req.playlist) && req.playlist.length) {
      playlist = req.playlist.map(x => ({ title: x.title, src: x.src }));
    }
    if (typeof req.volume === 'number') {
      volume = Math.max(0, Math.min(1, req.volume));
      audio.volume = volume;
    }
    done({});
    return true;
  }

  if (req.action === 'audio:playIndex') {
    if (!setIndex(req.index)) { fail('bad index'); return true; }
    playWithFallback().then(() => {
      isPlaying = true;
      done({ current, isPlaying });
    }).catch(fail);
    return true;
  }

  if (req.action === 'audio:toggle') {
    if (audio.paused) {
      playWithFallback().then(() => { isPlaying = true; done({ current, isPlaying }); }).catch(fail);
    } else {
      audio.pause(); isPlaying = false; done({ current, isPlaying });
    }
    return true;
  }

  if (req.action === 'audio:next') {
    const next = current < playlist.length - 1 ? current + 1 : 0;
    if (!setIndex(next)) { fail('bad index'); return true; }
    playWithFallback().then(() => { isPlaying = true; done({ current, isPlaying }); }).catch(fail);
    return true;
  }

  if (req.action === 'audio:prev') {
    const prev = current > 0 ? current - 1 : playlist.length - 1;
    if (!setIndex(prev)) { fail('bad index'); return true; }
    playWithFallback().then(() => { isPlaying = true; done({ current, isPlaying }); }).catch(fail);
    return true;
  }

  if (req.action === 'audio:setVolume') {
    volume = Math.max(0, Math.min(1, req.volume ?? volume));
    audio.volume = volume;
    done({ volume });
    return true;
  }

  if (req.action === 'audio:getState') {
    done({ current, isPlaying, volume });
    return true;
  }
});

// respond to ping
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req && req.action === 'offscreen:ping') {
    sendResponse({ ok: true });
    return true;
  }
});

audio.addEventListener('ended', () => {
  const next = current < playlist.length - 1 ? current + 1 : 0;
  if (setIndex(next)) {
    playWithFallback().then(() => { isPlaying = true; }).catch(() => { isPlaying = false; });
  }
});


