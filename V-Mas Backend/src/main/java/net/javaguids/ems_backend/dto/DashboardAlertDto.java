package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Dashboard alert response — returned by GET /api/alerts/dashboard.
 * Contains service-due alerts and document-expiry alerts.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DashboardAlertDto {

    /** Total number of alerts (overdue + upcoming) */
    private int totalAlerts;

    /** Number of red/overdue alerts */
    private int overdueCount;

    /** Number of yellow/upcoming alerts */
    private int upcomingCount;

    /** All individual alerts, sorted: OVERDUE first, then UPCOMING */
    private List<AlertItem> alerts;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlertItem {

        /** "OVERDUE" or "UPCOMING" */
        private String severity;

        /** "SERVICE_DUE" or "DOCUMENT_EXPIRY" */
        private String type;

        /** Vehicle registration number */
        private String vehicleRegNumber;

        /** Human-readable alert title */
        private String title;

        /** Human-readable detail message */
        private String message;

        /**
         * Days until the event:
         *  negative → already past (overdue)
         *  positive → days remaining
         */
        private long daysRemaining;
    }
}
