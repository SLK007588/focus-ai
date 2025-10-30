// Prevent double-init
if (window.__focusAI_popup_initialized) {
        // already initialized; stop further execution
        console.warn('Focus AI popup already initialized');
} else {
        window.__focusAI_popup_initialized = true;

        // ============================
        // 🧠 Chrome API Compatibility Wrapper
        // ============================
        // Provide mock Chrome APIs for demo/testing when not in extension context
        if (typeof chrome === 'undefined' || !chrome.storage) {
          window.chrome = {
            storage: {
              local: {
                get: (keys, callback) => callback && callback({}),
                set: (data, callback) => callback && callback()
              },
              sync: {
                get: (keys, callback) => callback && callback({}),
                set: (data, callback) => callback && callback()
              }
            },
            runtime: {
              sendMessage: (message, callback) => callback && callback({}),
              lastError: null
            },
            notifications: {
              create: (options, callback) => {
                console.log('Notification:', options);
                callback && callback('demo-notification-id');
              }
            }
          };
        }

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

        // Refactored Music Player & Reminders Logic Start
        // ========================= MUSIC TAB ==============================
        // Query DOM only after DOMContentLoaded
        let audioPlayer, playlistContainer, playPauseBtn, trackCountEl, statusMessage;
        let playlist = [
          {
            title: "☕ Coffee Shop",
            artist: "Lofi Beats",
            src: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"
          },
          {
            title: "🎷 Jazz Lofi",
            artist: "Relax Vibes",
            src: "https://cdn.pixabay.com/audio/2022/03/10/audio_4e3f58e779.mp3"
          },
          {
            title: "🎵 Lofi Chill",
            artist: "Study Flow",
            src: "https://cdn.pixabay.com/audio/2022/08/02/audio_588fa66097.mp3"
          },
          {
            title: "🌧 Rain Lofi",
            artist: "Ambient Relax",
            src: "https://cdn.pixabay.com/audio/2022/03/15/audio_c610232532.mp3"
          }
        ];
        let currentTrack = -1;
        let isPlaying = false;

        function getMusicElements() {
          audioPlayer = document.getElementById('audioPlayer');
          playlistContainer = document.getElementById('playlistMini');
          playPauseBtn = document.getElementById('playPause');
          trackCountEl = document.getElementById('trackCount');
          statusMessage = document.getElementById('musicStatus') || document.getElementById('statusMessage');
        }

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
        }

        function playTrack(index) {
          if (!audioPlayer || !playlist[index]) {
            if (statusMessage) statusMessage.textContent = '⚠️ Audio element or track missing.';
            return;
          }
          currentTrack = index;
          audioPlayer.src = playlist[index].src;
          audioPlayer.load();
          audioPlayer.play().then(() => {
            isPlaying = true;
            updateUI();
            if (statusMessage) statusMessage.textContent = `▶️ Now playing: ${playlist[index].title}`;
          }).catch(err => {
            isPlaying = false;
            updateUI();
            if (statusMessage) statusMessage.textContent = `⚠️ Playback failed: ${err.message}`;
          });
        }

        function togglePlay() {
          if (!audioPlayer) return;
          if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            if (statusMessage) statusMessage.textContent = '⏸ Paused';
          } else if (currentTrack === -1) {
            playTrack(0);
          } else {
            audioPlayer.play().then(() => {
              isPlaying = true;
              if (statusMessage) statusMessage.textContent = `▶️ Resumed: ${playlist[currentTrack].title}`;
            }).catch(err => {
              if (statusMessage) statusMessage.textContent = `⚠️ Resume failed: ${err.message}`;
            });
          }
          updateUI();
        }

        function playPrev() {
          if (currentTrack > 0) playTrack(currentTrack - 1);
        }
        function playNext() {
          if (currentTrack < playlist.length - 1) playTrack(currentTrack + 1);
        }
        function onVolumeChange(e) {
          if (audioPlayer) audioPlayer.volume = Number(e.target.value) / 100;
        }
        function audioEnded() {
          if (currentTrack < playlist.length - 1) playTrack(currentTrack + 1);
            else {
              isPlaying = false;
              updateUI();
              if (statusMessage) statusMessage.textContent = '🎵 Playlist finished.';
            }
        }
        function updateUI() {
          renderPlaylist();
          if (playPauseBtn) playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶️ Play";
          const nowPlaying = document.getElementById("currentTrackName");
          const albumIcon = document.getElementById("albumIcon");
          if (nowPlaying && currentTrack > -1) nowPlaying.textContent = playlist[currentTrack].title;
          if (albumIcon) albumIcon.classList.toggle("playing", isPlaying);
        }

        function bindMusicUI() {
          getMusicElements();
          renderPlaylist();

          if (playPauseBtn) playPauseBtn.onclick = togglePlay;
          const prevBtn = document.getElementById("prevTrack");
          if (prevBtn) prevBtn.onclick = playPrev;
          const nextBtn = document.getElementById("nextTrack");
          if (nextBtn) nextBtn.onclick = playNext;
          const volSlider = document.getElementById("volume");
          if (volSlider) volSlider.oninput = onVolumeChange;
          if (audioPlayer) {
            audioPlayer.onended = audioEnded;
            audioPlayer.onerror = e => { if (statusMessage) statusMessage.textContent = '⚠️ Audio playback failed.'; isPlaying = false; updateUI(); };
          }
          // If local music files are uploaded
          const fileInput = document.getElementById('musicFileInput');
          if (fileInput) fileInput.onchange = (e) => {
            const files = Array.from(e.target.files || []);
            files.forEach(f => {
              const url = URL.createObjectURL(f);
              playlist.push({ title: f.name, artist: "Local file", src: url, _local: true });
            });
            renderPlaylist();
          };
        }

        document.addEventListener('DOMContentLoaded', () => {
          bindMusicUI();
        });
        // ========================= REMINDERS (Fixes) ====================
        // Fix time format to always be valid, show clear errors, and auto-refresh reminders.
        function scheduleReminder(reminder) {
          if (!reminder || !reminder.time) return;
          const now = Date.now();
          const t = new Date(reminder.time).getTime();
          if (isNaN(t) || t <= now) return;
          const delay = t - now;
          setTimeout(() => {
            chrome.notifications.create({
              type: "basic",
              iconUrl: "icons/icon128.png",
              title: "⏰ Focus AI Reminder",
              message: reminder.text,
              requireInteraction: true
            });
            // Remove expired reminder
            chrome.storage.local.get(["reminders"], data => {
              const list = (data.reminders || []).filter(r => r.id !== reminder.id);
              chrome.storage.local.set({ reminders: list }, () => {
                renderReminders(list);
              });
            });
          }, delay);
        }

        // Override/add: after adding, always call loadReminders()
        if (addReminderBtn) {
          addReminderBtn.addEventListener("click", () => {
            const text = (reminderInput && reminderInput.value || "").trim();
            const time = reminderTime && reminderTime.value;
            if (!text || !time) {
              alert("Please enter reminder text and a future time!");
              return;
            }
            const t = new Date(time).getTime();
            if (isNaN(t) || t < Date.now()) {
              alert("Please pick a valid future date and time.");
              return;
            }
            const newReminder = { text, time, id: Date.now() };
            chrome.storage.local.get(["reminders"], (data) => {
              const reminders = (data.reminders || []).concat([newReminder]);
              chrome.storage.local.set({ reminders }, () => {
                if (reminderInput) reminderInput.value = "";
                if (reminderTime) reminderTime.value = "";
                loadReminders();
              });
            });
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