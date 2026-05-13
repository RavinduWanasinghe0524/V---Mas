package net.javaguids.ems_backend.mapper;

import net.javaguids.ems_backend.dto.NotificationDto;
import net.javaguids.ems_backend.entity.Notification;

public class NotificationMapper {
    public static NotificationDto mapToNotificationDto(Notification notification) {
        return new NotificationDto(
                notification.getId(),
                notification.getVehicleRegNumber(),
                notification.getMessage(),
                notification.getType(),
                notification.getCreatedAt(),
                notification.getIsRead()
        );
    }
}
