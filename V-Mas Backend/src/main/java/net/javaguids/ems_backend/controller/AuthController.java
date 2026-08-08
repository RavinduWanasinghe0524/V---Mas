package net.javaguids.ems_backend.controller;

import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.AuthResponse;
import net.javaguids.ems_backend.dto.ForgotPasswordRequest;
import net.javaguids.ems_backend.dto.LoginRequest;
import net.javaguids.ems_backend.dto.RegisterRequest;
import net.javaguids.ems_backend.dto.ResetPasswordRequest;
import net.javaguids.ems_backend.service.PasswordResetService;
import net.javaguids.ems_backend.service.UserService;
import net.javaguids.ems_backend.util.ApiResponseUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordResetService passwordResetService;

    /**
     * Self-registration endpoint.
     * New accounts are created with PENDING status — no JWT is issued.
     * The response contains { success: true, message: "...", data: null }
     * so the frontend knows to show the "Pending Approval" screen.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@RequestBody RegisterRequest request) {
        log.info("Register request received for username: {}", request.getUserName());
        userService.register(request);
        log.info("User registered (PENDING approval): {}", request.getUserName());
        return ApiResponseUtil.success(
                "Registration successful. Your account is pending admin approval.",
                null,
                HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody LoginRequest request) {
        log.info("Login request received for username: {}", request.getUserName());
        AuthResponse response = userService.login(request);
        log.info("User logged in successfully: {}", request.getUserName());
        return ApiResponseUtil.success("Login successful", response, HttpStatus.OK);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Object>> logout() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            String username = auth.getName();
            log.info("Logout request received for username: {}", username);
            SecurityContextHolder.clearContext();
            log.info("User logged out successfully: {}", username);
            return ApiResponseUtil.success("Logout successful. Please remove the token from client.", null, HttpStatus.OK);
        }
        log.warn("Logout attempt with no authenticated user");
        return ApiResponseUtil.success("Already logged out", null, HttpStatus.OK);
    }

    /**
     * Step 1 — Forgot Password.
     * Accepts an email address, generates a short-lived token, and sends a
     * SendGrid reset-link email.  Always returns 200 to prevent user enumeration.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Object>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        log.info("Forgot-password request received for email: {}", request.getEmail());
        passwordResetService.initiateForgotPassword(request.getEmail());
        return ApiResponseUtil.success(
                "If that email is registered, a reset link has been sent.", null, HttpStatus.OK);
    }

    /**
     * Step 2 — Reset Password.
     * Validates the token and updates the user's password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Object>> resetPassword(@RequestBody ResetPasswordRequest request) {
        log.info("Reset-password attempt with token: {}…", request.getToken() != null ? request.getToken().substring(0, 8) : "null");
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ApiResponseUtil.success("Password reset successful. You can now log in.", null, HttpStatus.OK);
    }
}
