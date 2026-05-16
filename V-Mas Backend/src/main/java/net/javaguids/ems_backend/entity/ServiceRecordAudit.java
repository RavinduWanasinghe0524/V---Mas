package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Stores a single audit entry for a service record edit.
 * Each time a service record is updated, one row is inserted here
 * recording who made the change, when, and exactly which fields changed.
 */
@Entity
@Table(name = "service_record_audits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRecordAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID of the service record this audit entry belongs to */
    @Column(name = "service_record_id", nullable = false)
    private Long serviceRecordId;

    /** Username of the person who made the edit */
    @Column(name = "changed_by", length = 100)
    private String changedBy;

    /** Timestamp when the edit was made */
    @CreationTimestamp
    @Column(name = "changed_at", updatable = false)
    private LocalDateTime changedAt;

    /**
     * JSON array string describing every field that changed.
     * Format: [{"field":"Service Cost","from":"Rs. 5,000","to":"Rs. 6,500"}, ...]
     */
    @Column(name = "changed_fields", columnDefinition = "TEXT")
    private String changedFields;
}
