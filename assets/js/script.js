
// ADVANCED QUANTUM CORE SIMON GAME LOGIC
// Written in pure Vanilla JS ES6+

// Game parameters
const buttonColours = ["green", "red", "yellow", "blue"];
let gamePattern = [];
let userClickedPattern = [];
let started = false;
let level = 0;
let userTurn = false;
let activeMode = "classic"; // classic, speedrun, strict, reverse
let synthType = "sine"; // sine, triangle, sawtooth, classic
let playbackTimeoutId = null;

// Sound Synthesizer frequency mapping (Pleasant pentatonic scale chord)
const FREQUENCIES = {
  green: 329.63,  // E4
  red: 392.00,    // G4
  yellow: 261.63, // C4
  blue: 220.00    // A3
};

// Web Audio API context
let audioCtx = null;
let analyser = null;
let dataArray = null;
let bufferLength = 0;
let simulatedSignal = 0; // Fallback signal for visualizer animations

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  loadSavedData();
  setupUIEventListeners();
  initParticleCanvas();
  initVisualizerCanvas();
  
  // Update UI indicators
  document.getElementById("level-title").textContent = "00";
});

// --- AUDIO CONFIGURATION ---
function playTone(color) {
  // Trigger energy for visualizer fallback
  simulatedSignal = 1.0;

  if (synthType === "classic") {
    playClassicSound(color);
    return;
  }

  // Set up Web Audio context if not already done
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setupAnalyser();
  }
  
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const volumeVal = parseFloat(document.getElementById("volume-slider").value) / 100;
  if (volumeVal === 0) return;

  const frequency = FREQUENCIES[color];
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const filterNode = audioCtx.createBiquadFilter();

  osc.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  if (analyser) {
    gainNode.connect(analyser);
  }

  osc.type = synthType;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  // Lowpass sweep envelope (Futuristic chirp shape)
  filterNode.type = "lowpass";
  filterNode.frequency.setValueAtTime(frequency * 3, audioCtx.currentTime);
  filterNode.frequency.exponentialRampToValueAtTime(frequency * 1.1, audioCtx.currentTime + 0.45);
  filterNode.Q.setValueAtTime(1.5, audioCtx.currentTime);

  // Volume decay envelope
  gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volumeVal * 0.35, audioCtx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.45);
}

function playClassicSound(color) {
  const volumeVal = parseFloat(document.getElementById("volume-slider").value) / 100;
  if (volumeVal === 0) return;
  
  const audio = new Audio("./assets/sounds/" + color + ".mp3");
  audio.volume = volumeVal;
  audio.play().catch(e => console.log("Audio playback blocked:", e));
}

function playWrongSound() {
  simulatedSignal = 1.5;

  if (synthType === "classic") {
    playClassicSound("wrong");
    return;
  }

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setupAnalyser();
  }
  
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const volumeVal = parseFloat(document.getElementById("volume-slider").value) / 100;
  if (volumeVal === 0) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  if (analyser) {
    gainNode.connect(analyser);
  }

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.45);

  gainNode.gain.setValueAtTime(volumeVal * 0.45, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.45);
}

function setupAnalyser() {
  if (!audioCtx) return;
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
}

// --- GAME CORE LOGIC ---
function startSystem() {
  if (started) {
    abortGame();
    return;
  }
  
  started = true;
  level = 0;
  gamePattern = [];
  
  document.getElementById("start-btn").textContent = "ABORT";
  document.getElementById("start-btn").classList.add("abort-btn");
  
  // Set UI focus to active game state
  updateCoreStatus("ACTIVE", "green");
  
  nextSequence();
}

function abortGame() {
  clearTimeout(playbackTimeoutId);
  started = false;
  userTurn = false;
  level = 0;
  gamePattern = [];
  userClickedPattern = [];
  
  // Reset buttons
  document.getElementById("start-btn").textContent = "ENGAGE";
  document.getElementById("start-btn").classList.remove("abort-btn");
  document.getElementById("level-title").textContent = "00";
  
  updateCoreStatus("STANDBY", "");
}

function nextSequence() {
  userClickedPattern = [];
  level++;
  
  // Format levels to double digits
  document.getElementById("level-title").textContent = String(level).padStart(2, '0');
  
  const randomNumber = Math.floor(Math.random() * 4);
  const randomChosenColour = buttonColours[randomNumber];
  gamePattern.push(randomChosenColour);
  
  playPatternSequence();
}

function playPatternSequence() {
  userTurn = false;
  updateCoreStatus("SCANNING", "blue");
  
  // Sequence pace varies by level in Speedrun mode
  let baseSpeed = 900;
  if (activeMode === "speedrun") {
    baseSpeed = Math.max(250, 950 - level * 70);
  }
  
  let i = 0;
  
  function triggerNext() {
    if (i < gamePattern.length) {
      const color = gamePattern[i];
      
      setTimeout(() => {
        if (!started) return; // Guard against aborting during play
        
        flashPad(color);
        i++;
        triggerNext();
      }, i === 0 ? 300 : baseSpeed);
    } else {
      setTimeout(() => {
        if (!started) return;
        userTurn = true;
        
        if (activeMode === "reverse") {
          updateCoreStatus("REVERSE", "magenta");
        } else {
          updateCoreStatus("REPLICATE", "cyan");
        }
      }, baseSpeed * 0.6);
    }
  }
  
  triggerNext();
}

function flashPad(color) {
  const padElement = document.getElementById(color);
  if (!padElement) return;
  
  // Activate CSS flash transition
  padElement.classList.add("active");
  playTone(color);
  spawnParticles(color);
  
  // Dynamic duration for flash length in speedrun mode
  let flashDuration = 450;
  if (activeMode === "speedrun") {
    flashDuration = Math.max(160, (950 - level * 70) * 0.65);
  }
  
  setTimeout(() => {
    padElement.classList.remove("active");
  }, flashDuration);
}

function handlePadPress(color) {
  if (!started || !userTurn) return;
  
  // Animate client pad press
  const padElement = document.getElementById(color);
  padElement.classList.add("active");
  playTone(color);
  spawnParticles(color);
  
  setTimeout(() => {
    padElement.classList.remove("active");
  }, 120);
  
  userClickedPattern.push(color);
  checkAnswer(userClickedPattern.length - 1);
}

function checkAnswer(currentIndex) {
  let isCorrect = false;
  
  if (activeMode === "reverse") {
    // In reverse mode, check indices backwards
    const targetIndex = gamePattern.length - 1 - currentIndex;
    isCorrect = (userClickedPattern[currentIndex] === gamePattern[targetIndex]);
  } else {
    // Normal mode check
    isCorrect = (userClickedPattern[currentIndex] === gamePattern[currentIndex]);
  }
  
  if (isCorrect) {
    if (userClickedPattern.length === gamePattern.length) {
      userTurn = false;
      updateCoreStatus("SUCCESS", "green");
      
      playbackTimeoutId = setTimeout(() => {
        if (started) nextSequence();
      }, 1000);
    }
  } else {
    // Failure execution
    triggerGameOver();
  }
}

function triggerGameOver() {
  playWrongSound();
  
  // Trigger visual red screen glitch alert
  document.body.classList.add("game-over-alert");
  spawnExplosionParticles();
  
  setTimeout(() => {
    document.body.classList.remove("game-over-alert");
  }, 400);
  
  updateCoreStatus("CRITICAL", "red");
  
  // Record and save score
  const score = level - 1;
  checkAndSaveHighScore(score);
  
  started = false;
  userTurn = false;
  
  // Reset ENGAGE action button
  document.getElementById("start-btn").textContent = "RE-ENGAGE";
  document.getElementById("start-btn").classList.remove("abort-btn");
}

function updateCoreStatus(state, colorClass) {
  const stateElement = document.getElementById("core-state");
  stateElement.textContent = state;
  
  // Reset color states
  stateElement.style.color = "";
  stateElement.style.textShadow = "";
  
  // Set custom color codes based on state
  if (colorClass === "green") {
    stateElement.style.color = "var(--green-glow)";
    stateElement.style.textShadow = "0 0 10px rgba(57, 255, 20, 0.4)";
  } else if (colorClass === "blue") {
    stateElement.style.color = "var(--blue-glow)";
    stateElement.style.textShadow = "0 0 10px rgba(0, 162, 255, 0.4)";
  } else if (colorClass === "cyan") {
    stateElement.style.color = "var(--accent-primary)";
    stateElement.style.textShadow = "0 0 10px var(--accent-glow)";
  } else if (colorClass === "magenta") {
    stateElement.style.color = "var(--accent-secondary)";
    stateElement.style.textShadow = "0 0 10px rgba(255, 0, 85, 0.4)";
  } else if (colorClass === "red") {
    stateElement.style.color = "var(--red-glow)";
    stateElement.style.textShadow = "0 0 10px rgba(255, 0, 85, 0.5)";
  }
}

// --- LOCAL STORAGE & DATA STATE ---
function loadSavedData() {
  // Theme load
  const savedTheme = localStorage.getItem("simon_theme") || "cyberpunk";
  setTheme(savedTheme);
  
  // High scores load
  const modes = ["classic", "speedrun", "strict", "reverse"];
  modes.forEach(mode => {
    const score = localStorage.getItem(`simon_high_${mode}`) || 0;
    document.getElementById(`high-${mode}`).textContent = score;
  });
  
  // Volume load
  const savedVolume = localStorage.getItem("simon_volume") || 50;
  document.getElementById("volume-slider").value = savedVolume;
  document.getElementById("volume-val").textContent = `${savedVolume}%`;
  
  // Synth load
  const savedSynth = localStorage.getItem("simon_synth") || "sine";
  setSynth(savedSynth);
}

function setTheme(theme) {
  // Remove other theme classes
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
  
  // Save selection
  localStorage.setItem("simon_theme", theme);
  
  // Update button active state
  document.querySelectorAll(".theme-select-btn").forEach(btn => {
    if (btn.dataset.theme === theme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function setSynth(synth) {
  synthType = synth;
  localStorage.setItem("simon_synth", synth);
  
  document.querySelectorAll(".synth-btn").forEach(btn => {
    if (btn.dataset.synth === synth) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function checkAndSaveHighScore(score) {
  const currentHigh = parseInt(localStorage.getItem(`simon_high_${activeMode}`) || 0);
  if (score > currentHigh) {
    localStorage.setItem(`simon_high_${activeMode}`, score);
    document.getElementById(`high-${activeMode}`).textContent = score;
  }
}

function wipeCoreData() {
  const modes = ["classic", "speedrun", "strict", "reverse"];
  modes.forEach(mode => {
    localStorage.setItem(`simon_high_${mode}`, 0);
    document.getElementById(`high-${mode}`).textContent = 0;
  });
  
  // Reset volume & synth settings
  localStorage.setItem("simon_volume", 50);
  document.getElementById("volume-slider").value = 50;
  document.getElementById("volume-val").textContent = "50%";
  
  setSynth("sine");
  setTheme("cyberpunk");
  
  abortGame();
}

// --- EVENT HANDLERS ---
function setupUIEventListeners() {
  // Pad Click listeners
  document.querySelectorAll(".pad").forEach(pad => {
    pad.addEventListener("click", () => {
      handlePadPress(pad.id);
    });
  });
  
  // Start action Engage listener
  document.getElementById("start-btn").addEventListener("click", startSystem);
  
  // Wipe Data Button listener
  document.getElementById("reset-data").addEventListener("click", () => {
    if (confirm("ARE YOU SURE YOU WANT TO FORMAT CORE MEMORY SHARDS? ALL HIGH SCORES WILL BE ERASED.")) {
      wipeCoreData();
    }
  });
  
  // Mode options selector listeners
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (started) {
        if (!confirm("CHANGING MODES WILL REBOOT QUANTUM CORE. PROCEED?")) return;
        abortGame();
      }
      
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeMode = btn.dataset.mode;
    });
  });
  
  // Volume Slider slider listener
  const volumeSlider = document.getElementById("volume-slider");
  volumeSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    document.getElementById("volume-val").textContent = `${val}%`;
    localStorage.setItem("simon_volume", val);
  });
  
  // Synth Selector listeners
  document.querySelectorAll(".synth-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setSynth(btn.dataset.synth);
    });
  });
  
  // Theme Select selector listeners
  document.querySelectorAll(".theme-select-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setTheme(btn.dataset.theme);
    });
  });
  
  // KEYBOARD CONTROLS SYSTEM
  document.addEventListener("keydown", (e) => {
    // Space bar engagements
    if (e.code === "Space") {
      e.preventDefault(); // Prevent page scrolling
      startSystem();
      return;
    }
    
    if (!started || !userTurn) return;
    
    let colorPressed = null;
    switch (e.key.toLowerCase()) {
      case "q":
      case "arrowup":
        colorPressed = "green";
        break;
      case "w":
      case "arrowright":
        colorPressed = "red";
        break;
      case "a":
      case "arrowleft":
        colorPressed = "yellow";
        break;
      case "s":
      case "arrowdown":
        colorPressed = "blue";
        break;
    }
    
    if (colorPressed) {
      handlePadPress(colorPressed);
    }
  });
}

// --- CANVAS PARTICLE SYSTEM ---
let pCanvas = null;
let pCtx = null;
let particles = [];

function initParticleCanvas() {
  pCanvas = document.getElementById("particle-canvas");
  pCtx = pCanvas.getContext("2d");
  
  resizeParticleCanvas();
  window.addEventListener("resize", resizeParticleCanvas);
  
  // Start animation frame loop
  animateParticles();
}

function resizeParticleCanvas() {
  if (!pCanvas) return;
  pCanvas.width = pCanvas.parentElement.clientWidth;
  pCanvas.height = pCanvas.parentElement.clientHeight;
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 4 + 2;
    this.speedX = (Math.random() - 0.5) * 7;
    this.speedY = (Math.random() - 0.5) * 7;
    this.color = color;
    this.alpha = 1;
    this.decay = Math.random() * 0.02 + 0.015;
  }
  
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha -= this.decay;
    if (this.size > 0.1) this.size -= 0.05;
  }
  
  draw() {
    pCtx.save();
    pCtx.globalAlpha = this.alpha;
    pCtx.shadowBlur = 8;
    pCtx.shadowColor = this.color;
    pCtx.fillStyle = this.color;
    pCtx.beginPath();
    pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.restore();
  }
}

function spawnParticles(colorKey) {
  if (!pCanvas) return;
  
  const rect = document.getElementById(colorKey).getBoundingClientRect();
  const wrapperRect = pCanvas.getBoundingClientRect();
  
  // Calculate relative center of the element to canvas
  const x = rect.left - wrapperRect.left + rect.width / 2;
  const y = rect.top - wrapperRect.top + rect.height / 2;
  
  const colors = {
    green: "#39ff14",
    red: "#ff0055",
    yellow: "#ffea00",
    blue: "#00a2ff"
  };
  
  const colorHex = colors[colorKey] || "#ffffff";
  
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle(x, y, colorHex));
  }
}

function spawnExplosionParticles() {
  if (!pCanvas) return;
  
  const width = pCanvas.width;
  const height = pCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  
  const explosionColors = ["#ff0055", "#00f3ff", "#ffffff"];
  
  for (let i = 0; i < 60; i++) {
    const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
    const p = new Particle(centerX, centerY, color);
    // Expand explosion velocity range
    p.speedX = (Math.random() - 0.5) * 14;
    p.speedY = (Math.random() - 0.5) * 14;
    particles.push(p);
  }
}

function animateParticles() {
  if (!pCtx) return;
  
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    
    if (particles[i].alpha <= 0) {
      particles.splice(i, 1);
    }
  }
  
  requestAnimationFrame(animateParticles);
}

// --- CANVAS AUDIO VISUALIZER ---
let vCanvas = null;
let vCtx = null;

function initVisualizerCanvas() {
  vCanvas = document.getElementById("visualizer-canvas");
  vCtx = vCanvas.getContext("2d");
  
  resizeVisualizerCanvas();
  window.addEventListener("resize", resizeVisualizerCanvas);
  
  animateVisualizer();
}

function resizeVisualizerCanvas() {
  if (!vCanvas) return;
  vCanvas.width = vCanvas.parentElement.clientWidth;
  vCanvas.height = vCanvas.parentElement.clientHeight;
}

function animateVisualizer() {
  if (!vCtx) return;
  
  requestAnimationFrame(animateVisualizer);
  
  const width = vCanvas.width;
  const height = vCanvas.height;
  vCtx.clearRect(0, 0, width, height);
  
  // Resolve theme visualizer color dynamically
  const accentColor = getComputedStyle(document.body).getPropertyValue("--accent-primary").trim() || "#00f3ff";
  
  if (analyser && synthType !== "classic") {
    // Real-time Web Audio API waveform visualization
    analyser.getByteFrequencyData(dataArray);
    
    const barWidth = (width / bufferLength) * 1.6;
    let barHeight;
    let x = 0;
    
    vCtx.shadowBlur = 10;
    vCtx.shadowColor = accentColor;
    
    for (let i = 0; i < bufferLength; i++) {
      // Scale frequency values
      barHeight = (dataArray[i] / 255) * height * 0.95;
      
      vCtx.fillStyle = accentColor;
      vCtx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
      
      x += barWidth;
    }
  } else {
    // Simulated waveform fallback drawing
    vCtx.beginPath();
    vCtx.lineWidth = 2.5;
    vCtx.strokeStyle = accentColor;
    vCtx.shadowBlur = 12;
    vCtx.shadowColor = accentColor;
    
    const sliceWidth = width / 40;
    let x = 0;
    
    // Smooth decay energy fallback
    if (simulatedSignal > 0.02) {
      simulatedSignal *= 0.94;
    } else {
      simulatedSignal = 0;
    }
    
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 4.5 + (Date.now() * 0.015);
      // Wave modulation equation
      const amplitude = (2 + simulatedSignal * 16) * Math.sin(angle);
      const y = height / 2 + amplitude;
      
      if (i === 0) {
        vCtx.moveTo(x, y);
      } else {
        vCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    vCtx.stroke();
  }
}

