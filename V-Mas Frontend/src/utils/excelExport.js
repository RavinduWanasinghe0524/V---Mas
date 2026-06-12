/**
 * excelExport.js
 * Professional Excel (.xlsx) report generator for V-MAS Fleet Management System.
 * Uses ExcelJS to produce fully styled, branded reports.
 */
import ExcelJS from 'exceljs'

// ── Brand colours ────────────────────────────────────────────────────────────
const BRAND = {
  navy:      '1E3A8A',
  navyDark:  '172554',
  indigo:    '4338CA',
  indigoPale:'EEF2FF',
  blue:      '2563EB',
  bluePale:  'DBEAFE',
  green:     '059669',
  greenPale: 'D1FAE5',
  gold:      'D97706',
  goldPale:  'FEF3C7',
  red:       'DC2626',
  redPale:   'FEE2E2',
  teal:      '0D9488',
  tealPale:  'CCFBF1',
  purple:    '2563EB',
  purplePale:'DBEAFE',
  white:     'FFFFFF',
  grey50:    'F8FAFC',
  grey100:   'F1F5F9',
  grey200:   'E2E8F0',
  grey400:   '94A3B8',
  grey700:   '334155',
  grey900:   '0F172A',
}

// ── Helper: create a solid fill ───────────────────────────────────────────────
const fill = (hex) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } })

// ── Helper: thin border on all 4 sides ───────────────────────────────────────
const border = (color = BRAND.grey200) => ({
  top:    { style: 'thin', color: { argb: 'FF' + color } },
  left:   { style: 'thin', color: { argb: 'FF' + color } },
  bottom: { style: 'thin', color: { argb: 'FF' + color } },
  right:  { style: 'thin', color: { argb: 'FF' + color } },
})

// ── Helper: medium border (used for section headers) ─────────────────────────
const borderMedium = (color = BRAND.navy) => ({
  bottom: { style: 'medium', color: { argb: 'FF' + color } },
})

// ── Helper: format a date value safely ───────────────────────────────────────
const fmtDate = (v) => {
  if (!v) return 'N/A'
  const d = new Date(v)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Helper: format currency (Rs.) ────────────────────────────────────────────
const fmtCost = (v) => {
  const n = Number(v)
  return isNaN(n) ? 'N/A' : `Rs. ${n.toLocaleString()}`
}

// ── Helper: auto-fit column widths from data ─────────────────────────────────
const autoWidth = (ws, min = 12, max = 40) => {
  ws.columns.forEach((col) => {
    let maxLen = min
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(maxLen + 3, max)
  })
}

// ── Add the V-MAS cover / title block at the top of a sheet ─────────────────
const addCoverBlock = (ws, reportTitle, subtitle = '', colCount = 1) => {
  // Row 1 – Logo / company name bar
  ws.mergeCells(1, 1, 1, colCount)
  const logoCell = ws.getCell('A1')
  logoCell.value = '🚗  V-MAS Fleet Management System'
  logoCell.font   = { name: 'Calibri', bold: true, size: 15, color: { argb: 'FF' + BRAND.white } }
  logoCell.fill   = fill(BRAND.navyDark)
  logoCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 34

  // Row 2 – Report title
  ws.mergeCells(2, 1, 2, colCount)
  const titleCell = ws.getCell('A2')
  titleCell.value = reportTitle
  titleCell.font  = { name: 'Calibri', bold: true, size: 20, color: { argb: 'FF' + BRAND.white } }
  titleCell.fill  = fill(BRAND.navy)
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
  ws.getRow(2).height = 42

  // Row 3 – Subtitle / generated date
  ws.mergeCells(3, 1, 3, colCount)
  const subCell = ws.getCell('A3')
  subCell.value = `${subtitle ? subtitle + '  ·  ' : ''}Generated: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  subCell.font  = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FF' + BRAND.grey400 } }
  subCell.fill  = fill(BRAND.grey900)
  subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
  ws.getRow(3).height = 22

  // Row 4 – blank spacer
  ws.mergeCells(4, 1, 4, colCount)
  ws.getCell('A4').fill = fill(BRAND.grey900)
  ws.getRow(4).height = 8

  return 5 // next available row
}

// ── Add a section sub-header (blue gradient-like bar) ────────────────────────
const addSectionHeader = (ws, title, startRow, colCount, accentHex = BRAND.indigo) => {
  ws.mergeCells(startRow, 1, startRow, colCount)
  const cell = ws.getCell(startRow, 1)
  cell.value = `  ${title.toUpperCase()}`
  cell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF' + BRAND.white }, italic: false }
  cell.fill  = fill(accentHex)
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(startRow).height = 22
  return startRow + 1
}

// ── Add a KPI summary table (2-column label/value) ──────────────────────────
const addKpiTable = (ws, kpis, startRow, colCount) => {
  kpis.forEach(([label, value], i) => {
    const row = ws.getRow(startRow + i)
    row.height = 20
    const lCell = ws.getCell(startRow + i, 1)
    const vCell = ws.getCell(startRow + i, 2)

    if (i % 2 === 0) {
      lCell.fill = fill(BRAND.grey100)
      vCell.fill = fill(BRAND.grey100)
    } else {
      lCell.fill = fill(BRAND.white)
      vCell.fill = fill(BRAND.white)
    }

    lCell.value = label
    lCell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF' + BRAND.grey700 } }
    lCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    lCell.border = border(BRAND.grey200)

    vCell.value = value
    vCell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF' + BRAND.navy } }
    vCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
    vCell.border = border(BRAND.grey200)
  })
  return startRow + kpis.length + 1 // +1 spacer row
}

// ── Add a styled data table with header row and alternating body rows ─────────
const addDataTable = (ws, headers, rows, startRow, accentHex = BRAND.navy, colCount) => {
  // Header row
  const hRow = ws.getRow(startRow)
  hRow.height = 24
  headers.forEach((h, ci) => {
    const cell = ws.getCell(startRow, ci + 1)
    cell.value = h
    cell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF' + BRAND.white } }
    cell.fill  = fill(accentHex)
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
    cell.border = { ...border(accentHex), bottom: { style: 'medium', color: { argb: 'FF' + BRAND.white } } }
  })

  // Body rows
  rows.forEach((row, ri) => {
    const rObj = ws.getRow(startRow + 1 + ri)
    rObj.height = 18
    const isEven = ri % 2 === 0
    row.forEach((val, ci) => {
      const cell = ws.getCell(startRow + 1 + ri, ci + 1)
      cell.value = val ?? 'N/A'
      cell.fill  = fill(isEven ? BRAND.white : BRAND.grey50)
      cell.font  = { name: 'Calibri', size: 9.5, color: { argb: 'FF' + BRAND.grey700 } }
      cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
      cell.border = border(BRAND.grey200)
    })
  })

  if (rows.length === 0) {
    ws.mergeCells(startRow + 1, 1, startRow + 1, Math.max(headers.length, 1))
    const emptyCell = ws.getCell(startRow + 1, 1)
    emptyCell.value = 'No data available for this period.'
    emptyCell.font  = { name: 'Calibri', italic: true, size: 9.5, color: { argb: 'FF' + BRAND.grey400 } }
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' }
    emptyCell.fill = fill(BRAND.grey50)
  }

  return startRow + 1 + Math.max(rows.length, 1) + 1 // +1 spacer
}

// ── Add a footer bar at a given row ─────────────────────────────────────────
const addFooter = (ws, rowNum, colCount) => {
  ws.mergeCells(rowNum, 1, rowNum, colCount)
  const cell = ws.getCell(rowNum, 1)
  cell.value = 'Confidential – V-MAS Fleet Management System  ·  Generated for internal use only'
  cell.font  = { name: 'Calibri', italic: true, size: 8, color: { argb: 'FF' + BRAND.grey400 } }
  cell.fill  = fill(BRAND.navyDark)
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(rowNum).height = 18
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC EXPORT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export const generateStyledExcel = async (id, {
  vehicles = [],
  fuelLogs = [],
  services = [],
  users = [],
  effReport = null,
  startDate = '',
  endDate = '',
} = {}) => {

  const wb = new ExcelJS.Workbook()
  wb.creator  = 'V-MAS Fleet Management System'
  wb.company  = 'V-MAS'
  wb.created  = new Date()
  wb.modified = new Date()

  const dateRangeLabel = startDate || endDate
    ? `${startDate || 'All time'} → ${endDate || 'Present'}`
    : 'All Dates'

  // ── Apply date filter helpers ────────────────────────────────────────────
  const afterStart = (dateStr) => !startDate || new Date(dateStr) >= new Date(startDate)
  const beforeEnd  = (dateStr) => !endDate   || new Date(dateStr) <= new Date(endDate)
  const inRange    = (dateStr) => afterStart(dateStr) && beforeEnd(dateStr)

  // ── Filtered data slices ─────────────────────────────────────────────────
  const filteredFuel = fuelLogs.filter(f => !f.isDeleted && f.date && inRange(f.date))
  const filteredSvc  = services.filter(s => !s.deleted && s.serviceDate && inRange(s.serviceDate))

  const totalFuelCost = filteredFuel.reduce((s, f) => s + (Number(f.totalCost) || 0), 0)
  const totalSvcCost  = filteredSvc.reduce((s, sv) => s + (Number(sv.serviceCost) || 0), 0)

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helper to build a single-report sheet
  // ═══════════════════════════════════════════════════════════════════════════
  const buildVehicleSheet = () => {
    const ws = wb.addWorksheet('Vehicle Summary', { views: [{ state: 'frozen', ySplit: 6 }] })
    ws.properties.tabColor = { argb: 'FF' + BRAND.navy }
    const COLS = 7
    let row = addCoverBlock(ws, 'Vehicle Summary Report', 'Fleet inventory overview', COLS)
    row = addSectionHeader(ws, 'Fleet Inventory', row, COLS, BRAND.navy)
    const hdrs = ['Reg Number', 'Brand', 'Model', 'Status', 'Mileage (km)', 'Fuel Type', 'Tank Cap (L)']
    const data = vehicles.map(v => [
      v.registrationNumber || 'N/A',
      v.brand  || 'N/A',
      v.model  || 'N/A',
      v.status || 'N/A',
      v.mileage || 0,
      v.fuelType || 'N/A',
      v.fuelCapacity || 0,
    ])
    row = addDataTable(ws, hdrs, data, row, BRAND.navy, COLS)
    // Status colour coding
    ws.eachRow((r, ri) => {
      if (ri <= 6) return
      const statusCell = r.getCell(4)
      const s = String(statusCell.value || '')
      if (s === 'ACTIVE' || s === 'active')      { statusCell.fill = fill(BRAND.greenPale); statusCell.font = { ...statusCell.font, color: { argb: 'FF' + BRAND.green }, bold: true } }
      else if (s === 'INACTIVE' || s === 'inactive') { statusCell.fill = fill(BRAND.redPale);  statusCell.font = { ...statusCell.font, color: { argb: 'FF' + BRAND.red  }, bold: true } }
      else if (s === 'AVAILABLE') { statusCell.fill = fill(BRAND.bluePale); statusCell.font = { ...statusCell.font, color: { argb: 'FF' + BRAND.blue }, bold: true } }
    })
    addFooter(ws, row + 1, COLS)
    ws.columns = [{ width: 18 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 13 }]
  }

  const buildFuelSheet = () => {
    const ws = wb.addWorksheet('Fuel Consumption', { views: [{ state: 'frozen', ySplit: 6 }] })
    ws.properties.tabColor = { argb: 'FF' + BRAND.gold }
    const COLS = 7
    let row = addCoverBlock(ws, 'Fuel Consumption Report', dateRangeLabel, COLS)

    // KPI summary
    row = addSectionHeader(ws, 'Period Summary', row, COLS, BRAND.gold)
    row = addKpiTable(ws, [
      ['Total Fuel Entries', filteredFuel.length],
      ['Total Volume Consumed', `${filteredFuel.reduce((s, f) => s + (f.liters || 0), 0).toFixed(1)} L`],
      ['Total Fuel Cost', fmtCost(totalFuelCost)],
      ['Unique Vehicles', new Set(filteredFuel.map(f => f.vehicleRegNumber)).size],
    ], row, COLS)

    row = addSectionHeader(ws, 'Fuel Log Detail', row, COLS, BRAND.indigo)
    const hdrs = ['Date', 'Vehicle Reg', 'Driver', 'Fuel Type', 'Volume (L)', 'Cost / L', 'Total Cost']
    const data = filteredFuel.map(f => [
      fmtDate(f.date),
      f.vehicleRegNumber  || 'N/A',
      f.driverUsername    || 'N/A',
      f.fuelType          || 'N/A',
      Number(f.liters)    || 0,
      fmtCost(f.costPerLiter),
      fmtCost(f.totalCost),
    ])
    row = addDataTable(ws, hdrs, data, row, BRAND.indigo, COLS)
    addFooter(ws, row + 1, COLS)
    ws.columns = [{ width: 14 }, { width: 16 }, { width: 18 }, { width: 12 }, { width: 13 }, { width: 12 }, { width: 14 }]
  }

  const buildServiceSheet = () => {
    const ws = wb.addWorksheet('Service & Maintenance', { views: [{ state: 'frozen', ySplit: 6 }] })
    ws.properties.tabColor = { argb: 'FF' + BRAND.green }
    const COLS = 6
    let row = addCoverBlock(ws, 'Service & Maintenance Report', dateRangeLabel, COLS)

    row = addSectionHeader(ws, 'Period Summary', row, COLS, BRAND.green)
    row = addKpiTable(ws, [
      ['Total Service Records', filteredSvc.length],
      ['Total Maintenance Cost', fmtCost(totalSvcCost)],
      ['Unique Vehicles Serviced', new Set(filteredSvc.map(s => s.vehicleRegNumber)).size],
    ], row, COLS)

    row = addSectionHeader(ws, 'Service Record Detail', row, COLS, BRAND.teal)
    const hdrs = ['Date', 'Vehicle Reg', 'Service Type', 'Classification', 'Workshop', 'Cost']
    const data = filteredSvc.map(s => [
      fmtDate(s.serviceDate),
      s.vehicleRegNumber      || 'N/A',
      String(s.serviceType || 'N/A'),
      s.serviceClassification || 'N/A',
      s.technicianWorkshop    || 'N/A',
      fmtCost(s.serviceCost),
    ])
    row = addDataTable(ws, hdrs, data, row, BRAND.teal, COLS)
    addFooter(ws, row + 1, COLS)
    ws.columns = [{ width: 14 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 22 }, { width: 14 }]
  }

  const buildUserSheet = () => {
    const ws = wb.addWorksheet('User Directory', { views: [{ state: 'frozen', ySplit: 6 }] })
    ws.properties.tabColor = { argb: 'FF' + BRAND.purple }
    const COLS = 4
    let row = addCoverBlock(ws, 'User Activity Report', 'System user directory', COLS)
    row = addSectionHeader(ws, 'User Roster', row, COLS, BRAND.purple)
    const hdrs = ['Username', 'Email', 'Role', 'Account Status']
    const data = users.map(u => [u.userName || 'N/A', u.email || 'N/A', u.role || 'N/A', u.accountStatus || 'ACTIVE'])
    row = addDataTable(ws, hdrs, data, row, BRAND.purple, COLS)
    // Colour-code roles and statuses
    ws.eachRow((r, ri) => {
      if (ri <= 6) return
      const roleCell   = r.getCell(3)
      const statusCell = r.getCell(4)
      const role = String(roleCell.value || '')
      const stat = String(statusCell.value || '')
      if (role === 'ADMIN')      { roleCell.fill = fill(BRAND.redPale);    roleCell.font = { ...roleCell.font, color: { argb: 'FF' + BRAND.red    }, bold: true } }
      else if (role === 'CONTROLLER') { roleCell.fill = fill(BRAND.indigoPale); roleCell.font = { ...roleCell.font, color: { argb: 'FF' + BRAND.indigo }, bold: true } }
      else if (role === 'DRIVER')     { roleCell.fill = fill(BRAND.greenPale);  roleCell.font = { ...roleCell.font, color: { argb: 'FF' + BRAND.green  }, bold: true } }
      if (stat === 'ACTIVE')     { statusCell.fill = fill(BRAND.greenPale); statusCell.font = { ...statusCell.font, color: { argb: 'FF' + BRAND.green  }, bold: true } }
      else if (stat === 'PENDING')  { statusCell.fill = fill(BRAND.goldPale);  statusCell.font = { ...statusCell.font, color: { argb: 'FF' + BRAND.gold   }, bold: true } }
      else if (stat === 'REJECTED') { statusCell.fill = fill(BRAND.redPale);   statusCell.font = { ...statusCell.font, color: { argb: 'FF' + BRAND.red    }, bold: true } }
    })
    addFooter(ws, row + 1, COLS)
    ws.columns = [{ width: 20 }, { width: 28 }, { width: 16 }, { width: 16 }]
  }

  const buildEfficiencySheet = () => {
    if (!effReport) return
    const ws = wb.addWorksheet('Fuel Efficiency', { views: [{ state: 'frozen', ySplit: 6 }] })
    ws.properties.tabColor = { argb: 'FF' + BRAND.teal }
    const COLS = 8
    let row = addCoverBlock(ws, 'Fuel Efficiency Report', 'Fleet km/L analysis', COLS)

    row = addSectionHeader(ws, 'Fleet-Wide Summary', row, COLS, BRAND.teal)
    row = addKpiTable(ws, [
      ['Fleet Average Efficiency', effReport.fleetAverageEfficiency != null ? `${effReport.fleetAverageEfficiency} km/L` : 'Insufficient Data'],
      ['Total Vehicles Analysed', String(effReport.totalVehicles ?? 0)],
      ['Good Efficiency (≥10 km/L)', String(effReport.goodEfficiencyCount ?? 0)],
      ['Moderate Efficiency (5–9.99 km/L)', String(effReport.moderateEfficiencyCount ?? 0)],
      ['Low Efficiency (<5 km/L)', String(effReport.lowEfficiencyCount ?? 0)],
    ], row, COLS)

    row = addSectionHeader(ws, 'Per-Vehicle Efficiency Breakdown', row, COLS, BRAND.indigo)
    const hdrs = ['Reg Number', 'Latest km/L', 'Avg km/L', 'Status', 'Total Liters', 'Total Cost', 'Cost / km', 'Fill-ups']
    const vRows = (effReport.vehicles || []).map(v => [
      v.vehicleRegNumber  || 'N/A',
      v.latestEfficiency  != null ? Number(v.latestEfficiency.toFixed(2))  : 'N/A',
      v.averageEfficiency != null ? Number(v.averageEfficiency.toFixed(2)) : 'N/A',
      v.efficiencyStatus  || 'N/A',
      v.totalLiters       != null ? `${v.totalLiters} L`  : 'N/A',
      v.totalCost         != null ? fmtCost(v.totalCost)  : 'N/A',
      v.costPerKm         != null ? `Rs. ${v.costPerKm}/km` : 'N/A',
      v.fillUps           ? v.fillUps.length : 0,
    ])
    row = addDataTable(ws, hdrs, vRows, row, BRAND.indigo, COLS)
    // Colour-code efficiency status
    ws.eachRow((r, ri) => {
      if (ri <= row - vRows.length - 2) return
      const sCell = r.getCell(4)
      const s = String(sCell.value || '')
      if (s === 'Good')            { sCell.fill = fill(BRAND.greenPale); sCell.font = { ...sCell.font, color: { argb: 'FF' + BRAND.green }, bold: true } }
      else if (s === 'Moderate')        { sCell.fill = fill(BRAND.goldPale);  sCell.font = { ...sCell.font, color: { argb: 'FF' + BRAND.gold  }, bold: true } }
      else if (s === 'Low Efficiency')  { sCell.fill = fill(BRAND.redPale);   sCell.font = { ...sCell.font, color: { argb: 'FF' + BRAND.red   }, bold: true } }
    })
    addFooter(ws, row + 1, COLS)
    ws.columns = [{ width: 16 }, { width: 14 }, { width: 13 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 13 }, { width: 10 }]
  }

  const buildCostSheet = () => {
    const ws = wb.addWorksheet('Cost Analysis', { views: [{ state: 'frozen', ySplit: 6 }] })
    ws.properties.tabColor = { argb: 'FF' + BRAND.indigo }
    const COLS = 5
    let row = addCoverBlock(ws, 'Cost Analysis Report', dateRangeLabel, COLS)

    row = addSectionHeader(ws, 'Operational Expenses Summary', row, COLS, BRAND.indigo)
    row = addKpiTable(ws, [
      ['Total Fuel Expenditure',           fmtCost(totalFuelCost)],
      ['Total Maintenance Expenditure',     fmtCost(totalSvcCost)],
      ['Grand Total Fleet Operating Cost',  fmtCost(totalFuelCost + totalSvcCost)],
      ['Fuel Cost Share',                   `${totalFuelCost + totalSvcCost > 0 ? ((totalFuelCost / (totalFuelCost + totalSvcCost)) * 100).toFixed(1) : 0}%`],
      ['Maintenance Cost Share',            `${totalFuelCost + totalSvcCost > 0 ? ((totalSvcCost  / (totalFuelCost + totalSvcCost)) * 100).toFixed(1) : 0}%`],
    ], row, COLS)

    // Top Fuel Transactions
    row = addSectionHeader(ws, 'Top Fuel Transactions (Highest Cost)', row, COLS, BRAND.gold)
    const topFuel = [...filteredFuel].sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0)).slice(0, 10)
    row = addDataTable(ws, ['Date', 'Vehicle', 'Driver', 'Volume', 'Total Cost'], topFuel.map(f => [
      fmtDate(f.date),
      f.vehicleRegNumber || 'N/A',
      f.driverUsername   || 'N/A',
      `${f.liters || 0} L`,
      fmtCost(f.totalCost),
    ]), row, BRAND.gold, COLS)

    // Top Service Transactions
    row = addSectionHeader(ws, 'Top Service Transactions (Highest Cost)', row, COLS, BRAND.green)
    const topSvc = [...filteredSvc].sort((a, b) => (Number(b.serviceCost) || 0) - (Number(a.serviceCost) || 0)).slice(0, 10)
    row = addDataTable(ws, ['Date', 'Vehicle', 'Service Type', 'Classification', 'Cost'], topSvc.map(s => [
      fmtDate(s.serviceDate),
      s.vehicleRegNumber      || 'N/A',
      String(s.serviceType    || 'N/A'),
      s.serviceClassification || 'N/A',
      fmtCost(s.serviceCost),
    ]), row, BRAND.green, COLS)

    addFooter(ws, row + 1, COLS)
    ws.columns = [{ width: 14 }, { width: 18 }, { width: 20 }, { width: 18 }, { width: 15 }]
  }

  const buildMasterSheet = () => {
    // Summary overview sheet first
    const ws = wb.addWorksheet('Executive Summary', { views: [{ state: 'frozen', ySplit: 6 }] })
    ws.properties.tabColor = { argb: 'FF' + BRAND.navyDark }
    const COLS = 2
    let row = addCoverBlock(ws, 'Comprehensive Master Report', dateRangeLabel, COLS)

    row = addSectionHeader(ws, 'Fleet Overview', row, COLS, BRAND.navy)
    row = addKpiTable(ws, [
      ['Total Vehicles',            vehicles.length],
      ['Total Fuel Logs',           filteredFuel.length],
      ['Total Service Records',     filteredSvc.length],
      ['Total System Users',        users.length],
      ['Total Fuel Cost',           fmtCost(totalFuelCost)],
      ['Total Maintenance Cost',    fmtCost(totalSvcCost)],
      ['Total Operating Cost',      fmtCost(totalFuelCost + totalSvcCost)],
      ['Total Fuel Volume',         `${filteredFuel.reduce((s, f) => s + (f.liters || 0), 0).toFixed(1)} L`],
    ], row, COLS)

    addFooter(ws, row + 1, COLS)
    ws.columns = [{ width: 30 }, { width: 20 }]

    // Then add all individual sheets
    buildVehicleSheet()
    buildFuelSheet()
    buildServiceSheet()
    buildUserSheet()
    buildEfficiencySheet()
    buildCostSheet()
  }

  // ── Dispatch to correct sheet builder ────────────────────────────────────
  switch (id) {
    case 'vehicle-summary':  buildVehicleSheet();   break
    case 'fuel-report':      buildFuelSheet();      break
    case 'service-report':   buildServiceSheet();   break
    case 'user-report':      buildUserSheet();      break
    case 'fuel-efficiency':  buildEfficiencySheet(); break
    case 'cost-report':      buildCostSheet();      break
    case 'master-report':    buildMasterSheet();    break
    default: break
  }

  // ── Write to buffer and trigger browser download ──────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const reportNames = {
    'vehicle-summary': 'Vehicle-Summary',
    'fuel-report':     'Fuel-Consumption',
    'service-report':  'Service-Maintenance',
    'user-report':     'User-Activity',
    'fuel-efficiency': 'Fuel-Efficiency',
    'cost-report':     'Cost-Analysis',
    'master-report':   'Master-Report',
  }
  link.href     = url
  link.download = `VMAS-${reportNames[id] || id}-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return link.download
}
