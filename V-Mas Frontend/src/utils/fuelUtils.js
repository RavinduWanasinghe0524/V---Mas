/**
 * Calculates fuel efficiency (km/L) for each log client-side in-place.
 * Formula: (Current Mileage - Previous Mileage) / Current Liters
 * Logs are grouped by vehicleRegNumber, sorted chronologically (date ascending),
 * and the efficiency is computed.
 *
 * For the FIRST log of a vehicle, the vehicle's registered `currentMileageKm`
 * is used as the baseline so efficiency is always calculated (not N/A).
 *
 * @param {Array} logs     - Array of fuel log objects (mutated in-place).
 * @param {Array} vehicles - Optional array of vehicle objects with registrationNo & currentMileageKm.
 * @returns {Array} The same array with `fuelEfficiency` property updated on each log.
 */
export const computeLogsEfficiency = (logs, vehicles = []) => {
  if (!logs || !logs.length) return logs

  // Build a quick lookup: registrationNo -> currentMileageKm
  const vehicleMileageMap = {}
  vehicles.forEach(v => {
    if (v.registrationNo != null && v.currentMileageKm != null) {
      vehicleMileageMap[v.registrationNo] = v.currentMileageKm
    }
  })

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
  Object.entries(groups).forEach(([reg, vehicleLogs]) => {
    // Sort ascending (oldest first) by date, and fallback to id
    vehicleLogs.sort((a, b) => new Date(a.date) - new Date(b.date) || (a.id || 0) - (b.id || 0))

    // Use vehicle's registered mileage as the baseline for the first entry
    const registeredMileage = vehicleMileageMap[reg] ?? null

    for (let i = 0; i < vehicleLogs.length; i++) {
      const current = vehicleLogs[i]
      // Previous mileage: use previous log's mileage, or vehicle's registered mileage for the first log
      const prevMileage = i > 0 ? vehicleLogs[i - 1].mileage : registeredMileage

      if (
        current.mileage != null &&
        prevMileage != null &&
        current.mileage > prevMileage &&
        current.liters != null &&
        current.liters > 0
      ) {
        const diff = current.mileage - prevMileage
        current.fuelEfficiency = Math.round((diff / current.liters) * 100) / 100
      } else {
        current.fuelEfficiency = null
      }
    }
  })

  return logs
}
