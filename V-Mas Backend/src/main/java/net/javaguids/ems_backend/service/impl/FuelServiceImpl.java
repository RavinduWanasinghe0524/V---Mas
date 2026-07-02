package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.*;
import net.javaguids.ems_backend.dto.FuelEfficiencyDto.FillUpRecord;
import net.javaguids.ems_backend.dto.FuelEfficiencyDto.VehicleEfficiencyRecord;
import net.javaguids.ems_backend.entity.FuelLog;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.repository.FuelLogRepository;
import net.javaguids.ems_backend.service.FuelService;
import net.javaguids.ems_backend.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@AllArgsConstructor
public class FuelServiceImpl implements FuelService {

    private FuelLogRepository fuelLogRepository;
    private NotificationService notificationService;

    // ==================== DRIVER-SCOPED METHODS ====================

    @Override
    @Transactional
    public FuelLogDto addFuelLog(FuelLogDto fuelLogDto, String driverUsername) {
        log.info("Driver '{}' adding fuel log for vehicle: {}", driverUsername, fuelLogDto.getVehicleRegNumber());

        // Auto-calculate totalCost if not provided
        if (fuelLogDto.getTotalCost() == null || fuelLogDto.getTotalCost() == 0) {
            double calculatedCost = fuelLogDto.getLiters() * fuelLogDto.getCostPerLiter();
            fuelLogDto.setTotalCost(calculatedCost);
            log.info("Auto-calculated totalCost: {}", calculatedCost);
        }

        // Convert DTO to Entity
        FuelLog fuelLog = new FuelLog();
        fuelLog.setVehicleRegNumber(fuelLogDto.getVehicleRegNumber());
        fuelLog.setFuelType(fuelLogDto.getFuelType());
        fuelLog.setLiters(fuelLogDto.getLiters());
        fuelLog.setCostPerLiter(fuelLogDto.getCostPerLiter());
        fuelLog.setTotalCost(fuelLogDto.getTotalCost());
        fuelLog.setMileage(fuelLogDto.getMileage());
        fuelLog.setDate(fuelLogDto.getDate() != null ? fuelLogDto.getDate() : LocalDate.now());
        fuelLog.setDriverUsername(driverUsername); // ← tie this log to the driver
        fuelLog.setUploadedBy(driverUsername); // ← track who uploaded it

        // Save the fuel log
        FuelLog savedLog = fuelLogRepository.save(fuelLog);
        log.info("Fuel log saved with ID: {}", savedLog.getId());

        // Calculate efficiency and trigger notification if needed
        checkAndTriggerLowEfficiencyNotification(savedLog, driverUsername);

        return mapToDto(savedLog);
    }

    @Override
    public List<FuelLogDto> getMyFuelLogs(String driverUsername) {
        log.info("Driver '{}' fetching their own fuel logs", driverUsername);
        return fuelLogRepository.findByDriverUsernameOrLegacy(driverUsername)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public FuelLogDto getMyFuelLogById(Long id, String driverUsername) {
        log.info("Driver '{}' fetching fuel log id: {}", driverUsername, id);
        FuelLog fuelLog = fuelLogRepository.findByIdAndDriverUsernameOrLegacy(id, driverUsername)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Fuel log not found with id: " + id + " for driver: " + driverUsername));
        return mapToDto(fuelLog);
    }

    @Override
    @Transactional
    public FuelLogDto updateMyFuelLog(Long id, FuelLogDto fuelLogDto, String driverUsername) {
        log.info("Driver '{}' updating fuel log id: {}", driverUsername, id);

        FuelLog fuelLog = fuelLogRepository.findByIdAndDriverUsernameOrLegacy(id, driverUsername)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Fuel log not found with id: " + id + " for driver: " + driverUsername));

        // Update fields
        fuelLog.setVehicleRegNumber(fuelLogDto.getVehicleRegNumber());
        fuelLog.setFuelType(fuelLogDto.getFuelType());
        fuelLog.setLiters(fuelLogDto.getLiters());
        fuelLog.setCostPerLiter(fuelLogDto.getCostPerLiter());

        // Recalculate totalCost
        double totalCost = (fuelLogDto.getTotalCost() != null && fuelLogDto.getTotalCost() != 0)
                ? fuelLogDto.getTotalCost()
                : fuelLogDto.getLiters() * fuelLogDto.getCostPerLiter();
        fuelLog.setTotalCost(totalCost);
        fuelLog.setMileage(fuelLogDto.getMileage());
        if (fuelLogDto.getDate() != null) {
            fuelLog.setDate(fuelLogDto.getDate());
        }

        // Mark as updated
        fuelLog.setIsUpdated(true);
        fuelLog.setUpdatedAt(LocalDateTime.now());
        fuelLog.setUpdatedBy(driverUsername);

        FuelLog updated = fuelLogRepository.save(fuelLog);
        
        notificationService.createNotification(
                "VEH-" + fuelLog.getVehicleRegNumber(),
                "Fuel log for vehicle " + fuelLog.getVehicleRegNumber() + " was updated by " + driverUsername,
                "FUEL_UPDATE"
        );
        
        log.info("Fuel log {} updated by driver '{}'", id, driverUsername);
        return mapToDto(updated);
    }

    // ==================== ADMIN / SHARED ANALYTICS ====================

    @Override
    public FuelSummaryDto getCurrentMonthSummary() {
        log.info("Fetching current month summary");
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        Double totalDiesel = fuelLogRepository.getTotalLitersByFuelType("Diesel", month, year)
                + fuelLogRepository.getTotalLitersByFuelType("Super Diesel", month, year);
        Double totalPetrol = fuelLogRepository.getTotalLitersByFuelType("Petrol", month, year)
                + fuelLogRepository.getTotalLitersByFuelType("Super Petrol", month, year);
        Double totalCost = fuelLogRepository.getTotalCostForMonth(month, year);
        Double totalVolume = totalDiesel + totalPetrol;

        log.info("Summary - Diesel: {}, Petrol: {}, Total: {}, Cost: {}",
                 totalDiesel, totalPetrol, totalVolume, totalCost);

        return new FuelSummaryDto(totalDiesel, totalPetrol, totalVolume, totalCost);
    }

    @Override
    public FuelChartDto getMonthlyChartData() {
        log.info("Fetching monthly chart data");
        LocalDate now = LocalDate.now();
        int currentYear = now.getYear();

        List<Object[]> results = fuelLogRepository.getMonthlyConsumptionByFuelType(currentYear);

        // Initialize data structures
        List<String> months = new ArrayList<>();
        Map<String, List<Double>> data = new HashMap<>();
        data.put("Diesel", new ArrayList<>(Collections.nCopies(12, 0.0)));
        data.put("Petrol", new ArrayList<>(Collections.nCopies(12, 0.0)));

        // Generate month labels
        for (int i = 1; i <= 12; i++) {
            months.add(Month.of(i).name().substring(0, 3));
        }

        // Populate data from query results
        for (Object[] result : results) {
            Integer monthNum = (Integer) result[0];
            String rawFuelType = (String) result[1];
            Double totalLiters = ((Number) result[2]).doubleValue();

            String fuelType = rawFuelType != null ? rawFuelType.trim() : "";
            if (fuelType.equalsIgnoreCase("Petrol") || fuelType.equalsIgnoreCase("Super Petrol")) fuelType = "Petrol";
            else if (fuelType.equalsIgnoreCase("Diesel") || fuelType.equalsIgnoreCase("Super Diesel")) fuelType = "Diesel";

            if (data.containsKey(fuelType)) {
                double existing = data.get(fuelType).get(monthNum - 1);
                data.get(fuelType).set(monthNum - 1, existing + totalLiters);
            }
        }

        log.info("Chart data prepared for {} months", months.size());
        return new FuelChartDto(months, data);
    }

    @Override
    public List<VehicleFuelStatsDto> getAllVehicleStats() {
        log.info("Fetching all vehicle statistics");
        List<String> allVehicles = fuelLogRepository.findAllDistinctVehicleRegNumbers();
        List<VehicleFuelStatsDto> statsList = new ArrayList<>();

        for (String vehicleRegNumber : allVehicles) {
            List<FuelLog> logs = fuelLogRepository.findByVehicleRegNumberOrderByDateDesc(vehicleRegNumber);

            if (logs.isEmpty()) {
                continue;
            }

            Double fuelEfficiency = calculateFuelEfficiency(logs);
            Double totalSpending = fuelLogRepository.getTotalSpendingByVehicle(vehicleRegNumber);
            String efficiencyStatus = determineEfficiencyStatus(fuelEfficiency);

            VehicleFuelStatsDto stats = new VehicleFuelStatsDto(
                vehicleRegNumber,
                fuelEfficiency,
                totalSpending,
                efficiencyStatus
            );

            statsList.add(stats);
            log.info("Stats for vehicle {}: Efficiency={}, Spending={}, Status={}",
                     vehicleRegNumber, fuelEfficiency, totalSpending, efficiencyStatus);
        }

        return statsList;
    }

    @Override
    public FuelLogDto getFuelLogById(Long id) {
        log.info("Fetching fuel log by ID: {}", id);
        FuelLog fuelLog = fuelLogRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("FuelLog not found with id: " + id));
        return mapToDto(fuelLog);
    }

    @Override
    public List<FuelLogDto> getFuelLogsByVehicle(String vehicleRegNumber) {
        log.info("Fetching fuel logs for vehicle: {}", vehicleRegNumber);
        List<FuelLog> logs = fuelLogRepository.findByVehicleRegNumberOrderByDateDesc(vehicleRegNumber);
        return logs.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ==================== CONTROLLER / ADMIN CRUD ====================

    @Override
    public List<FuelLogDto> getAllFuelLogs() {
        log.info("Controller fetching all active fuel logs");
        return fuelLogRepository.findAll()
                .stream()
                .filter(f -> f.getIsDeleted() == null || !f.getIsDeleted())
                .sorted(Comparator.comparing((FuelLog f) -> f.getDate()).reversed())
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FuelLogDto addFuelLogByController(FuelLogDto fuelLogDto) {
        log.info("Controller adding fuel log for vehicle: {}", fuelLogDto.getVehicleRegNumber());

        // Auto-calculate totalCost if not provided
        if (fuelLogDto.getTotalCost() == null || fuelLogDto.getTotalCost() == 0) {
            double calculatedCost = fuelLogDto.getLiters() * fuelLogDto.getCostPerLiter();
            fuelLogDto.setTotalCost(calculatedCost);
            log.info("Auto-calculated totalCost: {}", calculatedCost);
        }

        FuelLog fuelLog = new FuelLog();
        fuelLog.setVehicleRegNumber(fuelLogDto.getVehicleRegNumber());
        fuelLog.setFuelType(fuelLogDto.getFuelType());
        fuelLog.setLiters(fuelLogDto.getLiters());
        fuelLog.setCostPerLiter(fuelLogDto.getCostPerLiter());
        fuelLog.setTotalCost(fuelLogDto.getTotalCost());
        fuelLog.setMileage(fuelLogDto.getMileage());
        fuelLog.setDate(fuelLogDto.getDate() != null ? fuelLogDto.getDate() : LocalDate.now());
        // driverUsername may be supplied in the DTO (optional for controller)
        fuelLog.setDriverUsername(fuelLogDto.getDriverUsername());
        fuelLog.setUploadedBy(fuelLogDto.getUploadedBy()); // ← track who uploaded it

        FuelLog savedLog = fuelLogRepository.save(fuelLog);
        log.info("Controller saved fuel log with ID: {}", savedLog.getId());
        return mapToDto(savedLog);
    }

    @Override
    @Transactional
    public FuelLogDto updateFuelLogByController(Long id, FuelLogDto fuelLogDto) {
        log.info("Controller updating fuel log id: {}", id);

        FuelLog fuelLog = fuelLogRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("FuelLog not found with id: " + id));

        fuelLog.setVehicleRegNumber(fuelLogDto.getVehicleRegNumber());
        fuelLog.setFuelType(fuelLogDto.getFuelType());
        fuelLog.setLiters(fuelLogDto.getLiters());
        fuelLog.setCostPerLiter(fuelLogDto.getCostPerLiter());

        double totalCost = (fuelLogDto.getTotalCost() != null && fuelLogDto.getTotalCost() != 0)
                ? fuelLogDto.getTotalCost()
                : fuelLogDto.getLiters() * fuelLogDto.getCostPerLiter();
        fuelLog.setTotalCost(totalCost);
        fuelLog.setMileage(fuelLogDto.getMileage());
        if (fuelLogDto.getDate() != null) {
            fuelLog.setDate(fuelLogDto.getDate());
        }
        if (fuelLogDto.getDriverUsername() != null) {
            fuelLog.setDriverUsername(fuelLogDto.getDriverUsername());
        }

        // Mark as updated and track who updated it
        fuelLog.setIsUpdated(true);
        fuelLog.setUpdatedAt(LocalDateTime.now());
        fuelLog.setUpdatedBy(fuelLogDto.getUpdatedBy());

        FuelLog updated = fuelLogRepository.save(fuelLog);
        
        notificationService.createNotification(
                "VEH-" + fuelLog.getVehicleRegNumber(),
                "Fuel log for vehicle " + fuelLog.getVehicleRegNumber() + " was updated by Controller " + fuelLogDto.getUpdatedBy(),
                "FUEL_UPDATE"
        );
        
        log.info("Fuel log {} updated by controller", id);
        return mapToDto(updated);
    }

    @Override
    @Transactional
    public void deleteFuelLog(Long id) {
        log.info("Controller soft-deleting fuel log id: {}", id);
        FuelLog fuelLog = fuelLogRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("FuelLog not found with id: " + id));
        // Soft-delete: mark as deleted instead of removing the row
        fuelLog.setIsDeleted(true);
        fuelLog.setDeletedAt(LocalDateTime.now());
        fuelLogRepository.save(fuelLog);
        log.info("Fuel log {} soft-deleted by controller", id);
    }

    @Override
    @Transactional
    public FuelLogDto restoreFuelLog(Long id) {
        log.info("Controller restoring fuel log id: {}", id);
        FuelLog fuelLog = fuelLogRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("FuelLog not found with id: " + id));
        fuelLog.setIsDeleted(false);
        fuelLog.setDeletedAt(null);
        FuelLog restored = fuelLogRepository.save(fuelLog);
        log.info("Fuel log {} restored successfully", id);
        return mapToDto(restored);
    }

    @Override
    public List<FuelLogDto> getDeletedFuelLogs() {
        log.info("Fetching all soft-deleted fuel logs");
        return fuelLogRepository.findAllDeleted()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ==================== EFFICIENCY REPORT ====================

    @Override
    public FuelEfficiencyDto getFuelEfficiencyReport() {
        log.info("Building fuel efficiency report for all vehicles");

        List<String> vehicleRegNumbers = fuelLogRepository.findAllDistinctActiveVehicleRegNumbers();
        List<VehicleEfficiencyRecord> vehicleRecords = new ArrayList<>();

        double fleetTotalEfficiency = 0.0;
        int fleetValidCount = 0;
        int goodCount = 0, moderateCount = 0, lowCount = 0;

        for (String reg : vehicleRegNumbers) {
            // Fetch logs oldest-first so we can iterate sequentially
            List<FuelLog> logs = fuelLogRepository.findByVehicleRegNumberOrderByDateAscIdAsc(reg);
            if (logs.isEmpty()) continue;

            List<FillUpRecord> fillUps = new ArrayList<>();
            double totalLiters = 0.0;
            double totalCost = 0.0;
            double totalKmDriven = 0.0;
            double sumEfficiency = 0.0;
            int efficiencyCount = 0;
            Double latestEfficiency = null;

            for (int i = 0; i < logs.size(); i++) {
                FuelLog log_ = logs.get(i);
                Double kmDriven = null;
                Double efficiency = null;

                if (i > 0) {
                    FuelLog prev = logs.get(i - 1);
                    if (log_.getMileage() != null && prev.getMileage() != null
                            && log_.getMileage() > prev.getMileage()
                            && log_.getLiters() != null && log_.getLiters() > 0) {
                        kmDriven = log_.getMileage() - prev.getMileage();
                        efficiency = Math.round((kmDriven / log_.getLiters()) * 100.0) / 100.0;
                        sumEfficiency += efficiency;
                        efficiencyCount++;
                        latestEfficiency = efficiency; // keeps updating → final value is the latest
                        totalKmDriven += kmDriven;
                    }
                }

                double logLiters = log_.getLiters() != null ? log_.getLiters() : 0.0;
                double logCost   = log_.getTotalCost() != null ? log_.getTotalCost() : 0.0;
                totalLiters += logLiters;
                totalCost   += logCost;

                fillUps.add(new FillUpRecord(
                    log_.getDate(),
                    log_.getMileage(),
                    logLiters,
                    logCost,
                    efficiency,
                    kmDriven
                ));
            }

            Double averageEfficiency = efficiencyCount > 0
                    ? Math.round((sumEfficiency / efficiencyCount) * 100.0) / 100.0
                    : null;

            Double costPerKm = (totalKmDriven > 0 && totalCost > 0)
                    ? Math.round((totalCost / totalKmDriven) * 100.0) / 100.0
                    : null;

            String status = determineEfficiencyStatus(averageEfficiency);

            // Fleet-wide aggregation
            if (averageEfficiency != null) {
                fleetTotalEfficiency += averageEfficiency;
                fleetValidCount++;
                if ("Good".equals(status))               goodCount++;
                else if ("Moderate".equals(status))      moderateCount++;
                else if ("Low Efficiency".equals(status)) lowCount++;
            }

            vehicleRecords.add(new VehicleEfficiencyRecord(
                reg, latestEfficiency, averageEfficiency, status,
                Math.round(totalLiters * 100.0) / 100.0,
                Math.round(totalCost * 100.0) / 100.0,
                costPerKm,
                fillUps
            ));
        }

        Double fleetAverage = fleetValidCount > 0
                ? Math.round((fleetTotalEfficiency / fleetValidCount) * 100.0) / 100.0
                : null;

        log.info("Efficiency report: {} vehicles, fleet avg={} km/L, good={}, moderate={}, low={}",
                 vehicleRecords.size(), fleetAverage, goodCount, moderateCount, lowCount);

        return new FuelEfficiencyDto(
                fleetAverage,
                vehicleRecords.size(),
                goodCount,
                moderateCount,
                lowCount,
                vehicleRecords
        );
    }

    // ==================== PRIVATE HELPER METHODS ====================


    /**
     * Calculate fuel efficiency (km/L) for a vehicle
     * Formula: (Current Mileage - Previous Mileage) / Liters
     */
    private Double calculateFuelEfficiency(List<FuelLog> logs) {
        if (logs.size() < 2) {
            log.info("Insufficient data for efficiency calculation (only {} log(s))", logs.size());
            return null;
        }

        FuelLog currentLog = logs.get(0);
        FuelLog previousLog = logs.get(1);

        double mileageDifference = currentLog.getMileage() - previousLog.getMileage();
        double litersConsumed = currentLog.getLiters();

        if (litersConsumed <= 0) {
            log.warn("Invalid liters consumed: {}", litersConsumed);
            return null;
        }

        double efficiency = mileageDifference / litersConsumed;
        log.info("Calculated efficiency: {} km/L", efficiency);
        return Math.round(efficiency * 100.0) / 100.0;
    }

    /**
     * Determine efficiency status based on km/L value
     */
    private String determineEfficiencyStatus(Double efficiency) {
        if (efficiency == null) {
            return "Insufficient Data";
        } else if (efficiency < 5.0) {
            return "Low Efficiency";
        } else if (efficiency >= 5.0 && efficiency < 10.0) {
            return "Moderate";
        } else {
            return "Good";
        }
    }

    /**
     * Check efficiency and trigger notification if below threshold
     * Scoped to driver's own previous log for accuracy
     */
    private void checkAndTriggerLowEfficiencyNotification(FuelLog currentLog, String driverUsername) {
        log.info("Checking efficiency for notification trigger");

        List<FuelLog> previousLogs = fuelLogRepository.findPreviousLogByDriver(
            driverUsername,
            currentLog.getVehicleRegNumber(),
            currentLog.getDate()
        );

        if (previousLogs.isEmpty()) {
            log.info("No previous log found for efficiency calculation");
            return;
        }

        FuelLog previousLog = previousLogs.get(0);
        double mileageDifference = currentLog.getMileage() - previousLog.getMileage();
        double litersConsumed = currentLog.getLiters();

        if (litersConsumed <= 0) {
            return;
        }

        double efficiency = mileageDifference / litersConsumed;
        log.info("Efficiency calculated: {} km/L", efficiency);

        // Trigger notification if efficiency is below threshold
        if (efficiency < 5.0) {
            String message = String.format(
                "Low Efficiency Alert: Vehicle %s has fuel efficiency of %.2f km/L (below 5 km/L threshold) - reported by driver %s",
                currentLog.getVehicleRegNumber(),
                efficiency,
                driverUsername
            );

            notificationService.createNotification(
                currentLog.getVehicleRegNumber(),
                message,
                "LOW_EFFICIENCY"
            );
            log.warn("LOW EFFICIENCY NOTIFICATION CREATED: {}", message);
        }
    }

    /**
     * Convert FuelLog entity to DTO
     */
    private FuelLogDto mapToDto(FuelLog fuelLog) {
        FuelLogDto dto = new FuelLogDto();
        dto.setId(fuelLog.getId());
        dto.setVehicleRegNumber(fuelLog.getVehicleRegNumber());
        dto.setFuelType(fuelLog.getFuelType());
        dto.setLiters(fuelLog.getLiters());
        dto.setCostPerLiter(fuelLog.getCostPerLiter());
        dto.setTotalCost(fuelLog.getTotalCost());
        dto.setMileage(fuelLog.getMileage());
        dto.setDate(fuelLog.getDate());
        dto.setDriverUsername(fuelLog.getDriverUsername());
        // Audit fields
        dto.setUploadedBy(fuelLog.getUploadedBy());
        dto.setIsUpdated(fuelLog.getIsUpdated() != null && fuelLog.getIsUpdated());
        dto.setUpdatedAt(fuelLog.getUpdatedAt());
        dto.setUpdatedBy(fuelLog.getUpdatedBy());
        dto.setIsDeleted(fuelLog.getIsDeleted() != null && fuelLog.getIsDeleted());
        dto.setDeletedAt(fuelLog.getDeletedAt());
        return dto;
    }
}
