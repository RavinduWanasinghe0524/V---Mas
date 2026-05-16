package net.javaguids.ems_backend.dto;

import lombok.*;
import net.javaguids.ems_backend.enums.ServiceType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRecordDto {

    private Long id;

    private String vehicleRegNumber;

    private ServiceType serviceType;

    /**
     * Required by the frontend when serviceType == OTHER.
     * Backend validates: if serviceType is OTHER, this must not be blank.
     */
    private String serviceTypeDetail;

    private LocalDate serviceDate;
    private Integer currentMileageKm;
    private BigDecimal serviceCost;
    private String technicianWorkshop;

    private LocalDate nextServiceDue;   // optional
    private Integer nextServiceMileageKm; // optional
    private String description;         // optional
    private String attachmentPath;      // optional — path/URL of bill attachment

    /** Auto-populated by backend — username of whoever created this record */
    private String createdBy;
    private LocalDateTime createdAt;

    // ── Soft-delete fields ────────────────────────────────────────────────
    private boolean deleted;
    private String deletedBy;
    private LocalDateTime deletedAt;
}
