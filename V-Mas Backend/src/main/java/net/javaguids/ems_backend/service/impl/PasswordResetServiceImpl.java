package net.javaguids.ems_backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.entity.PasswordResetToken;
import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.repository.PasswordResetTokenRepository;
import net.javaguids.ems_backend.repository.UserRepository;
import net.javaguids.ems_backend.service.EmailService;
import net.javaguids.ems_backend.service.PasswordResetService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {

    private final UserRepository              userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService                emailService;
    private final PasswordEncoder             passwordEncoder;

    /** Frontend base URL — used to build the reset link in the email. */
    @Value("${app.frontend.url:https://v-mas.vercel.app}")
    private String frontendUrl;

    /** How many minutes the token is valid. */
    private static final int TOKEN_EXPIRY_MINUTES = 30;

    // ── STEP 1: Forgot Password ─────────────────────────────────────────────
    @Override
    @Transactional
    public void initiateForgotPassword(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email address cannot be empty.");
        }
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email.trim());

        /*
         * SECURITY: We always return the same success message even if the email
         * is not registered. This prevents user enumeration attacks.
         */
        if (userOpt.isEmpty()) {
            log.warn("Forgot-password request for unknown email: {}", email);
            return; // silently succeed
        }

        User user = userOpt.get();

        // Invalidate any existing tokens for this user before creating a new one
        tokenRepository.deleteAllByUserId(user.getId());

        // Generate a cryptographically random UUID token
        String rawToken = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES);

        PasswordResetToken prt = new PasswordResetToken(rawToken, user, expiresAt);
        tokenRepository.save(prt);

        // Build reset link pointing to the frontend page
        String resetLink = frontendUrl + "/reset-password?token=" + rawToken;
        log.info("Sending password reset email to user {} ({})", user.getUserName(), email);
        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
    }

    // ── STEP 2: Reset Password ──────────────────────────────────────────────
    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset link. Please request a new one."));

        if (prt.isUsed()) {
            throw new RuntimeException("This reset link has already been used. Please request a new one.");
        }

        if (prt.isExpired()) {
            tokenRepository.delete(prt);
            throw new RuntimeException("This reset link has expired. Please request a new one.");
        }

        if (newPassword == null || newPassword.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters.");
        }

        // Update the user's password
        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark the token as used (or delete it — both are fine)
        prt.setUsed(true);
        tokenRepository.save(prt);

        log.info("Password reset successful for user {}", user.getUserName());
    }
}
