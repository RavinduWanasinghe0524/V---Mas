package net.javaguids.ems_backend.controller;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.ServiceIntervalDto;
import net.javaguids.ems_backend.enums.VehicleType;
import net.javaguids.ems_backend.service.ServiceIntervalService;
import net.javaguids.ems_backend.util.ApiResponseUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin("*")
@AllArgsConstructor
@RestController
@RequestMapping("/api/services/intervals")
public class ServiceIntervalController {

    private final ServiceIntervalService serviceIntervalService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    public ResponseEntity<ApiResponse<List<ServiceIntervalDto>>> getAllIntervals() {
        List<ServiceIntervalDto> intervals = serviceIntervalService.getAllIntervals();
        return ApiResponseUtil.success("Service intervals retrieved successfully", intervals, HttpStatus.OK);
    }

    @GetMapping("/vehicle-type/{type}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    public ResponseEntity<ApiResponse<List<ServiceIntervalDto>>> getIntervalsByVehicleType(@PathVariable VehicleType type) {
        List<ServiceIntervalDto> intervals = serviceIntervalService.getIntervalsByVehicleType(type);
        return ApiResponseUtil.success("Service intervals for " + type + " retrieved successfully", intervals, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<ServiceIntervalDto>> updateInterval(@PathVariable Long id, @RequestBody ServiceIntervalDto dto) {
        ServiceIntervalDto updated = serviceIntervalService.updateInterval(id, dto);
        return ApiResponseUtil.success("Service interval updated successfully", updated, HttpStatus.OK);
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<List<ServiceIntervalDto>>> updateIntervalsBulk(@RequestBody List<ServiceIntervalDto> dtos) {
        List<ServiceIntervalDto> updated = serviceIntervalService.updateIntervalsBulk(dtos);
        return ApiResponseUtil.success("Service intervals updated successfully in bulk", updated, HttpStatus.OK);
    }
}
