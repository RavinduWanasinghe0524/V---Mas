package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.TripDto;
import net.javaguids.ems_backend.entity.Trip;
import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.enums.Role;
import net.javaguids.ems_backend.enums.TripStatus;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.mapper.TripMapper;
import net.javaguids.ems_backend.repository.TripRepository;
import net.javaguids.ems_backend.repository.UserRepository;
import net.javaguids.ems_backend.repository.VehicleRepository;
import net.javaguids.ems_backend.service.NotificationService;
import net.javaguids.ems_backend.service.SmsService;
import net.javaguids.ems_backend.service.TripService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@AllArgsConstructor
public class TripServiceImpl implements TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final NotificationService notificationService;
    private final SmsService smsService;

    // ==================== CONTROLLER / ADMIN ====================

    @Override
    @Transactional
    public TripDto assignTrip(TripDto tripDto, String assignedByUsername) {
        if (tripDto.getDriverUsername() == null || tripDto.getDriverUsername().isBlank()) {
            throw new IllegalArgumentException("A driver must be selected for the trip");
        }
        if (tripDto.getVehicleRegNumber() == null || tripDto.getVehicleRegNumber().isBlank()) {
            throw new IllegalArgumentException("A vehicle must be selected for the trip");
        }
        if (tripDto.getDestination() == null || tripDto.getDestination().isBlank()) {
            throw new IllegalArgumentException("A destination is required for the trip");
        }

        // Validate the driver exists and actually is a driver
        User driver = userRepository.findByUserName(tripDto.getDriverUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Driver not found: " + tripDto.getDriverUsername()));
        if (driver.getRole() != Role.DRIVER) {
            throw new IllegalArgumentException("Trips can only be assigned to drivers");
        }

        // Validate the vehicle exists
        vehicleRepository.findByRegistrationNo(tripDto.getVehicleRegNumber())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vehicle not found: " + tripDto.getVehicleRegNumber()));

        Trip trip = TripMapper.mapToTrip(tripDto);
        trip.setStatus(TripStatus.ASSIGNED);
        trip.setAssignedBy(assignedByUsername);
        Trip saved = tripRepository.save(trip);

        log.info("Controller '{}' assigned trip {} (vehicle {}) to driver '{}'",
                assignedByUsername, saved.getId(), saved.getVehicleRegNumber(), saved.getDriverUsername());

        notificationService.createNotification(
                saved.getDriverUsername(),
                "New trip assigned to " + saved.getDestination() + " with vehicle " + saved.getVehicleRegNumber(),
                "TRIP_ASSIGNED");

        // Send SMS to the driver's mobile phone
        TripDto savedDto = toEnrichedDto(saved);
        smsService.sendTripAssignedSms(driver.getPhoneNumber(), savedDto);

        return savedDto;
    }

    @Override
    public List<TripDto> getAllTrips() {
        return tripRepository.findByDeletedFalseOrderByCreatedAtDesc().stream()
                .map(this::toEnrichedDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TripDto updateTrip(Long id, TripDto tripDto) {
        Trip trip = findTripOrThrow(id);
        if (trip.getStatus() == TripStatus.COMPLETED || trip.getStatus() == TripStatus.CANCELLED) {
            throw new IllegalStateException("A completed or cancelled trip cannot be edited");
        }

        if (tripDto.getDriverUsername() != null && !tripDto.getDriverUsername().isBlank()) {
            User driver = userRepository.findByUserName(tripDto.getDriverUsername())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Driver not found: " + tripDto.getDriverUsername()));
            if (driver.getRole() != Role.DRIVER) {
                throw new IllegalArgumentException("Trips can only be assigned to drivers");
            }
            trip.setDriverUsername(tripDto.getDriverUsername());
        }
        if (tripDto.getVehicleRegNumber() != null && !tripDto.getVehicleRegNumber().isBlank()) {
            vehicleRepository.findByRegistrationNo(tripDto.getVehicleRegNumber())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Vehicle not found: " + tripDto.getVehicleRegNumber()));
            trip.setVehicleRegNumber(tripDto.getVehicleRegNumber());
        }
        if (tripDto.getOrigin() != null) trip.setOrigin(tripDto.getOrigin());
        if (tripDto.getDestination() != null && !tripDto.getDestination().isBlank()) {
            trip.setDestination(tripDto.getDestination());
        }
        if (tripDto.getPurpose() != null) trip.setPurpose(tripDto.getPurpose());
        if (tripDto.getScheduledDate() != null) trip.setScheduledDate(tripDto.getScheduledDate());
        trip.setUpdatedAt(LocalDateTime.now());

        Trip saved = tripRepository.save(trip);
        return toEnrichedDto(saved);
    }

    @Override
    @Transactional
    public void cancelTrip(Long id) {
        Trip trip = findTripOrThrow(id);
        trip.setStatus(TripStatus.CANCELLED);
        trip.setUpdatedAt(LocalDateTime.now());
        tripRepository.save(trip);
        log.info("Trip {} cancelled", id);

        notificationService.createNotification(
                trip.getDriverUsername(),
                "Trip to " + trip.getDestination() + " was cancelled",
                "TRIP_CANCELLED");
    }

    // ==================== SHARED ====================

    @Override
    public TripDto getTripById(Long id) {
        return toEnrichedDto(findTripOrThrow(id));
    }

    // ==================== DRIVER ====================

    @Override
    public List<TripDto> getMyTrips(String driverUsername) {
        return tripRepository.findByDriverUsernameAndDeletedFalseOrderByCreatedAtDesc(driverUsername).stream()
                .map(this::toEnrichedDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TripDto startTrip(Long id, String driverUsername) {
        Trip trip = findOwnedTripOrThrow(id, driverUsername);
        if (trip.getStatus() != TripStatus.ASSIGNED) {
            throw new IllegalStateException("Only an assigned trip can be started");
        }
        LocalDateTime now = LocalDateTime.now();
        trip.setStatus(TripStatus.STARTED);
        trip.setStartedAt(now);
        trip.setRespondedAt(now);
        trip.setUpdatedAt(now);
        Trip saved = tripRepository.save(trip);

        notificationService.createNotification(
                trip.getAssignedBy() != null ? trip.getAssignedBy() : "CONTROLLER",
                "Driver " + driverUsername + " started the trip to " + trip.getDestination(),
                "TRIP_STARTED");

        return toEnrichedDto(saved);
    }

    @Override
    @Transactional
    public TripDto declineTrip(Long id, String driverUsername, String reason) {
        Trip trip = findOwnedTripOrThrow(id, driverUsername);
        if (trip.getStatus() != TripStatus.ASSIGNED) {
            throw new IllegalStateException("Only an assigned trip can be declined");
        }
        LocalDateTime now = LocalDateTime.now();
        trip.setStatus(TripStatus.DECLINED);
        trip.setDeclineReason(reason);
        trip.setRespondedAt(now);
        trip.setUpdatedAt(now);
        Trip saved = tripRepository.save(trip);

        notificationService.createNotification(
                trip.getAssignedBy() != null ? trip.getAssignedBy() : "CONTROLLER",
                "Driver " + driverUsername + " declined the trip to " + trip.getDestination()
                        + (reason != null && !reason.isBlank() ? " (" + reason + ")" : ""),
                "TRIP_DECLINED");

        return toEnrichedDto(saved);
    }

    @Override
    @Transactional
    public TripDto completeTrip(Long id, String driverUsername) {
        Trip trip = findOwnedTripOrThrow(id, driverUsername);
        if (trip.getStatus() != TripStatus.STARTED && trip.getStatus() != TripStatus.ASSIGNED) {
            throw new IllegalStateException("Only an assigned or started trip can be completed");
        }
        LocalDateTime now = LocalDateTime.now();
        trip.setStatus(TripStatus.COMPLETED);
        trip.setCompletedAt(now);
        trip.setUpdatedAt(now);
        Trip saved = tripRepository.save(trip);

        notificationService.createNotification(
                trip.getAssignedBy() != null ? trip.getAssignedBy() : "CONTROLLER",
                "Driver " + driverUsername + " completed the trip to " + trip.getDestination(),
                "TRIP_COMPLETED");

        return toEnrichedDto(saved);
    }

    // ==================== HELPERS ====================

    private Trip findTripOrThrow(Long id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + id));
    }

    private Trip findOwnedTripOrThrow(Long id, String driverUsername) {
        Trip trip = findTripOrThrow(id);
        if (trip.getDriverUsername() == null || driverUsername == null ||
            !trip.getDriverUsername().trim().equalsIgnoreCase(driverUsername.trim())) {
            throw new AccessDeniedException("This trip is not assigned to you");
        }
        return trip;
    }

    private TripDto toEnrichedDto(Trip trip) {
        return TripMapper.mapToTripDto(trip);
    }

    @Override
    @Transactional
    public void deleteTrip(Long id, String deletedBy) {
        Trip trip = findTripOrThrow(id);
        trip.setDeleted(true);
        trip.setDeletedBy(deletedBy != null ? deletedBy : "unknown");
        trip.setDeletedAt(LocalDateTime.now());
        tripRepository.save(trip);
        log.info("Trip {} soft-deleted by '{}'", id, deletedBy);
    }

    @Override
    @Transactional
    public void restoreTrip(Long id) {
        Trip trip = findTripOrThrow(id);
        if (!trip.isDeleted()) {
            throw new RuntimeException("Trip is not deleted.");
        }
        trip.setDeleted(false);
        trip.setDeletedBy(null);
        trip.setDeletedAt(null);
        tripRepository.save(trip);
        log.info("Trip {} restored", id);
    }

    @Override
    public List<TripDto> getDeletedTrips() {
        return tripRepository.findByDeletedTrueOrderByDeletedAtDesc().stream()
                .map(this::toEnrichedDto)
                .collect(Collectors.toList());
    }
}
