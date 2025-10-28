// Blocked page JavaScript

// Get blocked URL
const urlParams = new URLSearchParams(window.location.search);
const blockedSite = urlParams.get('site');
const blockedUrlEl = document.getElementById('blockedUrl');

if (blockedSite) {
  try {
    const url = new URL(blockedSite);
    blockedUrlEl.textContent = url.hostname;
  } catch (e) {
    blockedUrlEl.textContent = 'Distraction blocked';
  }
} else {
  blockedUrlEl.textContent = 'Distraction blocked';
}

// Timer - starts immediately
let seconds = 0;
const timerEl = document.getElementById('timer');

function updateTimer() {
  seconds++;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  timerEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

// Start timer immediately and update every second
updateTimer();
setInterval(updateTimer, 1000);

// Quotes
const quotes = [
  "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
  "Focus is a matter of deciding what things you're not going to do.",
  "Concentration is the secret of strength.",
  "Where focus goes, energy flows.",
  "The successful warrior is the average man, with laser-like focus.",
  "It's not always that we need to do more but rather that we need to focus on less.",
  "Lack of direction, not lack of time, is the problem.",
  "The shorter way to do many things is to only do one thing at a time.",
  "Starve your distractions, feed your focus.",
  "One reason so few of us achieve what we truly want is that we never direct our focus.",
  "Success is the product of daily habits, not once-in-a-lifetime transformations.",
  "You don't have to be great to start, but you have to start to be great.",
  "The difference between ordinary and extraordinary is that little extra.",
  "Your focus determines your reality.",
  "What you focus on grows, what you think about expands."
];

const quoteEl = document.getElementById('quoteText');
let currentQuoteIndex = 0;

function changeQuote() {
  quoteEl.style.opacity = '0';
  
  setTimeout(() => {
    currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
    quoteEl.textContent = quotes[currentQuoteIndex];
    quoteEl.style.opacity = '0.8';
  }, 500);
}

// Change quote every 10 seconds
setInterval(changeQuote, 10000);