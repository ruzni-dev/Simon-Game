// ADVANCED QUANTUM CORE SIMON GAME LOGIC
// Converted to jQuery

// Game parameters
const buttonColours = ["green", "red", "yellow", "blue"];
let gamePattern = [];
let userClickedPattern = [];
let started = false;
let level = 0;
let userTurn = false;
let activeMode = "classic"; // classic, speedrun, strict, reverse
let synthType = "classic";  // sine, triangle, sawtooth, classic
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
let simulatedSignal = 0;

// --- INITIALIZATION ---
$(document).ready(function () {
  loadSavedData();
  setupUIEventListeners();
  initParticleCanvas();
  initVisualizerCanvas();

  $("#level-title").text("00");
});

// --- AUDIO CONFIGURATION ---
function playTone(color) {
  simulatedSignal = 1.0;

  if (synthType === "classic") {
    playClassicSound(color);
    return;
  }

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setupAnalyser();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const volumeVal = parseFloat($("#volume-slider").val()) / 100;
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

  filterNode.type = "lowpass";
  filterNode.frequency.setValueAtTime(frequency * 3, audioCtx.currentTime);
  filterNode.frequency.exponentialRampToValueAtTime(frequency * 1.1, audioCtx.currentTime + 0.45);
  filterNode.Q.setValueAtTime(1.5, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volumeVal * 0.35, audioCtx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.45);
}

function playClassicSound(color) {
  const volumeVal = parseFloat($("#volume-slider").val()) / 100;
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

  const volumeVal = parseFloat($("#volume-slider").val()) / 100;
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

  $("#start-btn").text("ABORT").addClass("abort-btn");

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

  $("#start-btn").text("ENGAGE").removeClass("abort-btn");
  $("#level-title").text("00");

  updateCoreStatus("STANDBY", "");
}

function nextSequence() {
  userClickedPattern = [];
  level++;

  $("#level-title").text(String(level).padStart(2, '0'));

  const randomNumber = Math.floor(Math.random() * 4);
  const randomChosenColour = buttonColours[randomNumber];
  gamePattern.push(randomChosenColour);

  playPatternSequence();
}

function playPatternSequence() {
  userTurn = false;
  updateCoreStatus("SCANNING", "blue");

  let baseSpeed = 900;
  if (activeMode === "speedrun") {
    baseSpeed = Math.max(250, 950 - level * 70);
  }

  let i = 0;

  function triggerNext() {
    if (i < gamePattern.length) {
      const color = gamePattern[i];

      setTimeout(function () {
        if (!started) return;

        flashPad(color);
        i++;
        triggerNext();
      }, i === 0 ? 300 : baseSpeed);
    } else {
      setTimeout(function () {
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
  const $pad = $("#" + color);
  if (!$pad.length) return;

  $pad.addClass("active");
  playTone(color);
  spawnParticles(color);

  let flashDuration = 450;
  if (activeMode === "speedrun") {
    flashDuration = Math.max(160, (950 - level * 70) * 0.65);
  }

  setTimeout(function () {
    $pad.removeClass("active");
  }, flashDuration);
}

function handlePadPress(color) {
  if (!started || !userTurn) return;

  const $pad = $("#" + color);
  $pad.addClass("active");
  playTone(color);
  spawnParticles(color);

  setTimeout(function () {
    $pad.removeClass("active");
  }, 120);

  userClickedPattern.push(color);
  checkAnswer(userClickedPattern.length - 1);
}

function checkAnswer(currentIndex) {
  let isCorrect = false;

  if (activeMode === "reverse") {
    const targetIndex = gamePattern.length - 1 - currentIndex;
    isCorrect = (userClickedPattern[currentIndex] === gamePattern[targetIndex]);
  } else {
    isCorrect = (userClickedPattern[currentIndex] === gamePattern[currentIndex]);
  }

  if (isCorrect) {
    if (userClickedPattern.length === gamePattern.length) {
      userTurn = false;
      updateCoreStatus("SUCCESS", "green");

      playbackTimeoutId = setTimeout(function () {
        if (started) nextSequence();
      }, 1000);
    }
  } else {
    triggerGameOver();
  }
}

function triggerGameOver() {
  playWrongSound();

  $("body").addClass("game-over-alert");
  spawnExplosionParticles();

  setTimeout(function () {
    $("body").removeClass("game-over-alert");
  }, 400);

  updateCoreStatus("CRITICAL", "red");

  const score = level - 1;
  checkAndSaveHighScore(score);

  started = false;
  userTurn = false;

  $("#start-btn").text("RE-ENGAGE").removeClass("abort-btn");
}

function updateCoreStatus(state, colorClass) {
  const $stateEl = $("#core-state");
  $stateEl.text(state);
  $stateEl.css({ color: "", "text-shadow": "" });

  if (colorClass === "green") {
    $stateEl.css({ color: "var(--green-glow)", "text-shadow": "0 0 10px rgba(57, 255, 20, 0.4)" });
  } else if (colorClass === "blue") {
    $stateEl.css({ color: "var(--blue-glow)", "text-shadow": "0 0 10px rgba(0, 162, 255, 0.4)" });
  } else if (colorClass === "cyan") {
    $stateEl.css({ color: "var(--accent-primary)", "text-shadow": "0 0 10px var(--accent-glow)" });
  } else if (colorClass === "magenta") {
    $stateEl.css({ color: "var(--accent-secondary)", "text-shadow": "0 0 10px rgba(255, 0, 85, 0.4)" });
  } else if (colorClass === "red") {
    $stateEl.css({ color: "var(--red-glow)", "text-shadow": "0 0 10px rgba(255, 0, 85, 0.5)" });
  }
}

// --- LOCAL STORAGE & DATA STATE ---
function loadSavedData() {
  const savedTheme = localStorage.getItem("simon_theme") || "cyberpunk";
  setTheme(savedTheme);

  const modes = ["classic", "speedrun", "strict", "reverse"];
  $.each(modes, function (_, mode) {
    const score = localStorage.getItem("simon_high_" + mode) || 0;
    $("#high-" + mode).text(score);
  });

  const savedVolume = localStorage.getItem("simon_volume") || 50;
  $("#volume-slider").val(savedVolume);
  $("#volume-val").text(savedVolume + "%");

  const savedSynth = localStorage.getItem("simon_synth") || "classic";
  setSynth(savedSynth);
}

function setTheme(theme) {
  $("body").attr("class", "theme-" + theme);
  localStorage.setItem("simon_theme", theme);

  $(".theme-select-btn").each(function () {
    if ($(this).data("theme") === theme) {
      $(this).addClass("active");
    } else {
      $(this).removeClass("active");
    }
  });
}

function setSynth(synth) {
  synthType = synth;
  localStorage.setItem("simon_synth", synth);

  $(".synth-btn").each(function () {
    if ($(this).data("synth") === synth) {
      $(this).addClass("active");
    } else {
      $(this).removeClass("active");
    }
  });
}

function checkAndSaveHighScore(score) {
  const currentHigh = parseInt(localStorage.getItem("simon_high_" + activeMode) || 0);
  if (score > currentHigh) {
    localStorage.setItem("simon_high_" + activeMode, score);
    $("#high-" + activeMode).text(score);
  }
}

function wipeCoreData() {
  const modes = ["classic", "speedrun", "strict", "reverse"];
  $.each(modes, function (_, mode) {
    localStorage.setItem("simon_high_" + mode, 0);
    $("#high-" + mode).text(0);
  });

  localStorage.setItem("simon_volume", 50);
  $("#volume-slider").val(50);
  $("#volume-val").text("50%");

  setSynth("classic");
  setTheme("cyberpunk");
  abortGame();
}

// --- EVENT HANDLERS ---
function setupUIEventListeners() {
  // Pad click listeners
  $(".pad").on("click", function () {
    handlePadPress($(this).attr("id"));
  });

  // Start / Abort button
  $("#start-btn").on("click", function () {
    startSystem();
  });

  // Wipe Data button
  $("#reset-data").on("click", function () {
    if (confirm("ARE YOU SURE YOU WANT TO FORMAT CORE MEMORY SHARDS? ALL HIGH SCORES WILL BE ERASED.")) {
      wipeCoreData();
    }
  });

  // Mode selector buttons
  $(".mode-btn").on("click", function () {
    if (started) {
      if (!confirm("CHANGING MODES WILL REBOOT QUANTUM CORE. PROCEED?")) return;
      abortGame();
    }

    $(".mode-btn").removeClass("active");
    $(this).addClass("active");
    activeMode = $(this).data("mode");
  });

  // Volume slider
  $("#volume-slider").on("input", function () {
    const val = $(this).val();
    $("#volume-val").text(val + "%");
    localStorage.setItem("simon_volume", val);
  });

  // Synth selector buttons
  $(".synth-btn").on("click", function () {
    setSynth($(this).data("synth"));
  });

  // Theme selector buttons
  $(".theme-select-btn").on("click", function () {
    setTheme($(this).data("theme"));
  });

  // Keyboard controls
  $(document).on("keydown", function (e) {
    if (e.code === "Space") {
      e.preventDefault();
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
  $(window).on("resize", resizeParticleCanvas);

  animateParticles();
}

function resizeParticleCanvas() {
  if (!pCanvas) return;
  pCanvas.width = $(pCanvas).parent().width();
  pCanvas.height = $(pCanvas).parent().height();
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

  const $pad = $("#" + colorKey);
  if (!$pad.length) return;

  const rect = $pad[0].getBoundingClientRect();
  const wrapperRect = pCanvas.getBoundingClientRect();

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

  const centerX = pCanvas.width / 2;
  const centerY = pCanvas.height / 2;
  const explosionColors = ["#ff0055", "#00f3ff", "#ffffff"];

  for (let i = 0; i < 60; i++) {
    const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
    const p = new Particle(centerX, centerY, color);
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
  $(window).on("resize", resizeVisualizerCanvas);

  animateVisualizer();
}

function resizeVisualizerCanvas() {
  if (!vCanvas) return;
  vCanvas.width = $(vCanvas).parent().width();
  vCanvas.height = $(vCanvas).parent().height();
}

function animateVisualizer() {
  if (!vCtx) return;

  requestAnimationFrame(animateVisualizer);

  const width = vCanvas.width;
  const height = vCanvas.height;
  vCtx.clearRect(0, 0, width, height);

  const accentColor = $("body").css("--accent-primary") ||
    getComputedStyle(document.body).getPropertyValue("--accent-primary").trim() ||
    "#00f3ff";

  if (analyser && synthType !== "classic") {
    analyser.getByteFrequencyData(dataArray);

    const barWidth = (width / bufferLength) * 1.6;
    let x = 0;

    vCtx.shadowBlur = 10;
    vCtx.shadowColor = accentColor;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height * 0.95;
      vCtx.fillStyle = accentColor;
      vCtx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
      x += barWidth;
    }
  } else {
    vCtx.beginPath();
    vCtx.lineWidth = 2.5;
    vCtx.strokeStyle = accentColor;
    vCtx.shadowBlur = 12;
    vCtx.shadowColor = accentColor;

    const sliceWidth = width / 40;
    let x = 0;

    if (simulatedSignal > 0.02) {
      simulatedSignal *= 0.94;
    } else {
      simulatedSignal = 0;
    }

    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 4.5 + (Date.now() * 0.015);
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