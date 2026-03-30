package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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

    @Column(name = "current_mileage", nullable = false)
    private Double mileage;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = true)
    private String driverUsername;

    // ── Audit fields ────────────────────────────────────────────────────────

    /** True if this log has ever been edited after creation. */
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isUpdated = false;

    /** Timestamp of the most recent update (null if never updated). */
    @Column(nullable = true)
    private LocalDateTime updatedAt;

    /** True if this log has been soft-deleted by a controller/admin. */
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isDeleted = false;

    /** Timestamp of when this log was soft-deleted (null if not deleted). */
    @Column(nullable = true)
    private LocalDateTime deletedAt;
}
