/**
 * UI Initialization & Screen Setup
 */

import { uiScreenManager } from '@ui/screens'
import { gyroInputHandler } from '@telegram/input'
import { appStateManager } from '@core/state'
import { telegramBridge } from '@telegram/bridge'

export function setupUI() {
  // Create main container
  const appContainer = document.getElementById('app')!
  appContainer.innerHTML = `
    <div class="app-layout">
      <!-- Splash Screen -->
      <div id="screen-splash" class="screen active">
        <div class="splash-content">
          <div class="splash-logo">🏎️</div>
          <h1>ASPHALT</h1>
          <p>Gyro Racing Game</p>
          <div class="loading-spinner"></div>
        </div>
      </div>

      <!-- Permissions Screen -->
      <div id="screen-permissions" class="screen">
        <div class="screen-content">
          <h2>Enable Motion Sensors</h2>
          <p>This game requires gyroscope/accelerometer access for steering with device tilt.</p>
          <div class="permission-items">
            <div class="permission-item">
              <span class="icon">📱</span>
              <span class="text">Device Orientation</span>
            </div>
            <div class="permission-item">
              <span class="icon">⚙️</span>
              <span class="text">Gyroscope</span>
            </div>
          </div>
          <button id="btn-grant-permissions" class="btn btn-primary">
            Grant Permissions
          </button>
          <button id="btn-use-touch" class="btn btn-secondary">
            Use Touch Controls
          </button>
        </div>
      </div>

      <!-- Calibration Screen -->
      <div id="screen-calibration" class="screen">
        <div class="screen-content">
          <h2>Calibration</h2>
          <div class="calibration-demo">
            <div class="gyro-visualizer">
              <canvas id="gyro-canvas" width="300" height="300"></canvas>
            </div>
          </div>
          <div class="calibration-info">
            <p>Hold device in neutral position</p>
            <div id="calibration-status" class="status">Detecting sensors...</div>
          </div>
          <button id="btn-calibrate" class="btn btn-primary" disabled>
            Calibrate
          </button>
          <button id="btn-skip-calibration" class="btn btn-secondary">
            Skip
          </button>
        </div>
      </div>

      <!-- Main Menu Screen -->
      <div id="screen-menu" class="screen">
        <div class="screen-content menu-content">
          <h1>ASPHALT</h1>
          <div class="menu-items">
            <button id="btn-play" class="btn btn-primary btn-large">
              🏁 Play
            </button>
            <button id="btn-settings" class="btn btn-secondary">
              ⚙️ Settings
            </button>
            <button id="btn-stats" class="btn btn-secondary">
              📊 Stats
            </button>
          </div>
        </div>
      </div>

      <!-- Race Screen -->
      <div id="screen-race" class="screen">
        <canvas id="race-canvas"></canvas>
        <div class="hud">
          <div class="hud-left">
            <div class="speed-display">
              <div class="label">SPEED</div>
              <div id="speed-value" class="value">0</div>
            </div>
          </div>
          <div class="hud-center">
            <div id="lap-display" class="lap-info">LAP 1/3</div>
          </div>
          <div class="hud-right">
            <div class="time-display">
              <div class="label">TIME</div>
              <div id="time-value" class="value">0:00</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Screen -->
      <div id="screen-results" class="screen">
        <div class="screen-content">
          <h2>Race Complete!</h2>
          <div class="results-info">
            <div class="result-item">
              <span class="label">Lap Time</span>
              <span id="result-time" class="value">--:--</span>
            </div>
            <div class="result-item">
              <span class="label">Top Speed</span>
              <span id="result-speed" class="value">0 km/h</span>
            </div>
          </div>
          <button id="btn-share" class="btn btn-primary">
            📤 Share Result
          </button>
          <button id="btn-race-again" class="btn btn-secondary">
            🏁 Race Again
          </button>
        </div>
      </div>
    </div>
  `

  // Add styles
  addStyles()

  // Register screens with UI manager
  uiScreenManager.initialize('#app')

  const registerScreen = (screenName: string) => {
    const element = document.getElementById(`screen-${screenName}`)!
    uiScreenManager.registerScreen({
      name: screenName as any,
      element,
    })
  }

  registerScreen('splash')
  registerScreen('permissions')
  registerScreen('calibration')
  registerScreen('menu')
  registerScreen('race')
  registerScreen('results')

  // Setup event listeners
  setupEventListeners()
}

function setupEventListeners() {
  const btnCalibrate = document.getElementById('btn-calibrate')
  const btnSkipCalibration = document.getElementById('btn-skip-calibration')
  const btnPlay = document.getElementById('btn-play')
  const btnGrantPermissions = document.getElementById('btn-grant-permissions')
  const btnUseTouch = document.getElementById('btn-use-touch')

  // Calibration screen
  btnCalibrate?.addEventListener('click', async () => {
    const state = gyroInputHandler.getInputState()
    if (state.calibrated) {
      appStateManager.setState({ calibrated: true, screen: 'menu' })
      await uiScreenManager.showScreen('menu')
    }
  })

  btnSkipCalibration?.addEventListener('click', async () => {
    appStateManager.setState({ screen: 'menu' })
    await uiScreenManager.showScreen('menu')
  })

  // Menu screen
  btnPlay?.addEventListener('click', async () => {
    appStateManager.setState({ screen: 'race' })
    await uiScreenManager.showScreen('race')
    // Initialize the race canvas when entering race screen
    initializeRaceCanvas()
  })

  // Permissions
  btnGrantPermissions?.addEventListener('click', async () => {
    appStateManager.setState({ screen: 'calibration' })
    await uiScreenManager.showScreen('calibration')
  })

  btnUseTouch?.addEventListener('click', async () => {
    appStateManager.setState({ screen: 'calibration' })
    await uiScreenManager.showScreen('calibration')
  })
}

/**
 * Initialize and render on the race canvas
 */
function initializeRaceCanvas() {
  const canvas = document.getElementById('race-canvas') as HTMLCanvasElement
  if (!canvas) return

  // Get the screen element to size canvas properly
  const screenRace = document.getElementById('screen-race')
  if (!screenRace) return

  const width = screenRace.clientWidth
  const height = screenRace.clientHeight

  canvas.width = width
  canvas.height = height

  // Render a test pattern to verify canvas works
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, width, height)

  // Draw a grid pattern to verify rendering
  ctx.strokeStyle = '#1a1f3a'
  ctx.lineWidth = 1

  // Draw vertical lines
  for (let x = 0; x < width; x += 50) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = 0; y < height; y += 50) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Draw center indicator
  ctx.fillStyle = '#ff6b35'
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 10, 0, Math.PI * 2)
  ctx.fill()

  // Add text
  ctx.fillStyle = '#ffffff'
  ctx.font = '20px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Race Canvas Ready', width / 2, height / 2 + 40)

  console.log('Race canvas initialized:', { width, height })
}

// Call this function when showing the race screen
// Add this to setupEventListeners for the play button

function addStyles() {
  const style = document.createElement('style')
  style.textContent = `
    :root {
      --primary: #ff6b35;
      --secondary: #004e89;
      --bg: #0a0e27;
      --text: #ffffff;
      --border: #1a1f3a;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
    }

    .app-layout {
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    .screen {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .screen.active {
      display: flex;
      opacity: 1;
      z-index: 10;
    }

    .screen-content {
      width: 100%;
      max-width: 500px;
      padding: 2rem;
      text-align: center;
    }

    .splash-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .splash-logo {
      font-size: 4rem;
    }

    h1, h2 {
      margin: 1rem 0;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 600;
      margin: 0.5rem;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:active {
      transform: scale(0.95);
      opacity: 0.9;
    }

    .btn-secondary {
      background: var(--secondary);
      color: white;
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1.2rem;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .hud {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      z-index: 20;
      font-size: 0.9rem;
    }

    .hud-left, .hud-right, .hud-center {
      background: rgba(0, 0, 0, 0.5);
      padding: 0.75rem 1rem;
      border-radius: 8px;
    }

    .label {
      font-size: 0.7rem;
      opacity: 0.7;
      text-transform: uppercase;
    }

    .value {
      font-size: 1.5rem;
      font-weight: bold;
      margin-top: 0.25rem;
    }

    .menu-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2rem;
    }

    .menu-items {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    #race-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 2px solid var(--primary);
      border-radius: 8px;
      background: linear-gradient(180deg, #1a1f3a 0%, #0a0e27 100%);
    }

    .calibration-demo {
      margin: 2rem 0;
    }

    .gyro-visualizer {
      display: flex;
      justify-content: center;
    }

    #gyro-canvas {
      border: 2px solid var(--primary);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
    }

    .results-info {
      margin: 2rem 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .result-item {
      display: flex;
      justify-content: space-between;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }

    .permission-items {
      margin: 2rem 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .permission-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }

    .permission-item .icon {
      font-size: 1.5rem;
    }

    .status {
      padding: 1rem;
      background: rgba(255, 107, 53, 0.2);
      border-radius: 8px;
      margin: 1rem 0;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `
  document.head.appendChild(style)
}
