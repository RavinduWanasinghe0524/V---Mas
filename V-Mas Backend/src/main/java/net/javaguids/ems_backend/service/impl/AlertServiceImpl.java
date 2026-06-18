package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.DashboardAlertDto;
import net.javaguids.ems_backend.dto.DashboardAlertDto.AlertItem;
import net.javaguids.ems_backend.entity.ServiceRecord;
import net.javaguids.ems_backend.entity.Vehicle;
import net.javaguids.ems_backend.entity.ServiceInterval;
import net.javaguids.ems_backend.repository.ServiceRecordRepository;
import net.javaguids.ems_backend.repository.VehicleRepository;
import net.javaguids.ems_backend.repository.ServiceIntervalRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Builds the dashboard alert payload by checking:
 *  1. Service due mileage — alert when dynamic service interval limit is within 200km or exceeded
 *  2. Document expiry   — alert when insuranceExpiryDate / licenseExpiryDate within 30 days or past
 */
@Slf4j
@Service
@AllArgsConstructor
public class AlertServiceImpl {

    private static final int UPCOMING_THRESHOLD_DAYS = 7;
    private static final int MILEAGE_THRESHOLD_KM = 200; // Warning threshold reduced to 200km

    private final ServiceRecordRepository serviceRecordRepository;
    private final VehicleRepository vehicleRepository;
    private final ServiceIntervalRepository serviceIntervalRepository;

    public DashboardAlertDto getDashboardAlerts() {
        log.info("Building dashboard alerts");

        List<AlertItem> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();

        List<Vehicle> allVehicles = vehicleRepository.findAll();

        // ── 1. Dynamic Service-due alerts ──────────────────────────────────────────────
        for (Vehicle v : allVehicles) {
            if (v.isDeleted()) continue;
            String reg = v.getRegistrationNo();

            // Find all intervals configured for this vehicle's type
            List<ServiceInterval> intervals = serviceIntervalRepository.findByVehicleType(v.getVehicleType());

            for (ServiceInterval interval : intervals) {
                // Find latest active service record for this vehicle and type
                List<ServiceRecord> lastRecords = serviceRecordRepository
                        .findByVehicleRegNumberAndServiceTypeAndDeletedFalseOrderByCurrentMileageKmDesc(
                                reg, interval.getServiceType());

                int lastServiceMileage = 0;
                if (!lastRecords.isEmpty()) {
                    lastServiceMileage = lastRecords.get(0).getCurrentMileageKm();
                }

                int nextDueMileage = lastServiceMileage + interval.getIntervalKm();
                int currentMileage = v.getCurrentMileageKm() != null ? v.getCurrentMileageKm() : 0;
                int remainingKm = nextDueMileage - currentMileage;

                if (remainingKm <= MILEAGE_THRESHOLD_KM) {
                    String severity = remainingKm <= 0 ? "OVERDUE" : "UPCOMING";
                    String title = remainingKm <= 0 ? "Service Overdue" : "Service Milestone Soon";
                    String message = remainingKm <= 0
                            ? String.format("%s was due at %d km (current: %d km, exceeded by %d km)",
                                    interval.getServiceType().name(), nextDueMileage, currentMileage, Math.abs(remainingKm))
                            : String.format("%s due at %d km (current: %d km, %d km remaining)",
                                    interval.getServiceType().name(), nextDueMileage, currentMileage, remainingKm);

                    // Use pseudoDays to sort: overdue first, then upcoming ascending
                    long pseudoDays = remainingKm <= 0 ? -999L + remainingKm : (remainingKm / 10);
                    alerts.add(new AlertItem(severity, "SERVICE_DUE", reg, title, message, pseudoDays));
                }
            }
        }


        // ── 2. Document-expiry alerts ──────────────────────────────────────────
        for (Vehicle v : allVehicles) {
            String reg = v.getRegistrationNo();

            // Insurance expiry
            if (v.getInsuranceExpiryDate() != null) {
                long daysRemaining = ChronoUnit.DAYS.between(today, v.getInsuranceExpiryDate());
                if (daysRemaining <= UPCOMING_THRESHOLD_DAYS) {
                    String severity = daysRemaining < 0 ? "OVERDUE" : "UPCOMING";
                    String title    = daysRemaining < 0 ? "Insurance Expired" : "Insurance Expiring Soon";
                    String message  = daysRemaining < 0
                            ? String.format("Insurance expired %d day(s) ago (expiry: %s)", Math.abs(daysRemaining), v.getInsuranceExpiryDate())
                            : String.format("Insurance expires in %d day(s) on %s", daysRemaining, v.getInsuranceExpiryDate());
                    alerts.add(new AlertItem(severity, "DOCUMENT_EXPIRY", reg, title, message, daysRemaining));
                }
            }

            // License / road-tax expiry
            if (v.getLicenseExpiryDate() != null) {
                long daysRemaining = ChronoUnit.DAYS.between(today, v.getLicenseExpiryDate());
                if (daysRemaining <= UPCOMING_THRESHOLD_DAYS) {
                    String severity = daysRemaining < 0 ? "OVERDUE" : "UPCOMING";
                    String title    = daysRemaining < 0 ? "License Expired" : "License Expiring Soon";
                    String message  = daysRemaining < 0
                            ? String.format("Vehicle license expired %d day(s) ago (expiry: %s)", Math.abs(daysRemaining), v.getLicenseExpiryDate())
                            : String.format("Vehicle license expires in %d day(s) on %s", daysRemaining, v.getLicenseExpiryDate());
                    alerts.add(new AlertItem(severity, "DOCUMENT_EXPIRY", reg, title, message, daysRemaining));
                }
            }
        }

        // Sort: OVERDUE first (most negative daysRemaining first), then UPCOMING ascending
        alerts.sort(Comparator.comparingLong(AlertItem::getDaysRemaining));

        long overdueCount  = alerts.stream().filter(a -> "OVERDUE".equals(a.getSeverity())).count();
        long upcomingCount = alerts.stream().filter(a -> "UPCOMING".equals(a.getSeverity())).count();

        log.info("Dashboard alerts: {} overdue, {} upcoming", overdueCount, upcomingCount);

        return new DashboardAlertDto(
                alerts.size(),
                (int) overdueCount,
                (int) upcomingCount,
                alerts
        );
    }
}
