package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import net.javaguids.ems_backend.enums.TripStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TripDto {

    private Long id;
    private String driverUsername;
    /** Display name of the assigned driver (populated on read, ignored on write). */
    private String driverName;
    private String vehicleRegNumber;
    private String origin;
    private String destination;
    private String purpose;
    private LocalDate scheduledDate;
    private TripStatus status;
    private String assignedBy;
    private String declineReason;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime respondedAt;
    private LocalDateTime completedAt;
    private LocalDateTime updatedAt;

    // Soft-delete fields
    private boolean deleted;
    private String deletedBy;
    private LocalDateTime deletedAt;
}
