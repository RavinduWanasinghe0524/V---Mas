package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.TripDto;

import java.util.List;

public interface TripService {

    // ---- Controller / Admin ----

    /** Controller/admin assigns a trip (and vehicle) to a driver. */
    TripDto assignTrip(TripDto tripDto, String assignedByUsername);

    /** Get every trip in the system (newest first). */
    List<TripDto> getAllTrips();

    /** Controller/admin updates an assigned trip's details. */
    TripDto updateTrip(Long id, TripDto tripDto);

    /** Controller/admin cancels a trip. */
    void cancelTrip(Long id);

    // ---- Shared ----

    TripDto getTripById(Long id);

    // ---- Driver ----

    /** Get the authenticated driver's own trips (newest first). */
    List<TripDto> getMyTrips(String driverUsername);

    /** Driver accepts and starts an assigned trip (only their own). */
    TripDto startTrip(Long id, String driverUsername);

    /** Driver declines an assigned trip (only their own). */
    TripDto declineTrip(Long id, String driverUsername, String reason);

    /** Driver marks a started trip as completed (only their own). */
    TripDto completeTrip(Long id, String driverUsername);

    // ---- Deleted Records Tab ----
    void deleteTrip(Long id, String deletedBy);
    void restoreTrip(Long id);
    List<TripDto> getDeletedTrips();
}
