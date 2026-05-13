package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.NotificationDto;
import java.util.List;

public interface NotificationService {
    void createNotification(String target, String message, String type);
    List<NotificationDto> getUnreadNotifications();
    List<NotificationDto> getAllNotifications();
    NotificationDto markAsRead(Long id);
    void markAllAsRead();
}
