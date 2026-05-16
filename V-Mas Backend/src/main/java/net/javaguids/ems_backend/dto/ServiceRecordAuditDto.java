package net.javaguids.ems_backend.dto;

import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO for a single service record audit entry returned by the history endpoint.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRecordAuditDto {

    private Long id;
    private Long serviceRecordId;
    private String changedBy;
    private LocalDateTime changedAt;

    /**
     * JSON array string: [{"field":"Service Cost","from":"Rs. 5,000","to":"Rs. 6,500"}, ...]
     * The frontend parses this to render the field-level diff.
     */
    private String changedFields;
}
