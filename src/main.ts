/**
 * Main Application Entry Point
 */

import { telegramBridge } from '@telegram/bridge'
import { motionSensorManager } from '@telegram/sensors'
import { gyroInputHandler } from '@telegram/input'
import { appStateManager } from '@core/state'
import { uiScreenManager } from '@ui/screens'
import { setupUI } from './main-ui'


async function main() {
  try {
    console.log('🚗 ASPHALT Gyro Racing - Starting...')

    // Initialize Telegram Mini App
    const webapp = await telegramBridge.ready()
    console.log('✓ Telegram initialized')

    // Initialize UI
    setupUI()
    console.log('✓ UI initialized')

    // Request sensor permissions and detect capabilities
    const sensors = await motionSensorManager.detectSensors()
    console.log('✓ Sensors detected:', sensors)

    appStateManager.setState({
      hasGyro: sensors.gyroscope || sensors.deviceOrientation,
    })

    // Initialize input handler
    await gyroInputHandler.initialize()
    console.log('✓ Input handler initialized')

    // Setup state subscriptions
    appStateManager.subscribe((state) => {
      console.log('App state:', state)
    })

    // Listen to input changes
    gyroInputHandler.onInputStateChanged((state) => {
      console.log('Input:', state.steering.toFixed(2))
    })

    // Move to calibration screen
    appStateManager.setState({
      screen: 'calibration',
      isLoading: false,
    })

    await uiScreenManager.showScreen('calibration')

    console.log('✓ App ready')
  } catch (error) {
    console.error('Failed to initialize app:', error)
    appStateManager.setState({
      screen: 'splash',
      error: String(error),
      isLoading: false,
    })
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main()
}
