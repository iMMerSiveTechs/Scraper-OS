import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_SETTINGS = {
  // AI Provider keys
  openaiKey: '',
  anthropicKey: '',
  openaiModel: 'gpt-4o-mini',
  anthropicModel: 'claude-sonnet-4-20250514',
  preferredProvider: '', // '' = auto-detect from available keys

  // Digest preferences
  digestStyle: 'executive', // executive | technical | trends
  autoDigest: false,

  // Notifications
  notificationsEnabled: false,
  webhookUrl: '',

  // Data
  retentionDays: 30,
  maxResults: 500,

  // UI
  compactFeed: false,
  showSparklines: true,
};

/**
 * Central settings manager for Scraper OS.
 * All settings are persisted in localStorage.
 */
export function useSettings() {
  const [settings, setSettings] = useLocalStorage('scraper-os-settings', DEFAULT_SETTINGS);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, [setSettings]);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, [setSettings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, [setSettings]);

  // Derived state
  const hasAIKey = !!(settings.openaiKey || settings.anthropicKey);

  const activeProvider = settings.preferredProvider
    || (settings.anthropicKey ? 'anthropic' : settings.openaiKey ? 'openai' : null);

  const activeKey = activeProvider === 'anthropic'
    ? settings.anthropicKey
    : activeProvider === 'openai'
      ? settings.openaiKey
      : null;

  const activeModel = activeProvider === 'anthropic'
    ? settings.anthropicModel
    : activeProvider === 'openai'
      ? settings.openaiModel
      : null;

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    hasAIKey,
    activeProvider,
    activeKey,
    activeModel,
  };
}
