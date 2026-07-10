package net.javaguids.ems_backend.enums;

/**
 * Lifecycle of a trip assignment.
 *
 * ASSIGNED  → controller assigned the trip to a driver; awaiting the driver's response
 * STARTED   → driver accepted and started the trip
 * DECLINED  → driver declined the assignment
 * COMPLETED → driver finished the trip
 * CANCELLED → controller/admin cancelled the trip before it was completed
 */
public enum TripStatus {
    ASSIGNED,
    STARTED,
    DECLINED,
    COMPLETED,
    CANCELLED
}
