// ─── Notification Storage Keys ─────────────────────────────────────────────
const CTRL_NOTIF_KEY = 'controller_notifications'
const DRV_NOTIF_KEY = 'driver_notifications'

// ─── Controller notification helpers ────────────────────────────────────────
export const addControllerNotification = (message, type = 'INFO') => {
  const existing = JSON.parse(localStorage.getItem(CTRL_NOTIF_KEY) || '[]')
  const newNotif = {
    id: Date.now(),
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  }
  // Keep only last 50
  const updated = [newNotif, ...existing].slice(0, 50)
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify(updated))
  // Dispatch a custom event so the Topbar re-renders immediately
  window.dispatchEvent(new Event('ctrl-notification-update'))
}

export const getControllerNotifications = () =>
  JSON.parse(localStorage.getItem(CTRL_NOTIF_KEY) || '[]')

export const markCtrlRead = (id) => {
  const updated = getControllerNotifications().map(n =>
    n.id === id ? { ...n, isRead: true } : n
  )
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event('ctrl-notification-update'))
}

export const markAllCtrlRead = () => {
  const updated = getControllerNotifications().map(n => ({ ...n, isRead: true }))
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event('ctrl-notification-update'))
}

export const clearAllCtrlNotifications = () => {
  localStorage.setItem(CTRL_NOTIF_KEY, JSON.stringify([]))
  window.dispatchEvent(new Event('ctrl-notification-update'))
}

// ─── Driver notification helpers ─────────────────────────────────────────────
export const addDriverNotification = (message, type = 'INFO') => {
  const existing = JSON.parse(localStorage.getItem(DRV_NOTIF_KEY) || '[]')
  const newNotif = {
    id: Date.now(),
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  }
  const updated = [newNotif, ...existing].slice(0, 50)
  localStorage.setItem(DRV_NOTIF_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event('drv-notification-update'))
}

export const getDriverNotifications = () =>
  JSON.parse(localStorage.getItem(DRV_NOTIF_KEY) || '[]')

export const markDrvRead = (id) => {
  const updated = getDriverNotifications().map(n =>
    n.id === id ? { ...n, isRead: true } : n
  )
  localStorage.setItem(DRV_NOTIF_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event('drv-notification-update'))
}

export const markAllDrvRead = () => {
  const updated = getDriverNotifications().map(n => ({ ...n, isRead: true }))
  localStorage.setItem(DRV_NOTIF_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event('drv-notification-update'))
}

export const clearAllDrvNotifications = () => {
  localStorage.setItem(DRV_NOTIF_KEY, JSON.stringify([]))
  window.dispatchEvent(new Event('drv-notification-update'))
}
