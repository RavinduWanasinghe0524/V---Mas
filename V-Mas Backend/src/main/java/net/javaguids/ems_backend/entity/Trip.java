package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import net.javaguids.ems_backend.enums.TripStatus;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "trips")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Username of the driver this trip is assigned to. */
    @Column(nullable = false)
    private String driverUsername;

    /** Registration number of the vehicle assigned for this trip. */
    @Column(nullable = false)
    private String vehicleRegNumber;

    /** Where the trip starts. */
    @Column(nullable = true)
    private String origin;

    /** Where the trip ends. */
    @Column(nullable = false)
    private String destination;

    /** Optional free-text purpose / description of the trip. */
    @Column(nullable = true, columnDefinition = "TEXT")
    private String purpose;

    /** When the trip is scheduled to take place. */
    @Column(nullable = true)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50, columnDefinition = "VARCHAR(50) DEFAULT 'ASSIGNED'")
    private TripStatus status = TripStatus.ASSIGNED;

    /** Username of the controller/admin who assigned the trip. */
    @Column(nullable = true)
    private String assignedBy;

    /** Reason supplied by the driver when declining the trip. */
    @Column(nullable = true, columnDefinition = "TEXT")
    private String declineReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** When the driver started the trip (null until started). */
    @Column(nullable = true)
    private LocalDateTime startedAt;

    /** When the driver responded (started or declined). */
    @Column(nullable = true)
    private LocalDateTime respondedAt;

    /** When the trip was completed (null until completed). */
    @Column(nullable = true)
    private LocalDateTime completedAt;

    @Column(name = "updated_at", nullable = true)
    private LocalDateTime updatedAt;

    // ── Soft-delete fields ────────────────────────────────────────────────

    /** True when the record has been soft-deleted (not physically removed). */
    @Column(name = "is_deleted", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean deleted = false;

    /** Username of the person who performed the soft-delete. */
    @Column(name = "deleted_by", length = 100)
    private String deletedBy;

    /** Timestamp of when the soft-delete was performed. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
