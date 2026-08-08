package net.javaguids.ems_backend.service;

public interface PasswordResetService {
    /** Generate a token, persist it, and send the reset email. */
    void initiateForgotPassword(String email);

    /** Validate the token and update the user's password. */
    void resetPassword(String token, String newPassword);
}
