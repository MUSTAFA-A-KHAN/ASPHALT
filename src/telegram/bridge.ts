/**
 * Telegram Mini App Loader & Bridge
 * Handles initialization, permission requests, and lifecycle management
 */

import { TelegramWebApp, PermissionRequest, ThemeType } from '@types/telegram'

class TelegramBridge {
  private webapp: TelegramWebApp | null = null
  private initialized = false
  private initPromise: Promise<TelegramWebApp> | null = null
  private permissionStates = new Map<string, boolean>()

  constructor() {
    this.initPromise = this.initialize()
  }

  /**
   * Initialize Telegram Mini App
   */
  private async initialize(): Promise<TelegramWebApp> {
    return new Promise((resolve, reject) => {
      // Wait for Telegram WebApp to be ready
      const checkWebApp = () => {
        if (window.Telegram?.WebApp) {
          const webapp = window.Telegram.WebApp
          webapp.ready()
          
          // Lock to landscape
          try {
            webapp.lockOrientation()
          } catch (e) {
            console.warn('Could not lock orientation:', e)
          }

          // Enable closing confirmation
          if ('enableClosingConfirmation' in webapp) {
            (webapp as any).enableClosingConfirmation()
          }

          this.webapp = webapp
          this.initialized = true
          console.log('Telegram WebApp initialized', {
            version: webapp.version,
            platform: webapp.platform,
            user: webapp.initDataUnsafe.user?.first_name,
          })
          resolve(webapp)
        } else {
          setTimeout(checkWebApp, 100)
        }
      }

      checkWebApp()

      // Safety timeout
      setTimeout(() => {
        if (this.webapp) resolve(this.webapp)
        else reject(new Error('Telegram WebApp not available after timeout'))
      }, 5000)
    })
  }

  /**
   * Wait for Telegram to be ready
   */
  async ready(): Promise<TelegramWebApp> {
    if (!this.initPromise) {
      this.initPromise = this.initialize()
    }
    return this.initPromise
  }

  /**
   * Request permission for sensor access
   */
  async requestSensorPermission(
    sensor: 'accelerometer' | 'gyroscope' | 'magnetometer'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.webapp) {
        console.warn(`WebApp not ready, cannot request ${sensor} permission`)
        resolve(false)
        return
      }

      // Check if permission is already cached
      if (this.permissionStates.has(sensor)) {
        resolve(this.permissionStates.get(sensor)!)
        return
      }

      try {
        this.webapp.requestPermission(sensor, (granted: boolean) => {
          this.permissionStates.set(sensor, granted)
          console.log(`${sensor} permission:`, granted)
          resolve(granted)
        })
      } catch (e) {
        console.error(`Failed to request ${sensor} permission:`, e)
        // Assume granted on error (user's device might support it anyway)
        this.permissionStates.set(sensor, true)
        resolve(true)
      }
    })
  }

  /**
   * Request gyroscope and accelerometer permissions
   */
  async requestMotionPermissions(): Promise<{
    gyroscope: boolean
    accelerometer: boolean
  }> {
    const [gyroscope, accelerometer] = await Promise.all([
      this.requestSensorPermission('gyroscope'),
      this.requestSensorPermission('accelerometer'),
    ])

    return { gyroscope, accelerometer }
  }

  /**
   * Save data to Telegram Cloud Storage
   */
  async saveData(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webapp?.CloudStorage) {
        reject(new Error('CloudStorage not available'))
        return
      }

      try {
        this.webapp.CloudStorage.setItem(key, value, (error: any) => {
          if (error) reject(error)
          else resolve()
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Load data from Telegram Cloud Storage
   */
  async loadData(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.webapp?.CloudStorage) {
        reject(new Error('CloudStorage not available'))
        return
      }

      try {
        this.webapp.CloudStorage.getItem(key, (error: any, value: string | null) => {
          if (error) reject(error)
          else resolve(value)
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Get all keys from Cloud Storage
   */
  async getAllKeys(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.webapp?.CloudStorage) {
        reject(new Error('CloudStorage not available'))
        return
      }

      try {
        this.webapp.CloudStorage.getKeys((error: any, keys: string[]) => {
          if (error) reject(error)
          else resolve(keys)
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Trigger haptic feedback
   */
  haptic(type: 'impact' | 'notification' | 'selection', param?: string) {
    if (!this.webapp?.HapticFeedback) return

    try {
      switch (type) {
        case 'impact':
          this.webapp.HapticFeedback.impactOccurred(param as any || 'light')
          break
        case 'notification':
          this.webapp.HapticFeedback.notificationOccurred(param as any || 'success')
          break
        case 'selection':
          this.webapp.HapticFeedback.selectionChanged()
          break
      }
    } catch (e) {
      console.warn('Haptic feedback failed:', e)
    }
  }

  /**
   * Get theme type
   */
  getTheme(): ThemeType {
    if (!this.webapp) return 'dark'
    const isDark = this.webapp.backgroundColor === '#000' || 
                   this.webapp.backgroundColor.toLowerCase() === '#000000'
    return isDark ? 'dark' : 'light'
  }

  /**
   * Get background color
   */
  getBackgroundColor(): string {
    return this.webapp?.backgroundColor || '#000'
  }

  /**
   * Get user data
   */
  getUser() {
    return this.webapp?.initDataUnsafe.user || null
  }

  /**
   * Get platform info
   */
  getPlatform(): string {
    return this.webapp?.platform || 'unknown'
  }

  /**
   * Expand to full height
   */
  expand() {
    if (this.webapp?.expand) {
      this.webapp.expand()
    }
  }

  /**
   * Close the mini app
   */
  close() {
    if (this.webapp?.close) {
      this.webapp.close()
    }
  }

  /**
   * Show alert popup
   */
  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.webapp?.showAlert) {
        this.webapp.showAlert(message, () => resolve())
      } else {
        alert(message)
        resolve()
      }
    })
  }

  /**
   * Show confirmation popup
   */
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webapp?.showConfirm) {
        this.webapp.showConfirm(message, (ok: boolean) => resolve(ok))
      } else {
        resolve(confirm(message))
      }
    })
  }

  /**
   * Listen to theme changes
   */
  onThemeChanged(callback: () => void) {
    if (this.webapp?.onThemeChanged) {
      this.webapp.onThemeChanged(callback)
    }
  }

  /**
   * Listen to viewport changes
   */
  onViewportChanged(callback: (data: { isStateStable: boolean; height: number }) => void) {
    if (this.webapp?.onViewportChanged) {
      this.webapp.onViewportChanged(callback)
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getWebApp(): TelegramWebApp | null {
    return this.webapp
  }
}

export const telegramBridge = new TelegramBridge()
