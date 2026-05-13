package net.javaguids.ems_backend.controller;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.NotificationDto;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.util.ApiResponseUtil;
import net.javaguids.ems_backend.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/notifications")
@AllArgsConstructor
public class NotificationController {

    private NotificationService notificationService;

    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getUnreadNotifications() {
        List<NotificationDto> notifications = notificationService.getUnreadNotifications();
        return ApiResponseUtil.success("Unread notifications fetched successfully", notifications, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getAllNotifications() {
        List<NotificationDto> notifications = notificationService.getAllNotifications();
        return ApiResponseUtil.success("All notifications fetched successfully", notifications, HttpStatus.OK);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDto>> markAsRead(@PathVariable Long id) {
        NotificationDto notification = notificationService.markAsRead(id);
        return ApiResponseUtil.success("Notification marked as read", notification, HttpStatus.OK);
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Object>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ApiResponseUtil.success("All notifications marked as read", null, HttpStatus.OK);
    }
}
