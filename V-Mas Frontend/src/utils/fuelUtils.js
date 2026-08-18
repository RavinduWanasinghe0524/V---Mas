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

  // Build a quick lookup: registrationNo -> initialMileageKm ?? currentMileageKm ?? 0
  const vehicleMileageMap = {}
  vehicles.forEach(v => {
    if (v.registrationNo != null) {
      vehicleMileageMap[v.registrationNo] = v.initialMileageKm ?? v.currentMileageKm ?? 0
    }
  })

  // Group logs by vehicleRegNumber (skipping deleted or rejected logs)
  const groups = {}
  logs.forEach(l => {
    if (l.isDeleted || l.deleted || l.status === 'REJECTED') return
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

/**
 * Maps raw fuel type enum values/strings to standard Sri Lankan descriptive names.
 * Supports legacy values (Petrol, Diesel) and formats hybrid/electric if present.
 *
 * @param {string} type - Raw fuel type string
 * @returns {string} Friendly display label
 */
export const formatFuelType = (type) => {
  if (!type) return 'N/A';
  const clean = type.toUpperCase().replace('_', ' ');
  if (clean === 'PETROL' || clean.includes('PETROL 92') || clean.includes('PETROL_92')) return 'Petrol 92 Octane';
  if (clean === 'SUPER PETROL' || clean.includes('PETROL 95') || clean.includes('PETROL_95') || clean.includes('SUPER_PETROL')) return 'Petrol 95 Octane';
  if (clean === 'DIESEL' || clean.includes('AUTO DIESEL') || clean.includes('AUTO_DIESEL')) return 'Auto Diesel';
  if (clean === 'SUPER DIESEL' || clean.includes('SUPER_DIESEL')) return 'Super Diesel';
  if (clean === 'HYBRID') return 'Hybrid';
  if (clean === 'ELECTRIC') return 'Electric';
  return clean.charAt(0) + clean.slice(1).toLowerCase();
}

/**
 * Returns the exact descriptive name of the fuel log type for a given vehicle fuel type.
 *
 * @param {string} vehicleFuelType - Vehicle's fuelType enum string
 * @returns {string} descriptive fuel log string
 */
export const getFuelLogType = (vehicleFuelType) => {
  if (!vehicleFuelType) return '';
  return formatFuelType(vehicleFuelType);
}

/**
 * Shared fuel-type badge helper.
 * Returns color tokens for badge rendering.
 */
export const fuelBadge = (ft, D) => {
  const clean = (ft || '').toUpperCase().replace('_', ' ');
  if (clean.includes('PETROL 92') || clean === 'PETROL') {
    return { color: D.gold, bg: D.goldDim };
  }
  if (clean.includes('PETROL 95') || clean === 'SUPER PETROL') {
    return { color: '#ea580c', bg: 'rgba(234,88,12,0.12)' };
  }
  if (clean.includes('AUTO DIESEL') || clean === 'DIESEL') {
    return { color: D.indigo, bg: D.indigoDim };
  }
  if (clean.includes('SUPER DIESEL')) {
    return { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' };
  }
  if (clean.includes('HYBRID')) {
    return { color: D.green, bg: D.greenDim };
  }
  if (clean.includes('ELECTRIC')) {
    return { color: D.blue, bg: D.blueDim };
  }
  return { color: D.textSub, bg: D.surfaceHi };
}

/**
 * Shared approval status badge helper.
 */
export const approvalBadge = (status) => {
  const s = (status || 'APPROVED').toUpperCase()
  if (s === 'PENDING') return { label: 'Pending', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' }
  if (s === 'REJECTED') return { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' }
  return { label: 'Approved', bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' }
}

