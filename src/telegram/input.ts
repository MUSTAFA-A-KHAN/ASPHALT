/**
 * Gyroscope Input Handler
 * Converts sensor data to steering input with smoothing, dead zone, and calibration
 */

import { motionSensorManager, DeviceOrientationData, GyroData } from '@telegram/sensors'

export interface InputState {
  steering: number // -1 to 1
  throttle: number // 0 to 1
  brake: boolean
  calibrated: boolean
}

export interface CalibrationData {
  baseAlpha: number
  baseBeta: number
  baseGamma: number
  timestamp: number
}

class GyroInputHandler {
  private inputState: InputState = {
    steering: 0,
    throttle: 0.5, // Mid throttle
    brake: false,
    calibrated: false,
  }

  private calibrationData: CalibrationData | null = null
  private unsubscribers: Array<() => void> = []

  // Configuration
  private sensitivityMultiplier = 1.0
  private deadZone = 5 // degrees
  private steeringSmoothing = 0.1 // 0-1, lower = more smooth
  private previousSteering = 0

  // Input sources
  private lastDeviceOrientation: DeviceOrientationData | null = null
  private lastGyroData: GyroData | null = null
  private touchActive = false
  private touchX = 0

  private stateListeners: Set<(state: InputState) => void> = new Set()

  /**
   * Initialize gyro input handler
   */
  async initialize(): Promise<void> {
    console.log('Initializing gyro input handler...')

    const capabilities = motionSensorManager.getCapabilities()

    // Enable device orientation (primary steering source)
    if (capabilities.deviceOrientation) {
      motionSensorManager.enableDeviceOrientation()
      const unsubGyro = motionSensorManager.onDeviceOrientation((data) =>
        this.handleDeviceOrientation(data)
      )
      this.unsubscribers.push(unsubGyro)
    }

    // Enable gyroscope as fallback
    if (capabilities.gyroscope) {
      motionSensorManager.enableGyroscope()
      const unsubGyro = motionSensorManager.onGyroscope((data) =>
        this.handleGyroscope(data)
      )
      this.unsubscribers.push(unsubGyro)
    }

    // Enable touch fallback
    this.setupTouchFallback()

    // Enable keyboard fallback
    this.setupKeyboardFallback()

    console.log('Gyro input handler initialized')
  }

  /**
   * Calibrate to current sensor position
   */
  calibrate(orientation: DeviceOrientationData): void {
    this.calibrationData = {
      baseAlpha: orientation.alpha,
      baseBeta: orientation.beta,
      baseGamma: orientation.gamma,
      timestamp: Date.now(),
    }
    this.inputState.calibrated = true
    console.log('Calibration set:', this.calibrationData)
  }

  /**
   * Reset calibration
   */
  resetCalibration(): void {
    this.calibrationData = null
    this.inputState.calibrated = false
  }

  /**
   * Handle device orientation event
   */
  private handleDeviceOrientation(data: DeviceOrientationData): void {
    this.lastDeviceOrientation = data

    if (!this.calibrationData) {
      // Auto-calibrate on first reading
      this.calibrate(data)
      return
    }

    // Calculate delta from calibration
    let gammaDelta = data.gamma - this.calibrationData.baseGamma

    // Normalize to -180 to 180
    while (gammaDelta > 180) gammaDelta -= 360
    while (gammaDelta < -180) gammaDelta += 360

    // Apply dead zone
    if (Math.abs(gammaDelta) < this.deadZone) {
      gammaDelta = 0
    }

    // Normalize to -1 to 1 range (assume max ±45 degrees for steering)
    let rawSteering = gammaDelta / 45
    rawSteering = Math.max(-1, Math.min(1, rawSteering))

    // Apply sensitivity
    rawSteering *= this.sensitivityMultiplier

    // Apply exponential curve for better control
    const sign = Math.sign(rawSteering)
    const curved = sign * (rawSteering * rawSteering)

    // Smooth the input
    this.inputState.steering =
      this.previousSteering * (1 - this.steeringSmoothing) +
      curved * this.steeringSmoothing

    this.previousSteering = this.inputState.steering
    this.emitState()
  }

  /**
   * Handle raw gyroscope data
   */
  private handleGyroscope(data: GyroData): void {
    this.lastGyroData = data
    // Gyroscope is primarily used for validation/feedback, not primary steering
  }

  /**
   * Setup touch joystick fallback
   */
  private setupTouchFallback(): void {
    const joystickEl = document.getElementById('touch-joystick')
    if (!joystickEl) return

    let joystickActive = false
    let joystickCenterX = 0
    let joystickCenterY = 0

    const handleTouchStart = (e: TouchEvent) => {
      joystickActive = true
      const touch = e.touches[0]
      joystickCenterX = touch.clientX
      joystickCenterY = touch.clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!joystickActive) return

      const touch = e.touches[0]
      const dx = touch.clientX - joystickCenterX
      const maxDist = 50

      // Map to steering
      this.inputState.steering = Math.max(-1, Math.min(1, dx / maxDist))
      this.emitState()
    }

    const handleTouchEnd = () => {
      joystickActive = false
      this.inputState.steering = 0
      this.emitState()
    }

    joystickEl.addEventListener('touchstart', handleTouchStart)
    joystickEl.addEventListener('touchmove', handleTouchMove)
    joystickEl.addEventListener('touchend', handleTouchEnd)

    this.unsubscribers.push(() => {
      joystickEl.removeEventListener('touchstart', handleTouchStart)
      joystickEl.removeEventListener('touchmove', handleTouchMove)
      joystickEl.removeEventListener('touchend', handleTouchEnd)
    })
  }

  /**
   * Setup keyboard fallback
   */
  private setupKeyboardFallback(): void {
    const keyStates = new Map<string, boolean>()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'w', 'a', 'd'].includes(e.key)) {
        keyStates.set(e.key.toLowerCase(), true)
        this.updateKeyboardInput(keyStates)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'w', 'a', 'd'].includes(e.key)) {
        keyStates.set(e.key.toLowerCase(), false)
        this.updateKeyboardInput(keyStates)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    this.unsubscribers.push(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    })
  }

  /**
   * Update input from keyboard
   */
  private updateKeyboardInput(keyStates: Map<string, boolean>): void {
    let steering = 0
    const left = keyStates.get('arrowleft') || keyStates.get('a')
    const right = keyStates.get('arrowright') || keyStates.get('d')

    if (left) steering -= 1
    if (right) steering += 1

    this.inputState.steering = Math.max(-1, Math.min(1, steering))
    this.inputState.throttle = keyStates.get('w') ? 1 : 0.5

    this.emitState()
  }

  /**
   * Set steering sensitivity
   */
  setSensitivity(multiplier: number): void {
    this.sensitivityMultiplier = Math.max(0.5, Math.min(2, multiplier))
  }

  /**
   * Set dead zone
   */
  setDeadZone(degrees: number): void {
    this.deadZone = Math.max(0, Math.min(45, degrees))
  }

  /**
   * Get current input state
   */
  getInputState(): InputState {
    return { ...this.inputState }
  }

  /**
   * Subscribe to input state changes
   */
  onInputStateChanged(listener: (state: InputState) => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  /**
   * Emit state to listeners
   */
  private emitState(): void {
    this.stateListeners.forEach((listener) => listener(this.getInputState()))
  }

  /**
   * Get calibration data
   */
  getCalibration(): CalibrationData | null {
    return this.calibrationData
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    motionSensorManager.disableAllSensors()
  }
}

export const gyroInputHandler = new GyroInputHandler()
