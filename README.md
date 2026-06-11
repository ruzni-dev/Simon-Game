# Simon // Quantum Core 

An advanced, premium, and futuristic sci-fi redesign of the classic Simon memory game. Powered by the Web Audio API, dynamic HTML5 canvas particle engines, real-time wave visualizers, and responsive cyberpunk glassmorphic layouts.

## Key Features

- 🛸 **Sci-Fi Cyber-Console UI**: A stunning glassmorphic dashboard styled with moving space-grid overlays, neon glow components, and orbital background light rings.
- 🎨 **Multi-Themed Chromatic Matrix**: Select from 4 distinctive color scheme matrices:
  - **Cyberpunk Cyan**: Futuristic neon cyber shades (Default).
  - **Solar Gold**: Industrial high-energy molten amber.
  - **Deep Space Violet**: Dark interstellar purple and teal elements.
  - **Laser Ruby**: Sleek crimson hazard cockpit tones.
- 🔊 **Acoustic Synthesizer Matrix**: Synthesizer tones generated in real time using the Web Audio API (Sine, Triangle, Sawtooth waveforms) paired with resonant filters and exponential gain decay envelopes. Fallback to standard "Classic Arcade" audio files is also supported.
- 📊 **Real-time Canvas Audio Visualizer**: A digital wave analyzer rendering frequency spectra in the header synchronized with sound cues.
- ☄️ **Canvas Particle Engine**: Active physics engine rendering particle bursts and shockwave explosions on button presses or system failures.
- 🎮 **4 Protocol Modes**:
  - **Classic**: Original memory replication.
  - **Speedrun**: Interval pacing accelerates (faster flashes) as levels rise.
  - **Strict**: A single mistake triggers a complete system memory wipe back to Level 1.
  - **Reverse**: Players must replicate the sequence backwards (e.g. A ➔ B ➔ C requires entering C ➔ B ➔ A).
- ⌨️ **Keyboard Mapping Inputs**: Support for arrow keys, specific Q/W/A/S triggers, and spacebar actions, complete with keyboard hints directly overlaid on the console game pads.
- 💾 **Data Shards Leaderboard**: Local storage integration saving high scores across all four game modes independently.

---

## Technical Stack & Architecture

- **Structure**: Semantic HTML5 elements (`index.html`) establishing side panels, the game console, header visualizers, and key mapping references.
- **Styling**: Vanilla CSS3 (`assets/css/style.css`) with modular custom properties, responsive flexbox/grid layers, custom slider styles, and keyframe animations.
- **Logic**: Vanilla ES6+ Javascript (`assets/js/script.js`) replacing jQuery, including:
  - Custom Web Audio classes for filter nodes and gain oscillators.
  - Interactive event binders mapping keys, click ranges, and settings.
  - Custom drawing loops on double-buffered HTML5 `<canvas>` structures.
  - State management regulating game playback controls to prevent input corruption.

---

## Controls

### Keyboard Bindings
- **Green Pad**: `Q` or `Arrow Up`
- **Red Pad**: `W` or `Arrow Right`
- **Yellow Pad**: `A` or `Arrow Left`
- **Blue Pad**: `S` or `Arrow Down`
- **System Engaged/Abort**: `Spacebar`

---

## Getting Started

1. Clone or download this repository to your local directory.
2. Open `index.html` in any modern web browser.
3. Select your preferred **Protocol Mode**, **Synth Waveform**, and **Chromatic Theme** in the side consoles.
4. Press `Spacebar` or click **ENGAGE** in the center core screen to begin!
