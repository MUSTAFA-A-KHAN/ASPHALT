/**
 * Application State Manager
 * Central state management for the game
 */

export type AppScreen = 'splash' | 'permissions' | 'calibration' | 'menu' | 'race' | 'results'

export interface AppState {
  screen: AppScreen
  isLoading: boolean
  error: string | null
  hasGyro: boolean
  calibrated: boolean
  bestLapTime: number | null
}

class AppStateManager {
  private state: AppState = {
    screen: 'splash',
    isLoading: true,
    error: null,
    hasGyro: false,
    calibrated: false,
    bestLapTime: null,
  }

  private listeners: Set<(state: AppState) => void> = new Set()

  /**
   * Get current state
   */
  getState(): AppState {
    return { ...this.state }
  }

  /**
   * Update state
   */
  setState(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial }
    this.notifyListeners()
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener)
    // Notify immediately
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()))
  }
}

export const appStateManager = new AppStateManager()
