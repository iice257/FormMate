const ZEN_MODE_STORAGE_PREFIX = "fm_zen_mode_"
const ZEN_MODE_EVENT = "fm:zen-mode-change"
const SUPPORTED_ZEN_SCREENS = new Set([
  "dashboard",
  "ai-chat",
  "new",
  "history",
  "workspace",
  "vault",
  "examples",
])

function getZenModeStorageKey(screenId: string) {
  return `${ZEN_MODE_STORAGE_PREFIX}${screenId}`
}

export function isZenModeSupported(screenId: string) {
  return SUPPORTED_ZEN_SCREENS.has(screenId)
}

export function isZenModeEnabled(screenId: string) {
  try {
    return window.sessionStorage.getItem(getZenModeStorageKey(screenId)) === "true"
  } catch {
    return false
  }
}

function setZenModeEnabled(screenId: string, enabled: boolean) {
  try {
    window.sessionStorage.setItem(
      getZenModeStorageKey(screenId),
      enabled ? "true" : "false",
    )
  } catch {
    // Ignore storage failures and fall back to in-memory UI state.
  }
}

export function updateZenMode(screenId: string, enabled: boolean) {
  if (!isZenModeSupported(screenId)) {
    return false
  }

  setZenModeEnabled(screenId, enabled)
  window.dispatchEvent(
    new CustomEvent(ZEN_MODE_EVENT, {
      detail: { screenId, enabled },
    }),
  )
  return true
}
