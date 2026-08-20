package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import net.javaguids.ems_backend.enums.ApprovalStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "fuel_logs")
public class FuelLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String vehicleRegNumber;

    @Column(nullable = false)
    private String fuelType;

    @Column(nullable = false)
    private Double liters;

    @Column(nullable = false)
    private Double costPerLiter;

    @Column(nullable = false)
    private Double totalCost;

    @Column(nullable = false)
    private Double mileage;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = true)
    private String driverUsername;

    /** Optional reference to the specific trip / job this fuel log was submitted for */
    @Column(name = "trip_id", nullable = true)
    private Long tripId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50, columnDefinition = "VARCHAR(50) DEFAULT 'APPROVED'")
    private ApprovalStatus status = ApprovalStatus.APPROVED;

    // ── Audit fields ────────────────────────────────────────────────────────

    /** Username of who uploaded/created this fuel log. */
    @Column(nullable = true)
    private String uploadedBy;

    /** True if this log has ever been edited after creation. */
    @Column(nullable = true, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isUpdated = false;

    /** Timestamp of the most recent update (null if never updated). */
    @Column(nullable = true)
    private LocalDateTime updatedAt;

    /** Username of who last updated this fuel log. */
    @Column(nullable = true)
    private String updatedBy;

    /** True if this log has been soft-deleted by a controller/admin. */
    @Column(nullable = true, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isDeleted = false;

    /** Timestamp of when this log was soft-deleted (null if not deleted). */
    @Column(nullable = true)
    private LocalDateTime deletedAt;
}
