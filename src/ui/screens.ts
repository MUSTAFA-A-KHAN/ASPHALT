/**
 * UI Screen Manager
 * Handles rendering different screens
 */

import { appStateManager, AppScreen } from '@core/state'

interface Screen {
  name: AppScreen
  element: HTMLElement
  onEnter?(): void | Promise<void>
  onExit?(): void | Promise<void>
}

class UIScreenManager {
  private screens = new Map<AppScreen, Screen>()
  private currentScreen: Screen | null = null
  private appContainer: HTMLElement | null = null

  /**
   * Initialize screen manager
   */
  initialize(containerSelector: string): void {
    this.appContainer = document.querySelector(containerSelector)
    if (!this.appContainer) {
      throw new Error(`Container ${containerSelector} not found`)
    }
  }

  /**
   * Register a screen
   */
  registerScreen(screen: Screen): void {
    this.screens.set(screen.name, screen)
  }

  /**
   * Show a screen
   */
  async showScreen(screenName: AppScreen): Promise<void> {
    const screen = this.screens.get(screenName)
    if (!screen) {
      throw new Error(`Screen ${screenName} not registered`)
    }

    // Exit current screen
    if (this.currentScreen?.onExit) {
      await this.currentScreen.onExit()
    }

    // Hide all screens
    if (this.appContainer) {
      this.appContainer.querySelectorAll('.screen').forEach((el) => {
        el.classList.remove('active')
      })
    }

    // Show new screen
    screen.element.classList.add('active')
    this.currentScreen = screen

    // Enter new screen
    if (screen.onEnter) {
      await screen.onEnter()
    }
  }

  /**
   * Get current screen name
   */
  getCurrentScreenName(): AppScreen | null {
    return this.currentScreen?.name ?? null
  }
}

export const uiScreenManager = new UIScreenManager()
