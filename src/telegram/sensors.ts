/**
 * Motion Sensor Detection & Management
 * Handles gyroscope, accelerometer, and deviceorientation events
 */

import { telegramBridge } from '@telegram/bridge'

export interface SensorCapabilities {
  gyroscope: boolean
  accelerometer: boolean
  deviceOrientation: boolean
  touchScreen: boolean
}

export interface GyroData {
  x: number
  y: number
  z: number
  alpha?: number // rotation around Z axis
}

export interface DeviceOrientationData {
  alpha: number // Z rotation (0-360)
  beta: number  // X rotation (-180 to 180)
  gamma: number // Y rotation (-90 to 90)
}

class MotionSensorManager {
  private capabilities: SensorCapabilities = {
    gyroscope: false,
    accelerometer: false,
    deviceOrientation: false,
    touchScreen: true,
  }

  private gyroListeners: Set<(data: GyroData) => void> = new Set()
  private orientationListeners: Set<(data: DeviceOrientationData) => void> = new Set()
  private accelListeners: Set<(data: GyroData) => void> = new Set()

  private gyroPermission = false
  private accelPermission = false

  private deviceOrientationActive = false
  private gyroscopeActive = false

  /**
   * Detect and request motion sensor permissions
   */
  async detectSensors(): Promise<SensorCapabilities> {
    console.log('Detecting motion sensors...')

    // Request permissions from Telegram
    const { gyroscope, accelerometer } = await telegramBridge.requestMotionPermissions()
    this.gyroPermission = gyroscope
    this.accelPermission = accelerometer

    // Check for deviceorientation
    const hasDeviceOrientation = 'DeviceOrientationEvent' in window
    this.capabilities.deviceOrientation = hasDeviceOrientation

    // Check for gyroscope
    if ('DeviceMotionEvent' in window && gyroscope) {
      this.capabilities.gyroscope = true
    }

    // Check for accelerometer
    if ('DeviceMotionEvent' in window && accelerometer) {
      this.capabilities.accelerometer = true
    }

    console.log('Sensor capabilities:', this.capabilities)
    return this.capabilities
  }

  /**
   * Get current sensor capabilities
   */
  getCapabilities(): SensorCapabilities {
    return { ...this.capabilities }
  }

  /**
   * Enable deviceorientation tracking
   */
  enableDeviceOrientation() {
    if (this.deviceOrientationActive) return

    if (!this.capabilities.deviceOrientation) {
      console.warn('DeviceOrientation not supported')
      return
    }

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      const data: DeviceOrientationData = {
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
      }
      this.orientationListeners.forEach((listener) => listener(data))
    }

    window.addEventListener('deviceorientation', handleDeviceOrientation)
    this.deviceOrientationActive = true
    console.log('DeviceOrientation enabled')

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
      this.deviceOrientationActive = false
    }
  }

  /**
   * Enable gyroscope tracking
   */
  enableGyroscope() {
    if (this.gyroscopeActive) return

    if (!this.capabilities.gyroscope) {
      console.warn('Gyroscope not supported')
      return
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const rotation = event.rotationRate
      if (rotation) {
        const data: GyroData = {
          x: rotation.x ?? 0,
          y: rotation.y ?? 0,
          z: rotation.z ?? 0,
        }
        this.gyroListeners.forEach((listener) => listener(data))
      }

      // Also capture accelerometer data if enabled
      if (this.accelPermission && event.acceleration) {
        const accelData: GyroData = {
          x: event.acceleration.x ?? 0,
          y: event.acceleration.y ?? 0,
          z: event.acceleration.z ?? 0,
        }
        this.accelListeners.forEach((listener) => listener(accelData))
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    this.gyroscopeActive = true
    console.log('Gyroscope enabled')

    return () => {
      window.removeEventListener('devicemotion', handleMotion)
      this.gyroscopeActive = false
    }
  }

  /**
   * Disable all sensors
   */
  disableAllSensors() {
    if (this.deviceOrientationActive) {
      window.removeEventListener('deviceorientation', () => {})
      this.deviceOrientationActive = false
    }
    if (this.gyroscopeActive) {
      window.removeEventListener('devicemotion', () => {})
      this.gyroscopeActive = false
    }
  }

  /**
   * Subscribe to gyroscope data
   */
  onGyroscope(listener: (data: GyroData) => void): () => void {
    this.gyroListeners.add(listener)
    return () => this.gyroListeners.delete(listener)
  }

  /**
   * Subscribe to device orientation data
   */
  onDeviceOrientation(listener: (data: DeviceOrientationData) => void): () => void {
    this.orientationListeners.add(listener)
    return () => this.orientationListeners.delete(listener)
  }

  /**
   * Subscribe to accelerometer data
   */
  onAccelerometer(listener: (data: GyroData) => void): () => void {
    this.accelListeners.add(listener)
    return () => this.accelListeners.delete(listener)
  }

  /**
   * Request permission with user-friendly handling
   */
  async requestPermissionWithUI(): Promise<boolean> {
    const supported = this.capabilities.deviceOrientation || this.capabilities.gyroscope
    
    if (!supported) {
      await telegramBridge.showAlert(
        '⚠️ Your device does not support motion sensors.\nFallback to touch controls.'
      )
      return false
    }

    return true
  }
}

export const motionSensorManager = new MotionSensorManager()
