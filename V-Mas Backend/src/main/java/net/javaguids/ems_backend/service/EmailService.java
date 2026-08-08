package net.javaguids.ems_backend.service;

/**
 * Abstraction over the email-sending provider (SendGrid).
 * Keeps the password-reset logic decoupled from the transport layer.
 */
public interface EmailService {

    /**
     * Send a password-reset email to the given address.
     *
     * @param toEmail   recipient's email address
     * @param resetLink the full reset URL the user should click
     */
    void sendPasswordResetEmail(String toEmail, String resetLink);
}
