package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import net.javaguids.ems_backend.enums.FuelTypes;
import net.javaguids.ems_backend.enums.VehicleSatus;
import net.javaguids.ems_backend.enums.VehicleType;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_name", nullable = true, length = 150)
    private String vehicleName;

    @Column(name = "chassis_no", nullable = true, length = 150)
    private String chassisNo;

    @Column(name = "engine_no", nullable = true, length = 150)
    private String engineNo;

    @Column(name = "registration_no", nullable = false, unique = true, length = 50)
    private String registrationNo;

    @Column(name = "manufacturer", length = 100)
    private String manufacturer;

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "year")
    private Integer year;

    @Column(name = "current_mileage_km")
    private Integer currentMileageKm;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "driver_id", nullable = true)
    private User driver;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "status",nullable = false)
    private VehicleSatus status;

    @Column(name = "fuel_type")
    private FuelTypes fuelType;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 50)
    private VehicleType vehicleType = VehicleType.CAR;


    /** Optional — vehicle insurance expiry date, used for dashboard alerts */
    @Column(name = "insurance_expiry_date", nullable = true)
    private LocalDate insuranceExpiryDate;

    /** Optional — vehicle license/road-tax expiry date, used for dashboard alerts */
    @Column(name = "license_expiry_date", nullable = true)
    private LocalDate licenseExpiryDate;

    @Column(name = "insurance_document_path", length = 500, nullable = true)
    private String insuranceDocumentPath;

    @Column(name = "license_document_path", length = 500, nullable = true)
    private String licenseDocumentPath;

    @Column(name = "registration_book_path", length = 500, nullable = true)
    private String registrationBookPath;

    // ── Soft-delete fields ────────────────────────────────────────────────

    /** True when the record has been soft-deleted (not physically removed). */
    @Column(name = "is_deleted", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean deleted = false;

    /** Username of the person who performed the soft-delete. */
    @Column(name = "deleted_by", length = 100)
    private String deletedBy;

    /** Timestamp of when the soft-delete was performed. */
    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;
}
