/**
 * Telegram Mini App WebApp interface types
 * Based on Telegram Bot API documentation
 */

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
}

export interface DeviceOrientation {
  alpha: number // 0-360 (Z axis)
  beta: number  // -180 to 180 (X axis, pitch)
  gamma: number // -90 to 90 (Y axis, roll)
}

export interface GyroscopeData {
  x: number
  y: number
  z: number
}

export interface AccelerometerData {
  x: number
  y: number
  z: number
}

export interface PermissionRequest {
  access_requested: 'geolocation' | 'accelerometer' | 'gyroscope' | 'magnetometer'
}

export interface PopupButton {
  id: string
  type: 'default' | 'destructive' | 'ok' | 'close' | 'cancel'
  text: string
}

export interface PopupParams {
  title?: string
  message: string
  buttons?: PopupButton[]
}

export type HapticFeedbackType =
  | 'impact'
  | 'notification'
  | 'selection'

export type ThemeType = 'light' | 'dark'

export interface ThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: TelegramUser
    receiver?: TelegramUser
    chat?: TelegramChat
    chat_instance?: string
    chat_type?: string
    start_param?: string
    can_send_after?: number
    auth_date: number
    hash: string
  }
  version: string
  platform: string
  headerColor: string
  bottomBarColor: string
  backgroundColor: string
  textColor: string
  hintColor: string
  linkColor: string
  buttonColor: string
  buttonTextColor: string
  secondaryBgColor: string
  headerBgColor: string
  accentTextColor: string
  sectionBgColor: string
  sectionHeaderTextColor: string
  subtitleTextColor: string
  destructiveTextColor: string
  themeParams: ThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  isClosingConfirmationEnabled: boolean
  safeAreaInset: {
    top: number
    bottom: number
    left: number
    right: number
  }
  contentSafeAreaInset: {
    top: number
    bottom: number
    left: number
    right: number
  }
  isVerticalSwipesEnabled: boolean
  isClosingConfirmationNeeded: boolean

  // Events
  onEvent(eventType: string, callback: (...args: any[]) => void): void
  offEvent(eventType: string, callback: (...args: any[]) => void): void
  sendEvent(eventType: string, ...args: any[]): void

  // Ready
  ready(): void
  expand(): void
  close(): void

  // Haptic feedback
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }

  // Popup
  showPopup(params: PopupParams, callback?: (id: string) => void): void
  showAlert(message: string, callback?: () => void): void
  showConfirm(message: string, callback?: (ok: boolean) => void): void

  // Cloud Storage
  CloudStorage: {
    getItem(key: string, callback?: (error: any, value: string | null) => void): void
    setItem(key: string, value: string, callback?: (error: any) => void): void
    removeItem(key: string, callback?: (error: any) => void): void
    getKeys(callback?: (error: any, keys: string[]) => void): void
    removeItems(keys: string[], callback?: (error: any) => void): void
  }

  // Device Sensors (Gyroscope & Accelerometer)
  requestPermission(access_requested: string, callback?: (permission_granted: boolean) => void): void
  requestContactPermission(callback?: (permission_granted: boolean) => void): void

  // Orientation
  lockOrientation(): void
  unlockOrientation(): void

  // Telegram Events
  onViewportChanged(callback: (data: { isStateStable: boolean; height: number }) => void): void
  onThemeChanged(callback: () => void): void
  onHomeScreenShown(callback: () => void): void
  onWriteAccessRequested(callback: (status: string) => void): void
  onContactRequested(callback: (status: string) => void): void
  onClipboardTextReceived(callback: (data: { data: string }) => void): void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}
