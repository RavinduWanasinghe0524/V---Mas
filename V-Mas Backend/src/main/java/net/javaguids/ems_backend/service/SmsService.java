package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.TripDto;

/**
 * Abstraction for sending SMS messages.
 * Currently backed by {@link net.javaguids.ems_backend.service.impl.TwilioSmsServiceImpl}.
 */
public interface SmsService {

    /**
     * Sends a trip-assigned notification SMS to a driver's phone.
     *
     * @param toPhoneNumber the driver's mobile number in E.164 format (e.g. +94771234567)
     * @param trip          the assigned trip details to include in the message
     */
    void sendTripAssignedSms(String toPhoneNumber, TripDto trip);
}
