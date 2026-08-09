package net.javaguids.ems_backend.service.impl;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.TripDto;
import net.javaguids.ems_backend.service.SmsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Sends SMS messages via the Twilio Messaging API.
 *
 * Required application.properties / application-local.properties entries:
 *   twilio.account-sid   – your Twilio Account SID (starts with "AC")
 *   twilio.auth-token    – your Twilio Auth Token
 *   twilio.from-number   – your Twilio phone number in E.164 format (e.g. +12015551234)
 *
 * How to get Twilio credentials:
 *   1. Sign up at https://www.twilio.com/try-twilio  (free $15.50 trial credit)
 *   2. Verify your phone number
 *   3. From the Console Dashboard copy Account SID, Auth Token, and your trial number
 *   4. Paste them into application-local.properties
 *
 * Trial limitation:
 *   During the free trial, SMS can only be delivered to phone numbers you have
 *   verified under Twilio Console → Phone Numbers → Verified Caller IDs.
 */
@Slf4j
@Service
public class TwilioSmsServiceImpl implements SmsService {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.from-number}")
    private String fromNumber;

    /** Initialise the Twilio client once after the bean is constructed. */
    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
        log.info("Twilio SMS client initialised (from-number: {})", fromNumber);
    }

    @Override
    public void sendTripAssignedSms(String toPhoneNumber, TripDto trip) {
        if (toPhoneNumber == null || toPhoneNumber.isBlank()) {
            log.warn("Cannot send trip-assigned SMS: driver has no phone number on record (trip id={})", trip.getId());
            return;
        }

        String body = buildSmsBody(trip);

        try {
            Message message = Message.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(fromNumber),
                    body
            ).create();

            log.info("Trip-assigned SMS sent to {} (SID: {}, status: {})",
                    toPhoneNumber, message.getSid(), message.getStatus());

        } catch (ApiException e) {
            // A failed SMS must NEVER prevent the trip assignment from succeeding.
            log.error("Twilio API error sending trip-assigned SMS to {} — trip id={}: {} (code {})",
                    toPhoneNumber, trip.getId(), e.getMessage(), e.getCode());
        } catch (Exception e) {
            log.error("Unexpected error sending trip-assigned SMS to {} — trip id={}: {}",
                    toPhoneNumber, trip.getId(), e.getMessage(), e);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String buildSmsBody(TripDto trip) {
        StringBuilder sb = new StringBuilder();
        sb.append("[V-MAS] New trip assigned to you!\n");
        if (trip.getDestination() != null) {
            sb.append("Destination : ").append(trip.getDestination()).append("\n");
        }
        if (trip.getOrigin() != null && !trip.getOrigin().isBlank()) {
            sb.append("From        : ").append(trip.getOrigin()).append("\n");
        }
        if (trip.getVehicleRegNumber() != null) {
            sb.append("Vehicle     : ").append(trip.getVehicleRegNumber()).append("\n");
        }
        if (trip.getScheduledDate() != null) {
            sb.append("Date        : ").append(trip.getScheduledDate()).append("\n");
        }
        if (trip.getPurpose() != null && !trip.getPurpose().isBlank()) {
            sb.append("Purpose     : ").append(trip.getPurpose()).append("\n");
        }
        if (trip.getAssignedBy() != null) {
            sb.append("Assigned by : ").append(trip.getAssignedBy()).append("\n");
        }
        sb.append("Please log in to V-MAS to accept or decline.");
        return sb.toString();
    }
}
