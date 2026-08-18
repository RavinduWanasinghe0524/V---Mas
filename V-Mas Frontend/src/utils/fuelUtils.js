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

  // 1. Build lookup: normalized registrationNo -> vehicle metadata
  const vehicleMap = {}
  vehicles.forEach(v => {
    if (v && v.registrationNo) {
      const cleanReg = v.registrationNo.replace(/^VEH-/i, '').trim().toUpperCase()
      const initMil = Number(v.initialMileageKm) || 0
      const currMil = Number(v.currentMileageKm) || 0
      const defEff = Number(v.fuelEfficiency) || null
      vehicleMap[cleanReg] = {
        initialMileageKm: initMil,
        currentMileageKm: currMil,
        defaultEfficiency: defEff,
        fuelType: v.fuelType || ''
      }
    }
  })

  // 2. Group logs by normalized vehicle registration number (skip deleted or rejected logs)
  const groups = {}
  logs.forEach(l => {
    if (!l || l.isDeleted || l.deleted || l.status === 'REJECTED') return
    const reg = (l.vehicleRegNumber || '').replace(/^VEH-/i, '').trim().toUpperCase()
    if (reg) {
      if (!groups[reg]) groups[reg] = []
      groups[reg].push(l)
    }
  })

  // Standard fallback efficiency by fuel type if no prior history exists
  const getStandardEffByFuelType = (ft) => {
    const clean = (ft || '').toUpperCase()
    if (clean.includes('PETROL 95') || clean.includes('SUPER PETROL')) return 11.5
    if (clean.includes('PETROL')) return 12.0
    if (clean.includes('SUPER DIESEL')) return 10.5
    if (clean.includes('DIESEL')) return 10.0
    if (clean.includes('HYBRID')) return 18.0
    if (clean.includes('ELECTRIC')) return 6.5
    return 10.5
  }

  // 3. Process logs sequentially per vehicle
  Object.entries(groups).forEach(([reg, vehicleLogs]) => {
    // Sort chronologically ascending: date first, then mileage, then ID
    vehicleLogs.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime()
      const dateB = new Date(b.date || 0).getTime()
      if (dateA !== dateB) return dateA - dateB
      const milA = Number(a.mileage) || 0
      const milB = Number(b.mileage) || 0
      if (milA !== milB) return milA - milB
      return (a.id || 0) - (b.id || 0)
    })

    const vInfo = vehicleMap[reg]
    const initMileage = vInfo?.initialMileageKm || null

    // Pass 1: calculate direct delta efficiencies between consecutive odometer readings
    const validDeltas = []
    for (let i = 0; i < vehicleLogs.length; i++) {
      const current = vehicleLogs[i]
      const currMileage = Number(current.mileage) || 0
      const currLiters = Number(current.liters) || 0

      let prevMileage = null
      if (i > 0) {
        prevMileage = Number(vehicleLogs[i - 1].mileage) || null
      } else if (initMileage != null && initMileage > 0 && initMileage < currMileage) {
        prevMileage = initMileage
      }

      if (currMileage > 0 && prevMileage != null && currMileage > prevMileage && currLiters > 0) {
        const diff = currMileage - prevMileage
        const rawEff = diff / currLiters
        // Plausible fuel economy range (km/L)
        if (rawEff >= 2.0 && rawEff <= 40.0) {
          current.fuelEfficiency = Math.round(rawEff * 10) / 10
          validDeltas.push(current.fuelEfficiency)
        } else if (rawEff > 40.0) {
          // Normalize if a long gap occurred between recorded fill-ups
          current.fuelEfficiency = Math.round(Math.min(rawEff / Math.max(Math.round(rawEff / 12), 1), 25.0) * 10) / 10
          validDeltas.push(current.fuelEfficiency)
        } else {
          current.fuelEfficiency = Math.round(Math.max(rawEff, 3.5) * 10) / 10
          validDeltas.push(current.fuelEfficiency)
        }
      } else {
        current.fuelEfficiency = null
      }
    }

    // Pass 2: Fill in any first log or baseline entries with vehicle's average or standard
    const vehicleAvgEff = validDeltas.length > 0
      ? Math.round((validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length) * 10) / 10
      : (vInfo?.defaultEfficiency || null)

    for (let i = 0; i < vehicleLogs.length; i++) {
      const current = vehicleLogs[i]
      if (current.fuelEfficiency == null || isNaN(current.fuelEfficiency) || current.fuelEfficiency <= 0) {
        if (vehicleAvgEff && vehicleAvgEff > 0) {
          current.fuelEfficiency = vehicleAvgEff
        } else {
          current.fuelEfficiency = getStandardEffByFuelType(current.fuelType || vInfo?.fuelType)
        }
      }
    }
  })

  // Ensure any orphaned logs also have a valid fallback
  logs.forEach(l => {
    if (l && (l.fuelEfficiency == null || isNaN(l.fuelEfficiency) || l.fuelEfficiency <= 0)) {
      l.fuelEfficiency = getStandardEffByFuelType(l.fuelType)
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

