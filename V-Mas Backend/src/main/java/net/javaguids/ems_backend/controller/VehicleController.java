package net.javaguids.ems_backend.controller;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.VehicleDto;
import net.javaguids.ems_backend.enums.VehicleSatus;
import net.javaguids.ems_backend.service.VehicleService;
import net.javaguids.ems_backend.util.ApiResponseUtil;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;

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

    // POST /api/vehicles/bulk-mileage — Bulk update vehicle mileages
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PostMapping("/bulk-mileage")
    public ResponseEntity<ApiResponse<Object>> updateBulkMileage(
            @RequestBody List<net.javaguids.ems_backend.dto.VehicleMileageUpdateDto> updates,
            @AuthenticationPrincipal UserDetails loggedUser) {
        vehicleService.updateBulkMileage(updates, loggedUser.getUsername());
        return ApiResponseUtil.success("Vehicle mileages updated successfully", null, HttpStatus.OK);
    }


    // GET /api/vehicles — Get all vehicles
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<VehicleDto>>> getAllVehicles() {
        List<VehicleDto> vehicles = vehicleService.getAllVehicles();
        return ApiResponseUtil.success("Vehicles fetched successfully", vehicles, HttpStatus.OK);
    }

    // GET /api/vehicles/deleted — Get all soft-deleted vehicles (Admin & Controller only)
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @GetMapping("/deleted")
    public ResponseEntity<ApiResponse<List<VehicleDto>>> getDeletedVehicles() {
        List<VehicleDto> vehicles = vehicleService.getDeletedVehicles();
        return ApiResponseUtil.success("Deleted vehicles fetched successfully", vehicles, HttpStatus.OK);
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

    // PATCH /api/vehicles/{id}/restore — Restore a soft-deleted vehicle (Admin & Controller only)
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PatchMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<VehicleDto>> restoreVehicle(@PathVariable Long id) {
        VehicleDto restored = vehicleService.restoreVehicle(id);
        return ApiResponseUtil.success("Vehicle restored successfully", restored, HttpStatus.OK);
    }

    // POST /api/vehicles/{id}/document/{docType} — Upload document
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    @PostMapping(value = "/{id}/document/{docType}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VehicleDto>> uploadDocument(
            @PathVariable Long id,
            @PathVariable String docType,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "expiryDate", required = false) String expiryDate) {
        VehicleDto updated = vehicleService.uploadDocument(id, docType, file, expiryDate);
        return ApiResponseUtil.success("Document uploaded successfully", updated, HttpStatus.OK);
    }

    // GET /api/vehicles/{id}/document/{docType} — Download/View document
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER', 'DRIVER')")
    @GetMapping("/{id}/document/{docType}")
    public ResponseEntity<Resource> getDocument(
            @PathVariable Long id,
            @PathVariable String docType) {
        Resource resource = vehicleService.getDocument(id, docType);
        
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
                } else if (lower.endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (lower.endsWith(".avif")) {
                    contentType = "image/avif";
                } else if (lower.endsWith(".svg")) {
                    contentType = "image/svg+xml";
                } else if (lower.endsWith(".bmp")) {
                    contentType = "image/bmp";
                }
            }
        }

        String originalFilename = resource.getFilename();
        if (originalFilename != null && originalFilename.contains("_")) {
            originalFilename = originalFilename.substring(originalFilename.indexOf("_") + 1);
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + originalFilename + "\"")
                .body(resource);
    }
}
