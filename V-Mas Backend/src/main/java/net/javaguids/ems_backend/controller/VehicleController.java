package net.javaguids.ems_backend.controller;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.VehicleDto;
import net.javaguids.ems_backend.enums.VehicleSatus;
import net.javaguids.ems_backend.service.VehicleService;
import net.javaguids.ems_backend.util.ApiResponseUtil;

import org.apache.coyote.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;

@AllArgsConstructor
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    // POST /api/vehicles — Create a new vehicle
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PostMapping
    public ResponseEntity<ApiResponse<VehicleDto>> createVehicle(@RequestBody VehicleDto vehicleDto) {
        vehicleDto.setStatus(VehicleSatus.AVAILABLE);
        VehicleDto saved = vehicleService.createVehicle(vehicleDto);
        return ApiResponseUtil.success("Vehicle created successfully", saved, HttpStatus.CREATED);
    }

    // GET /api/vehicles — Get all vehicles
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<VehicleDto>>> getAllVehicles() {
        List<VehicleDto> vehicles = vehicleService.getAllVehicles();
        return ApiResponseUtil.success("Vehicles fetched successfully", vehicles, HttpStatus.OK);
    }

    // GET /api/vehicles/{id} — Get vehicle by ID
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VehicleDto>> getVehicleById(@PathVariable Long id) {
        VehicleDto vehicle = vehicleService.getVehicleById(id);
        return ApiResponseUtil.success("Vehicle fetched successfully", vehicle, HttpStatus.OK);
    }

    // PUT /api/vehicles/{id} — Update vehicle
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<VehicleDto>> updateVehicle(
            @PathVariable Long id,
            @RequestBody VehicleDto vehicleDto,
            @AuthenticationPrincipal UserDetails loggedUser) {
        VehicleDto updated = vehicleService.updateVehicle(id, vehicleDto, loggedUser.getUsername());
        return ApiResponseUtil.success("Vehicle updated successfully", updated, HttpStatus.OK);
    }

    // DELETE /api/vehicles/{id} — Delete vehicle
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteVehicle(@PathVariable Long id) {
        vehicleService.deleteVehicle(id);
        return ApiResponseUtil.success("Vehicle deleted successfully", null, HttpStatus.OK);
    }

    // GET /api/vehicles/assigned - Get assigned vehicles to logged user
    @GetMapping("/assigned")
    @PreAuthorize("hasAnyRole('DRIVER')")
    public ResponseEntity<ApiResponse<VehicleDto>> getAssignedVehicles(@AuthenticationPrincipal UserDetails loggedUser) {
        VehicleDto assignedVehicle = vehicleService.getAssignedVehicle(loggedUser.getUsername());
        return ApiResponseUtil.success("Vehicle fetched successfully", assignedVehicle, HttpStatus.OK);
    }

    // PATCH /api/vehicles/{vehicleId}/driver/{driverId} - Assign driver to a vehicle
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PatchMapping("/{vehicleId}/driver/{driverId}")
    public ResponseEntity<ApiResponse<VehicleDto>> assignDriver(@PathVariable Long vehicleId, @PathVariable Long driverId) throws BadRequestException {
        VehicleDto assignedVehicle = vehicleService.assignDriver(vehicleId, driverId);
        return ApiResponseUtil.success("Driver assigned successfully", assignedVehicle, HttpStatus.OK);
    }

    // PATCH /api/vehicles/{vehicleId}/unassign - Remove driver from a vehicle
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PatchMapping("/{vehicleId}/unassign")
    public ResponseEntity<ApiResponse<VehicleDto>> unassignDriver(@PathVariable Long vehicleId) {
        VehicleDto updated = vehicleService.unassignDriver(vehicleId);
        return ApiResponseUtil.success("Driver unassigned successfully", updated, HttpStatus.OK);
    }
}
