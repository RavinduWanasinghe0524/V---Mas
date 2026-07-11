package net.javaguids.ems_backend.mapper;

import net.javaguids.ems_backend.dto.TripDto;
import net.javaguids.ems_backend.entity.Trip;

public class TripMapper {

    public static TripDto mapToTripDto(Trip trip) {
        TripDto dto = new TripDto();
        dto.setId(trip.getId());
        dto.setDriverUsername(trip.getDriverUsername());
        dto.setVehicleRegNumber(trip.getVehicleRegNumber());
        dto.setOrigin(trip.getOrigin());
        dto.setDestination(trip.getDestination());
        dto.setPurpose(trip.getPurpose());
        dto.setScheduledDate(trip.getScheduledDate());
        dto.setStatus(trip.getStatus());
        dto.setAssignedBy(trip.getAssignedBy());
        dto.setDeclineReason(trip.getDeclineReason());
        dto.setCreatedAt(trip.getCreatedAt());
        dto.setStartedAt(trip.getStartedAt());
        dto.setRespondedAt(trip.getRespondedAt());
        dto.setCompletedAt(trip.getCompletedAt());
        dto.setUpdatedAt(trip.getUpdatedAt());
        dto.setDeleted(trip.isDeleted());
        dto.setDeletedBy(trip.getDeletedBy());
        dto.setDeletedAt(trip.getDeletedAt());
        return dto;
    }

    public static Trip mapToTrip(TripDto dto) {
        Trip trip = new Trip();
        trip.setDriverUsername(dto.getDriverUsername());
        trip.setVehicleRegNumber(dto.getVehicleRegNumber());
        trip.setOrigin(dto.getOrigin());
        trip.setDestination(dto.getDestination());
        trip.setPurpose(dto.getPurpose());
        trip.setScheduledDate(dto.getScheduledDate());
        if (dto.getStatus() != null) {
            trip.setStatus(dto.getStatus());
        }
        trip.setDeleted(dto.isDeleted());
        trip.setDeletedBy(dto.getDeletedBy());
        trip.setDeletedAt(dto.getDeletedAt());
        // assignedBy, status transitions and timestamps are managed by the service layer
        return trip;
    }
}
