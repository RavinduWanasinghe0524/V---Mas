package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private Long id;
    private String vehicleRegNumber;
    private String message;
    private String type;
    private LocalDateTime createdAt;
    private Boolean isRead;
}
