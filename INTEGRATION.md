````markdown name=INTEGRATION.md
```html
<!-- Integration snippet: add near the end of <body> of your main page -->

<!-- Small enable-sound button for unlocking audio on mobile/desktop -->
<button id="enable-sound" style="position:fixed; right:1rem; bottom:1rem; z-index:10000;">
  Enable sound
</button>

<script type="module">
  import { AudioManager } from '/assets/js/audio-manager.js';
  import { ReminderManager } from '/assets/js/reminder-manager.js';

  (async function() {
    // Register service worker (HTTPS required)
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service worker registered');
      } catch (e) {
        console.warn('Service worker registration failed', e);
      }
    }

    // Create audio manager and register audio assets
    const audioMgr = new AudioManager({
      'background': '/assets/audio/background-music.mp3',
      'ding': '/assets/audio/ding.mp3'
    });

    // Wire a user gesture to enable audio (required by autoplay policies)
    audioMgr.enableOnUserGesture('#enable-sound').catch(console.warn);

    // Reminder manager: request permission when appropriate
    const remMgr = new ReminderManager();
    document.querySelector('#enable-sound').addEventListener('click', async () => {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await remMgr.requestPermission();
      }
      // Example play after enabling
      audioMgr.play('background').catch(err => console.warn('Play failed:', err));
    });

    // Example: schedule a reminder 30 seconds after enabling
    document.querySelector('#enable-sound').addEventListener('click', () => {
      const ts = Date.now() + 30_000;
      remMgr.scheduleReminder({ id: 'welcome-test', title: 'Welcome', body: 'This is a test reminder', timestamp: ts });
      // show immediate auditory cue
      audioMgr.play('ding').catch(()=>{});
    });
  })();
</script>
````