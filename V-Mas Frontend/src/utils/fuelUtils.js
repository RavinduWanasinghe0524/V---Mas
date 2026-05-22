/**
 * Calculates fuel efficiency (km/L) for each log client-side in-place.
 * Formula: (Current Mileage - Previous Mileage) / Current Liters
 * Logs are grouped by vehicleRegNumber, sorted chronologically (date ascending),
 * and the efficiency is computed.
 *
 * @param {Array} logs - Array of fuel log objects.
 * @returns {Array} The same array with `fuelEfficiency` property updated on each log.
 */
export const computeLogsEfficiency = (logs) => {
  if (!logs || !logs.length) return logs

  // Group logs by vehicleRegNumber
  const groups = {}
  logs.forEach(l => {
    const reg = l.vehicleRegNumber
    if (reg) {
      if (!groups[reg]) groups[reg] = []
      groups[reg].push(l)
    }
  })

  // Calculate efficiency sequentially for each vehicle's logs
  Object.values(groups).forEach(vehicleLogs => {
    // Sort ascending (oldest first) by date, and fallback to id
    vehicleLogs.sort((a, b) => new Date(a.date) - new Date(b.date) || (a.id || 0) - (b.id || 0))
    
    for (let i = 0; i < vehicleLogs.length; i++) {
      const current = vehicleLogs[i]
      if (i > 0) {
        const prev = vehicleLogs[i - 1]
        if (
          current.mileage != null &&
          prev.mileage != null &&
          current.mileage > prev.mileage &&
          current.liters != null &&
          current.liters > 0
        ) {
          const diff = current.mileage - prev.mileage
          current.fuelEfficiency = Math.round((diff / current.liters) * 100) / 100
        } else {
          current.fuelEfficiency = null
        }
      } else {
        current.fuelEfficiency = null
      }
    }
  })

  return logs
}
