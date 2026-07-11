package net.javaguids.ems_backend.controller;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.TripDto;
import net.javaguids.ems_backend.service.TripService;
import net.javaguids.ems_backend.util.ApiResponseUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Slf4j
@CrossOrigin("*")
@AllArgsConstructor
@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final TripService tripService;

    // ==================== CONTROLLER / ADMIN ENDPOINTS ====================

    /**
     * POST /api/trips
     * Controller/Admin assigns a trip (and vehicle) to a driver.
     */
    @PreAuthorize("hasAnyRole('CONTROLLER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<TripDto>> assignTrip(
            @RequestBody TripDto tripDto,
            Principal principal) {
        String assignedBy = principal.getName();
        log.info("POST /api/trips - '{}' assigning trip to driver '{}'", assignedBy, tripDto.getDriverUsername());
        TripDto saved = tripService.assignTrip(tripDto, assignedBy);
        return ApiResponseUtil.success("Trip assigned successfully", saved, HttpStatus.CREATED);
    }

    /**
     * GET /api/trips
     * Controller/Admin fetches every trip in the system.
     */
    @PreAuthorize("hasAnyRole('CONTROLLER', 'ADMIN')")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TripDto>>> getAllTrips() {
        log.info("GET /api/trips - fetching all trips");
        return ApiResponseUtil.success("Trips retrieved successfully", tripService.getAllTrips(), HttpStatus.OK);
    }

    /**
     * PUT /api/trips/{id}
     * Controller/Admin updates an assigned trip's details.
     */
    @PreAuthorize("hasAnyRole('CONTROLLER', 'ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TripDto>> updateTrip(
            @PathVariable Long id,
            @RequestBody TripDto tripDto) {
        log.info("PUT /api/trips/{} - updating trip", id);
        return ApiResponseUtil.success("Trip updated successfully", tripService.updateTrip(id, tripDto), HttpStatus.OK);
    }

    /**
     * DELETE /api/trips/{id}
     * Controller/Admin cancels a trip.
     */
    @PreAuthorize("hasAnyRole('CONTROLLER', 'ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelTrip(@PathVariable Long id) {
        log.info("DELETE /api/trips/{} - cancelling trip", id);
        tripService.cancelTrip(id);
        return ApiResponseUtil.success("Trip cancelled successfully", null, HttpStatus.OK);
    }

    @PreAuthorize("hasAnyRole('CONTROLLER', 'ADMIN')")
    @DeleteMapping("/{id}/delete")
    public ResponseEntity<ApiResponse<Void>> deleteTrip(@PathVariable Long id, Principal principal) {
        String deletedBy = principal.getName();
        log.info("DELETE /api/trips/{}/delete - soft-deleting trip by '{}'", id, deletedBy);
        tripService.deleteTrip(id, deletedBy);
        return ApiResponseUtil.success("Trip deleted successfully", null, HttpStatus.OK);
    }

    @PreAuthorize("hasAnyRole('CONTROLLER', 'ADMIN')")
    @PatchMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreTrip(@PathVariable Long id) {
        log.info("PATCH /api/trips/{}/restore - restoring trip", id);
        tripService.restoreTrip(id);
        return ApiResponseUtil.success("Trip restored successfully", null, HttpStatus.OK);
    }

    @PreAuthorize("hasAnyRole('CONTROLLER', 'ADMIN')")
    @GetMapping("/deleted")
    public ResponseEntity<ApiResponse<List<TripDto>>> getDeletedTrips() {
        log.info("GET /api/trips/deleted - fetching deleted trips");
        return ApiResponseUtil.success("Deleted trips retrieved successfully", tripService.getDeletedTrips(), HttpStatus.OK);
    }

    // ==================== SHARED ====================

    /**
     * GET /api/trips/{id}
     * Fetch a single trip by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TripDto>> getTripById(@PathVariable Long id) {
        log.info("GET /api/trips/{} - fetching trip", id);
        return ApiResponseUtil.success("Trip retrieved successfully", tripService.getTripById(id), HttpStatus.OK);
    }

    // ==================== DRIVER ENDPOINTS ====================

    /**
     * GET /api/trips/my
     * Driver fetches only their own assigned trips.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<TripDto>>> getMyTrips(Principal principal) {
        String driverUsername = principal.getName();
        log.info("GET /api/trips/my - driver '{}' fetching their trips", driverUsername);
        return ApiResponseUtil.success("Trips retrieved successfully",
                tripService.getMyTrips(driverUsername), HttpStatus.OK);
    }

    /**
     * PATCH /api/trips/{id}/start
     * Driver accepts and starts an assigned trip.
     */
    @PatchMapping("/{id}/start")
    public ResponseEntity<ApiResponse<TripDto>> startTrip(@PathVariable Long id, Principal principal) {
        String driverUsername = principal.getName();
        log.info("PATCH /api/trips/{}/start - driver '{}' starting trip", id, driverUsername);
        return ApiResponseUtil.success("Trip started successfully",
                tripService.startTrip(id, driverUsername), HttpStatus.OK);
    }

    /**
     * PATCH /api/trips/{id}/decline
     * Driver declines an assigned trip, optionally with a reason.
     */
    @PatchMapping("/{id}/decline")
    public ResponseEntity<ApiResponse<TripDto>> declineTrip(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        String driverUsername = principal.getName();
        String reason = body != null ? body.get("reason") : null;
        log.info("PATCH /api/trips/{}/decline - driver '{}' declining trip", id, driverUsername);
        return ApiResponseUtil.success("Trip declined successfully",
                tripService.declineTrip(id, driverUsername, reason), HttpStatus.OK);
    }

    /**
     * PATCH /api/trips/{id}/complete
     * Driver marks a started trip as completed.
     */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<TripDto>> completeTrip(@PathVariable Long id, Principal principal) {
        String driverUsername = principal.getName();
        log.info("PATCH /api/trips/{}/complete - driver '{}' completing trip", id, driverUsername);
        return ApiResponseUtil.success("Trip completed successfully",
                tripService.completeTrip(id, driverUsername), HttpStatus.OK);
    }
}
