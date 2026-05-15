package net.javaguids.ems_backend.controller;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.DashboardAlertDto;
import net.javaguids.ems_backend.service.impl.AlertServiceImpl;
import net.javaguids.ems_backend.util.ApiResponseUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Provides dashboard alert data for Admin and Controller roles.
 *
 * GET /api/alerts/dashboard
 *   → Returns all service-due and document-expiry alerts
 *     (overdue in red, upcoming in yellow, within 30 days)
 */
@Slf4j
@CrossOrigin("*")
@AllArgsConstructor
@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertServiceImpl alertService;

    /**
     * GET /api/alerts/dashboard
     * Returns service-due alerts (next service date within 30 days / overdue)
     * and document-expiry alerts (insurance/license within 30 days / expired).
     * Accessible by ADMIN and CONTROLLER roles.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardAlertDto>> getDashboardAlerts() {
        log.info("GET /api/alerts/dashboard - Fetching dashboard alerts");
        DashboardAlertDto alerts = alertService.getDashboardAlerts();
        return ApiResponseUtil.success("Dashboard alerts retrieved successfully", alerts, HttpStatus.OK);
    }
}
