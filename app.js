// Day 1: Audio Tracks Data Schema
const AUDIO_TRACKS = [
    {
        id: "rain",
        name: "Gentle Rain",
        file: "assets/audio/rain.mp3",
        icon: "🌧️"
    },
    {
        id: "cafe",
        name: "Cafe Ambience",
        file: "assets/audio/cafe.mp3",
        icon: "☕"
    },
    {
        id: "white-noise",
        name: "White Noise",
        file: "assets/audio/soft white noise.mp3", // Ensure file name matches your folder!
        icon: "💨"
    },
    {
        id: "birds",
        name: "Forest Birds",
        file: "assets/audio/birds.mp3",
        icon: "🌲"
    }
];

// App State Management Object
const appState = {
    isPlaying: false,
    currentTimerMode: "focus",
    timeRemaining: 1500,
    audioInstances: {},
    allTracksPlaying: false
};

const TIMER_DURATIONS = {
    "focus": 1500,       // 25 min
    "short-break": 300,  // 5 min
    "long-break": 900    // 15 min
};

// Based on r=90 in your SVG (2 * PI * 90)
const RING_CIRCUMFERENCE = 565.48;

let timerInterval = null;

// ============================================
// Initialization
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    initializeAudioTracks();
    updateTimerDisplay();
    updateRingProgress();
    updateStatsDisplay();
    loadNotes();
    
    // NEW: Initialize snowfall on load
    createSnowfall();

    const notepad = document.getElementById("notepad");
    if (notepad) {
        notepad.addEventListener("input", handleNotesInput);
    }
});

function initializeAudioTracks() {
    const gridContainer = document.getElementById("audio-grid");
    if (!gridContainer) return;

    AUDIO_TRACKS.forEach(track => {
        const audio = new Audio(track.file);
        audio.loop = true;
        audio.volume = 0.5;
        appState.audioInstances[track.id] = audio;

        const card = document.createElement("div");
        card.className = "audio-card";
        card.innerHTML = `
            <div class="icon">${track.icon}</div>
            <h3>${track.name}</h3>
            <button id="btn-${track.id}" onclick="toggleTrack('${track.id}')">Play</button>
            <input
                type="range"
                min="0"
                max="100"
                value="50"
                class="volume-slider"
                id="slider-${track.id}"
                oninput="setVolume('${track.id}', this.value)"
            />
            <span id="volume-label-${track.id}" class="volume-label">50%</span>
        `;
        gridContainer.appendChild(card);
    });
}

// ============================================
// Audio Logic
// ============================================

function toggleTrack(trackId) {
    const audio = appState.audioInstances[trackId];
    const button = document.getElementById(`btn-${trackId}`);
    if (!audio) return;

    if (audio.paused) {
        audio.play().then(() => {
            button.textContent = "Pause";
            button.classList.add("playing");
        }).catch(() => showAutoplayBanner());
    } else {
        audio.pause();
        button.textContent = "Play";
        button.classList.remove("playing");
    }
}

function setVolume(trackId, sliderValue) {
    const audio = appState.audioInstances[trackId];
    if (!audio) return;
    audio.volume = sliderValue / 100;
    const label = document.getElementById(`volume-label-${trackId}`);
    if (label) label.textContent = `${sliderValue}%`;
}

function toggleAllTracks() {
    const masterBtn = document.getElementById("master-toggle-btn");
    const tracks = Object.keys(appState.audioInstances);

    if (!appState.allTracksPlaying) {
        tracks.forEach(id => {
            appState.audioInstances[id].play().catch(() => showAutoplayBanner());
            const btn = document.getElementById(`btn-${id}`);
            if (btn) { btn.textContent = "Pause"; btn.classList.add("playing"); }
        });
        appState.allTracksPlaying = true;
        masterBtn.textContent = "⏸ Pause All";
    } else {
        tracks.forEach(id => {
            appState.audioInstances[id].pause();
            const btn = document.getElementById(`btn-${id}`);
            if (btn) { btn.textContent = "Play"; btn.classList.remove("playing"); }
        });
        appState.allTracksPlaying = false;
        masterBtn.textContent = "▶ Play All";
    }
}

function showAutoplayBanner() {
    const banner = document.getElementById("autoplay-banner");
    if (!banner) return;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), 4000);
}

// ============================================
// Timer Logic
// ============================================

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

function updateTimerDisplay() {
    const display = document.getElementById("time-remaining");
    if (display) display.textContent = formatTime(appState.timeRemaining);
}

function startPauseTimer() {
    const btn = document.getElementById("start-pause-btn");
    if (appState.isPlaying) {
        clearInterval(timerInterval);
        appState.isPlaying = false;
        btn.textContent = "Start";
    } else {
        appState.isPlaying = true;
        btn.textContent = "Pause";
        timerInterval = setInterval(() => {
            if (appState.timeRemaining > 0) {
                appState.timeRemaining--;
                updateTimerDisplay();
                updateRingProgress();
            } else {
                clearInterval(timerInterval);
                appState.isPlaying = false;
                btn.textContent = "Start";
                if (appState.currentTimerMode === "focus") recordCompletedFocusSession();
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    appState.isPlaying = false;
    appState.timeRemaining = TIMER_DURATIONS[appState.currentTimerMode];
    const btn = document.getElementById("start-pause-btn");
    if (btn) btn.textContent = "Start";
    updateTimerDisplay();
    updateRingProgress();
}

function updateRingProgress() {
    const ringProgress = document.querySelector(".ring-progress");
    if (!ringProgress) return;
    const totalDuration = TIMER_DURATIONS[appState.currentTimerMode];
    const fraction = appState.timeRemaining / totalDuration;
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    ringProgress.style.strokeDashoffset = offset;
}

function switchMode(newMode) {
    appState.currentTimerMode = newMode;
    appState.timeRemaining = TIMER_DURATIONS[newMode];
    clearInterval(timerInterval);
    appState.isPlaying = false;

    const startBtn = document.getElementById("start-pause-btn");
    if (startBtn) startBtn.textContent = "Start";

    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === newMode);
    });

    const labels = { "focus": "Focus Time", "short-break": "Short Break", "long-break": "Long Break" };
    document.getElementById("timer-mode-label").textContent = labels[newMode];

    updateTimerDisplay();
    updateRingProgress();
}

// ============================================
// Storage & Notes
// ============================================

function recordCompletedFocusSession() {
    const key = `focusStats-${new Date().toISOString().split('T')[0]}`;
    let stats = JSON.parse(localStorage.getItem(key)) || { minutesFocused: 0, sessionsCompleted: 0 };
    stats.minutesFocused += TIMER_DURATIONS["focus"] / 60;
    stats.sessionsCompleted += 1;
    localStorage.setItem(key, JSON.stringify(stats));
    updateStatsDisplay();
}

function updateStatsDisplay() {
    const key = `focusStats-${new Date().toISOString().split('T')[0]}`;
    const stats = JSON.parse(localStorage.getItem(key)) || { minutesFocused: 0, sessionsCompleted: 0 };
    const el = document.getElementById("focus-stats");
    if (el) el.textContent = `Today: ${stats.minutesFocused} min focused · ${stats.sessionsCompleted} sessions`;
}

function loadNotes() {
    const notepad = document.getElementById("notepad");
    const saved = localStorage.getItem("digitalFocusRoom-notes");
    if (notepad && saved) notepad.value = saved;
}

function handleNotesInput(event) {
    localStorage.setItem("digitalFocusRoom-notes", event.target.value);
}

// ============================================
// Snowfall Effect
// ============================================

function createSnowfall() {
    const container = document.getElementById("snow-container");
    if (!container) return;

    const flakeCount = 40;
    for (let i = 0; i < flakeCount; i++) {
        const flake = document.createElement("span");
        flake.className = "snowflake";
        flake.textContent = "❄";

        const size = Math.random() * 14 + 8;
        const startLeft = Math.random() * 100;
        const duration = Math.random() * 8 + 8;
        const delay = Math.random() * 10;
        const drift = (Math.random() * 100 - 50) + "px";

        flake.style.left = `${startLeft}vw`;
        flake.style.fontSize = `${size}px`;
        flake.style.animationDuration = `${duration}s`;
        flake.style.animationDelay = `-${delay}s`;
        flake.style.setProperty("--drift", drift);

        container.appendChild(flake);
    }
}