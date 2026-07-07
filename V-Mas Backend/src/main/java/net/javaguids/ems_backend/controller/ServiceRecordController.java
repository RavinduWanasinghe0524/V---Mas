package net.javaguids.ems_backend.controller;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.ServiceFilterRequest;
import net.javaguids.ems_backend.dto.ServiceRecordDto;
import net.javaguids.ems_backend.service.ServiceRecordService;
import net.javaguids.ems_backend.util.ApiResponseUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import net.javaguids.ems_backend.dto.ServiceRecordAuditDto;
import net.javaguids.ems_backend.dto.ServiceRecordStatsDto;
import net.javaguids.ems_backend.dto.ServiceIntervalDto;
import net.javaguids.ems_backend.enums.VehicleType;
import net.javaguids.ems_backend.service.ServiceIntervalService;

import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/services")
@PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
public class ServiceRecordController {

    private final ServiceRecordService serviceRecordService;
    private final ServiceIntervalService serviceIntervalService;

    // POST /api/services — Add new service record (ADMIN, CONTROLLER, or DRIVER for their own vehicle)
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    @PostMapping
    public ResponseEntity<ApiResponse<ServiceRecordDto>> createServiceRecord(
            @RequestBody ServiceRecordDto serviceRecordDto) {
        ServiceRecordDto saved = serviceRecordService.createServiceRecord(serviceRecordDto);
        return ApiResponseUtil.success("Service record created successfully", saved, HttpStatus.CREATED);
    }

    // GET /api/services — Get all service records (DRIVER can view all previous service records)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceRecordDto>>> getAllServiceRecords() {
        List<ServiceRecordDto> records = serviceRecordService.getAllServiceRecords();
        return ApiResponseUtil.success("Service records fetched successfully", records, HttpStatus.OK);
    }

    // GET /api/services/{id} — Get service record by ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceRecordDto>> getServiceRecordById(@PathVariable Long id) {
        ServiceRecordDto record = serviceRecordService.getServiceRecordById(id);
        return ApiResponseUtil.success("Service record fetched successfully", record, HttpStatus.OK);
    }

    // PUT /api/services/{id} — Update service record (DRIVER may edit only their own records)
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceRecordDto>> updateServiceRecord(
            @PathVariable Long id,
            @RequestBody ServiceRecordDto serviceRecordDto) {
        ServiceRecordDto updated = serviceRecordService.updateServiceRecord(id, serviceRecordDto);
        return ApiResponseUtil.success("Service record updated successfully", updated, HttpStatus.OK);
    }

    // DELETE /api/services/{id} — Delete service record
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteServiceRecord(@PathVariable Long id) {
        serviceRecordService.deleteServiceRecord(id);
        return ApiResponseUtil.success("Service record deleted successfully", null, HttpStatus.OK);
    }

    // POST /api/services/filter — Filter service records
    // All filter fields are optional; only non-null values are applied
    @PostMapping("/filter")
    public ResponseEntity<ApiResponse<List<ServiceRecordDto>>> filterServiceRecords(
            @RequestBody ServiceFilterRequest filterRequest) {
        List<ServiceRecordDto> records = serviceRecordService.filterServiceRecords(filterRequest);
        return ApiResponseUtil.success("Service records filtered successfully", records, HttpStatus.OK);
    }

    // GET /api/services/vehicle/{vehicleRegNumber} — Get all services for a specific vehicle
    @GetMapping("/vehicle/{vehicleRegNumber}")
    public ResponseEntity<ApiResponse<List<ServiceRecordDto>>> getServiceRecordsByVehicle(
            @PathVariable String vehicleRegNumber) {
        List<ServiceRecordDto> records = serviceRecordService.getServiceRecordsByVehicle(vehicleRegNumber);
        return ApiResponseUtil.success("Service records for vehicle fetched successfully", records, HttpStatus.OK);
    }

    // GET /api/services/stats — Get summary statistics (DRIVER receives stats for their vehicle only)
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<ServiceRecordStatsDto>> getServiceStats(Authentication authentication) {
        boolean isDriver = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DRIVER"));
        ServiceRecordStatsDto stats = (isDriver && authentication != null)
                ? serviceRecordService.getServiceStatsForDriver(authentication.getName())
                : serviceRecordService.getServiceStats();
        return ApiResponseUtil.success("Service stats fetched successfully", stats, HttpStatus.OK);
    }

    // GET /api/services/upcoming — Get upcoming services within 30 days
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<ServiceRecordDto>>> getUpcomingServices() {
        List<ServiceRecordDto> records = serviceRecordService.getUpcomingServices();
        return ApiResponseUtil.success("Upcoming services fetched successfully", records, HttpStatus.OK);
    }

    // GET /api/services/recent — Get the 5 most recent service records
    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<ServiceRecordDto>>> getRecentServices() {
        List<ServiceRecordDto> records = serviceRecordService.getRecentServices();
        return ApiResponseUtil.success("Recent services fetched successfully", records, HttpStatus.OK);
    }

    // POST /api/services/{id}/attachment — Upload a bill or document for a service record
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    @PostMapping(value = "/{id}/attachment", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ServiceRecordDto>> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        ServiceRecordDto updated = serviceRecordService.uploadAttachment(id, file);
        return ApiResponseUtil.success("Attachment uploaded successfully", updated, HttpStatus.OK);
    }

    // GET /api/services/deleted — Get all soft-deleted service records (Admin & Controller only)
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @GetMapping("/deleted")
    public ResponseEntity<ApiResponse<List<ServiceRecordDto>>> getDeletedServiceRecords() {
        List<ServiceRecordDto> records = serviceRecordService.getDeletedServiceRecords();
        return ApiResponseUtil.success("Deleted service records fetched successfully", records, HttpStatus.OK);
    }

    // PATCH /api/services/{id}/restore — Restore a soft-deleted record back to active (Admin & Controller only)
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PatchMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<ServiceRecordDto>> restoreServiceRecord(@PathVariable Long id) {
        ServiceRecordDto restored = serviceRecordService.restoreServiceRecord(id);
        return ApiResponseUtil.success("Service record restored successfully", restored, HttpStatus.OK);
    }

    // GET /api/services/{id}/history — Get the full edit audit trail for a service record
    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<ServiceRecordAuditDto>>> getServiceHistory(@PathVariable Long id) {
        List<ServiceRecordAuditDto> history = serviceRecordService.getServiceHistory(id);
        return ApiResponseUtil.success("Service record history fetched successfully", history, HttpStatus.OK);
    }

    // GET /api/services/{id}/attachment — Download or view the attached bill/receipt
    @GetMapping("/{id}/attachment")
    public ResponseEntity<org.springframework.core.io.Resource> getAttachment(@PathVariable Long id) {
        org.springframework.core.io.Resource resource = serviceRecordService.getAttachment(id);
        String contentType = "application/octet-stream";
        try {
            String probed = java.nio.file.Files.probeContentType(java.nio.file.Paths.get(resource.getFile().getAbsolutePath()));
            if (probed != null) {
                contentType = probed;
            }
        } catch (Exception e) {
            // Fallback for non-filesystem resources (e.g. S3 resources)
            String filename = resource.getFilename();
            if (filename != null) {
                String lower = filename.toLowerCase();
                if (lower.endsWith(".pdf")) {
                    contentType = "application/pdf";
                } else if (lower.endsWith(".png")) {
                    contentType = "image/png";
                } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (lower.endsWith(".gif")) {
                    contentType = "image/gif";
                }
            }
        }

        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    // ── Service Intervals Endpoints (moved here to resolve routing clash) ──

    @GetMapping("/intervals")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    public ResponseEntity<ApiResponse<List<ServiceIntervalDto>>> getAllIntervals() {
        List<ServiceIntervalDto> intervals = serviceIntervalService.getAllIntervals();
        return ApiResponseUtil.success("Service intervals retrieved successfully", intervals, HttpStatus.OK);
    }

    @GetMapping("/intervals/vehicle-type/{type}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    public ResponseEntity<ApiResponse<List<ServiceIntervalDto>>> getIntervalsByVehicleType(@PathVariable VehicleType type) {
        List<ServiceIntervalDto> intervals = serviceIntervalService.getIntervalsByVehicleType(type);
        return ApiResponseUtil.success("Service intervals for " + type + " retrieved successfully", intervals, HttpStatus.OK);
    }

    @PutMapping("/intervals/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<ServiceIntervalDto>> updateInterval(@PathVariable Long id, @RequestBody ServiceIntervalDto dto) {
        ServiceIntervalDto updated = serviceIntervalService.updateInterval(id, dto);
        return ApiResponseUtil.success("Service interval updated successfully", updated, HttpStatus.OK);
    }

    @PutMapping("/intervals")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<List<ServiceIntervalDto>>> updateIntervalsBulk(@RequestBody List<ServiceIntervalDto> dtos) {
        List<ServiceIntervalDto> updated = serviceIntervalService.updateIntervalsBulk(dtos);
        return ApiResponseUtil.success("Service intervals updated successfully in bulk", updated, HttpStatus.OK);
    }
}
