package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.NotificationDto;
import net.javaguids.ems_backend.entity.Notification;
import net.javaguids.ems_backend.mapper.NotificationMapper;
import net.javaguids.ems_backend.repository.NotificationRepository;
import net.javaguids.ems_backend.service.NotificationService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private NotificationRepository notificationRepository;

    @Override
    public void createNotification(String target, String message, String type) {
        Notification notification = new Notification(target, message, type);
        notificationRepository.save(notification);
    }

    @Override
    public List<NotificationDto> getUnreadNotifications() {
        return notificationRepository.findByIsReadFalseOrderByCreatedAtDesc().stream()
                .map(NotificationMapper::mapToNotificationDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationDto> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(NotificationMapper::mapToNotificationDto)
                .collect(Collectors.toList());
    }

    @Override
    public NotificationDto markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setIsRead(true);
        Notification savedNotification = notificationRepository.save(notification);
        return NotificationMapper.mapToNotificationDto(savedNotification);
    }

    @Override
    public void markAllAsRead() {
        List<Notification> unreadNotifications = notificationRepository.findByIsReadFalseOrderByCreatedAtDesc();
        unreadNotifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    @Override
    public void resolveServiceAlerts(String vehicleRegNumber, String serviceType) {
        String target = "VEH-" + vehicleRegNumber;
        List<Notification> notifications = notificationRepository.findByVehicleRegNumber(target);
        List<Notification> directNotifications = notificationRepository.findByVehicleRegNumber(vehicleRegNumber);
        
        // Also look for service notifications created by the backend (SERVICE-REGNUMBER-SERVICETYPE)
        String serviceTarget = "SERVICE-" + vehicleRegNumber + "-" + serviceType;
        List<Notification> serviceNotifications = notificationRepository.findByVehicleRegNumber(serviceTarget);
        
        List<Notification> toUpdate = new java.util.ArrayList<>();
        
        for (Notification n : notifications) {
            if (!n.getIsRead() && (n.getType().equals("SERVICE_DUE") || n.getType().equals("OVERDUE_SERVICE"))) {
                if (n.getMessage().toUpperCase().contains(serviceType.toUpperCase()) || 
                    n.getMessage().toUpperCase().contains(serviceType.replace("_", " ").toUpperCase())) {
                    n.setIsRead(true);
                    toUpdate.add(n);
                }
            }
        }
        for (Notification n : directNotifications) {
            if (!n.getIsRead() && (n.getType().equals("SERVICE_DUE") || n.getType().equals("OVERDUE_SERVICE"))) {
                if (n.getMessage().toUpperCase().contains(serviceType.toUpperCase()) || 
                    n.getMessage().toUpperCase().contains(serviceType.replace("_", " ").toUpperCase())) {
                    n.setIsRead(true);
                    toUpdate.add(n);
                }
            }
        }
        for (Notification n : serviceNotifications) {
            if (!n.getIsRead()) {
                n.setIsRead(true);
                toUpdate.add(n);
            }
        }
        
        if (!toUpdate.isEmpty()) {
            notificationRepository.saveAll(toUpdate);
        }
    }
}
