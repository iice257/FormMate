type AccountModalTab = "profile" | "settings" | "help"

type AccountModalSnapshot = {
  activeTab: AccountModalTab
  open: boolean
}

const listeners = new Set<() => void>()

let snapshot: AccountModalSnapshot = {
  activeTab: "profile",
  open: false,
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function getAccountModalSnapshot() {
  return snapshot
}

export function subscribeAccountModal(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function openAccountModal(tab: AccountModalTab = "profile") {
  snapshot = {
    activeTab: tab,
    open: true,
  }
  emitChange()
}

export function setAccountModalTab(tab: AccountModalTab) {
  snapshot = {
    ...snapshot,
    activeTab: tab,
  }
  emitChange()
}

export function closeAccountModal() {
  if (!snapshot.open) {
    return
  }

  snapshot = {
    ...snapshot,
    open: false,
  }
  emitChange()
}

export function initAccountModal() {
  return openAccountModal
}
