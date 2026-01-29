/**
 * Telegram Mini App Loader & Bridge
 * Handles initialization, permission requests, and lifecycle management
 */

// TelegramWebApp type defined inline to avoid import issues
type TelegramWebApp = any
type ThemeType = 'light' | 'dark'

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
          // Check if we're not in Telegram (development mode)
          // Allow app to continue without Telegram WebApp
          const isDevMode = !window.Telegram || !window.Telegram.WebApp
          if (isDevMode) {
            console.log('Running in development mode (not in Telegram)')
            // Create a mock webapp for development
            this.webapp = this.createMockWebApp()
            this.initialized = true
            resolve(this.webapp)
          } else {
            setTimeout(checkWebApp, 100)
          }
        }
      }

      checkWebApp()

      // Safety timeout - resolve with mock for development
      setTimeout(() => {
        if (this.webapp) {
          resolve(this.webapp)
        } else {
          console.log('Creating mock Telegram WebApp for development')
          this.webapp = this.createMockWebApp()
          this.initialized = true
          resolve(this.webapp)
        }
      }, 3000) // Shorter timeout for development
    })
  }

  /**
   * Create a mock WebApp for development/testing
   */
  private createMockWebApp(): TelegramWebApp {
    return {
      initData: '',
      initDataUnsafe: { auth_date: 0, hash: '' },
      version: '6.0',
      platform: 'unknown',
      headerColor: '#000',
      bottomBarColor: '#000',
      backgroundColor: '#000',
      textColor: '#fff',
      hintColor: '#888',
      linkColor: '#007bff',
      buttonColor: '#ff6b35',
      buttonTextColor: '#fff',
      secondaryBgColor: '#1a1f3a',
      headerBgColor: '#000',
      accentTextColor: '#ff6b35',
      sectionBgColor: '#1a1f3a',
      sectionHeaderTextColor: '#fff',
      subtitleTextColor: '#888',
      destructiveTextColor: '#ff4444',
      themeParams: {},
      isExpanded: true,
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight,
      isClosingConfirmationEnabled: false,
      safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      isVerticalSwipesEnabled: true,
      isClosingConfirmationNeeded: false,
      ready: () => {},
      expand: () => {},
      close: () => {},
      onEvent: () => {},
      offEvent: () => {},
      sendEvent: () => {},
      HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {},
        selectionChanged: () => {},
      },
      showPopup: () => {},
      showAlert: (msg: string, cb?: () => void) => { 
        console.log('Alert:', msg)
        cb?.() 
      },
      showConfirm: (msg: string, cb?: (ok: boolean) => void) => { 
        console.log('Confirm:', msg)
        cb?.(true) 
      },
      CloudStorage: {
        getItem: (key: string, cb?: (error: any, value: string | null) => void) => cb?.(null, null),
        setItem: (key: string, value: string, cb?: (error: any) => void) => cb?.(null),
        removeItem: (key: string, cb?: (error: any) => void) => cb?.(null),
        getKeys: (cb?: (error: any, keys: string[]) => void) => cb?.(null, []),
        removeItems: (keys: string[], cb?: (error: any) => void) => cb?.(null),
      },
      requestPermission: (access_requested: string, cb?: (permission_granted: boolean) => void) => {
        console.log('Mock permission request:', access_requested)
        // Always grant in mock mode
        cb?.(true)
      },
      requestContactPermission: (cb?: (permission_granted: boolean) => void) => cb?.(true),
      lockOrientation: () => {},
      unlockOrientation: () => {},
      onViewportChanged: () => {},
      onThemeChanged: () => {},
      onHomeScreenShown: () => {},
      onWriteAccessRequested: () => {},
      onContactRequested: () => {},
      onClipboardTextReceived: () => {},
    }
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
