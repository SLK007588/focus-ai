# Focus AI - Chrome Extension Installation Guide

## 📦 Installation Steps

1. **Extract the ZIP file**
   - Unzip `focus-ai-extension.zip` to a folder on your computer

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More tools → Extensions

3. **Enable Developer Mode**
   - Toggle "Developer mode" ON in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the extracted folder containing the extension files
   - The Focus AI extension should now appear in your extensions list

5. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Focus AI" and click the pin icon
   - The extension icon will appear in your toolbar

## 🎯 How to Use

### Focus Mode
- Click the extension icon to open the popup
- Go to the "🚫 Focus" tab
- Toggle "Block Distractions" ON to activate blocking
- Default blocked sites: YouTube, Facebook, Instagram, Twitter, Reddit, TikTok
- Add custom sites by typing the domain and clicking "Add"

### Music Player
- Go to the "🎵 Music" tab
- Click any track from the playlist to play
- Use the music controls: Previous, Play/Pause, Next
- Adjust volume with the slider
- Press spacebar for quick play/pause

### AI Care Reminders
- Go to the "🤖 AI Care" tab
- Toggle "AI Reminders" ON
- Select your preferred reminder interval (15, 30, 45, 60, or 90 minutes)
- Click "Test Reminder Now" to see how reminders work
- Grant notification permissions when prompted

## 🎵 Music Files

The extension includes 4 lo-fi tracks in the `music/` folder:
- ☕ Coffee Shop Vibes
- 🎷 Jazz Lofi
- 🎵 Lofi Chill
- 🌧 Rainy Day Lofi

You can add your own music files:
1. Place MP3 files in the `music/` folder
2. Edit `popup.js` to add them to the playlist array
3. Reload the extension in Chrome

## 🔧 Troubleshooting

**Extension not loading?**
- Make sure you selected the correct folder (contains manifest.json)
- Check that Developer mode is enabled

**Music not playing?**
- Make sure the music files are in the `music/` folder
- Check browser console for errors

**Reminders not working?**
- Grant notification permissions when prompted
- Check Chrome notification settings

**Sites not blocking?**
- Make sure "Block Distractions" is toggled ON
- Close and reopen tabs after enabling blocking

## 📝 Notes

- This extension stores data locally using Chrome's storage API
- Blocking only works on new tabs or refreshed pages
- Reminders use Chrome's alarm API for precise timing
- All features work offline except for streaming online music

## 🆘 Support

For issues or questions, please check:
- Chrome extension documentation
- Browser console for error messages
- Ensure you're using a recent version of Chrome

Enjoy your focused productivity! 🎯
