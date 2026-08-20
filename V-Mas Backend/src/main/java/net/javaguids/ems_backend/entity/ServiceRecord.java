package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import net.javaguids.ems_backend.enums.ServiceType;
import net.javaguids.ems_backend.enums.ApprovalStatus;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "service_records")
public class ServiceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_reg_number", nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT ''")
    private String vehicleRegNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 100)
    private ServiceType serviceType;

    /**
     * Only required when serviceType == OTHER.
     * The frontend should show a text input when "Other" is selected.
     */
    @Column(name = "service_type_detail", length = 255)
    private String serviceTypeDetail;

    @Column(name = "service_date", nullable = false)
    private LocalDate serviceDate;

    @Column(name = "current_mileage_km", nullable = false)
    private Integer currentMileageKm;

    @Column(name = "service_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal serviceCost;

    @Column(name = "technician_workshop", nullable = false, length = 200)
    private String technicianWorkshop;

    /** Optional — next scheduled service date */
    @Column(name = "next_service_due")
    private LocalDate nextServiceDue;

    /** Optional — next scheduled service mileage */
    @Column(name = "next_service_mileage_km")
    private Integer nextServiceMileageKm;

    /** Optional — additional notes */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Username of the person who created this record — auto-set by the service layer */
    @Column(name = "created_by", length = 100, updatable = false)
    private String createdBy;

    /** Optional — stored file path / URL of the uploaded bill attachment */
    @Column(name = "attachment_path", length = 500)
    private String attachmentPath;

    /** Optional — list of parts replaced */
    @Column(name = "parts_replaced", columnDefinition = "TEXT")
    private String partsReplaced;

    /** Classification: ROUTINE or AD_HOC */
    @Column(name = "service_classification", nullable = false, length = 50, columnDefinition = "VARCHAR(50) DEFAULT 'ROUTINE'")
    private String serviceClassification = "ROUTINE";

    /** Optional reference to the specific trip / job this service record was submitted for */
    @Column(name = "trip_id", nullable = true)
    private Long tripId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50, columnDefinition = "VARCHAR(50) DEFAULT 'APPROVED'")
    private ApprovalStatus status = ApprovalStatus.APPROVED;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

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
