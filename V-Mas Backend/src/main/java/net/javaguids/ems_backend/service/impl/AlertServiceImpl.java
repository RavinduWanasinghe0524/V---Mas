package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.DashboardAlertDto;
import net.javaguids.ems_backend.dto.DashboardAlertDto.AlertItem;
import net.javaguids.ems_backend.entity.ServiceRecord;
import net.javaguids.ems_backend.entity.Vehicle;
import net.javaguids.ems_backend.repository.ServiceRecordRepository;
import net.javaguids.ems_backend.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Builds the dashboard alert payload by checking:
 *  1. Service due dates — alert when nextServiceDue is within 30 days or already past
 *  2. Document expiry   — alert when insuranceExpiryDate / licenseExpiryDate within 30 days or past
 */
@Slf4j
@Service
@AllArgsConstructor
public class AlertServiceImpl {

    private static final int UPCOMING_THRESHOLD_DAYS = 30;

    private final ServiceRecordRepository serviceRecordRepository;
    private final VehicleRepository vehicleRepository;

    public DashboardAlertDto getDashboardAlerts() {
        log.info("Building dashboard alerts");

        List<AlertItem> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();

        // ── 1. Service-due alerts ──────────────────────────────────────────────
        List<ServiceRecord> dueRecords = serviceRecordRepository.findLatestServiceRecordWithDueDatePerVehicle();
        for (ServiceRecord sr : dueRecords) {
            String reg = sr.getVehicleRegNumber();
            Vehicle v = vehicleRepository.findAll().stream() // Ideally findByRegistrationNo
                    .filter(veh -> veh.getRegistrationNo().equals(reg))
                    .findFirst().orElse(null);

            boolean alerted = false;

            // Date-based check
            if (sr.getNextServiceDue() != null) {
                LocalDate dueDate = sr.getNextServiceDue();
                long daysRemaining = ChronoUnit.DAYS.between(today, dueDate);

                if (daysRemaining <= UPCOMING_THRESHOLD_DAYS) {
                    String severity = daysRemaining < 0 ? "OVERDUE" : "UPCOMING";
                    String title = daysRemaining < 0 ? "Service Overdue" : "Service Due Soon";
                    String message = daysRemaining < 0
                            ? String.format("Service was due %d day(s) ago (scheduled: %s)", Math.abs(daysRemaining), dueDate)
                            : String.format("Service due in %d day(s) on %s", daysRemaining, dueDate);

                    alerts.add(new AlertItem(severity, "SERVICE_DUE", reg, title, message, daysRemaining));
                    alerted = true;
                }
            }

            // Mileage-based check (if not already alerted by date or to provide more context)
            if (!alerted && sr.getNextServiceMileageKm() != null && v != null && v.getCurrentMileageKm() != null) {
                int nextMileage = sr.getNextServiceMileageKm();
                int currentMileage = v.getCurrentMileageKm();
                int remainingKm = nextMileage - currentMileage;

                if (remainingKm <= 500) {
                    String severity = remainingKm < 0 ? "OVERDUE" : "UPCOMING";
                    String title = remainingKm < 0 ? "Mileage Limit Exceeded" : "Service Milestone Soon";
                    String message = remainingKm < 0
                            ? String.format("Service was due at %d km (current: %d km, exceeded by %d km)", nextMileage, currentMileage, Math.abs(remainingKm))
                            : String.format("Service due at %d km (current: %d km, %d km remaining)", nextMileage, currentMileage, remainingKm);

                    // Use a large negative number for overdue mileage so it sorts to top, or a small positive for upcoming
                    long pseudoDays = remainingKm < 0 ? -999 : (remainingKm / 10); // rough conversion for sorting
                    alerts.add(new AlertItem(severity, "SERVICE_DUE", reg, title, message, pseudoDays));
                }
            }
        }

        // ── 2. Document-expiry alerts ──────────────────────────────────────────
        List<Vehicle> allVehicles = vehicleRepository.findAll();
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
