package net.javaguids.ems_backend.controller;

import lombok.extern.slf4j.Slf4j;
import net.javaguids.ems_backend.dto.ApiResponse;
import net.javaguids.ems_backend.dto.ChangePasswordRequest;
import net.javaguids.ems_backend.dto.RegisterRequest;
import net.javaguids.ems_backend.dto.UpdateProfileRequest;
import net.javaguids.ems_backend.dto.UserDto;
import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.enums.Role;
import net.javaguids.ems_backend.repository.UserRepository;
import net.javaguids.ems_backend.service.UserService;
import net.javaguids.ems_backend.util.ApiResponseUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    // ── Own profile ──────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMyProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Get own profile request for user: {}", username);
        UserDto user = userService.getMyProfile(username);
        return ApiResponseUtil.success("Profile fetched successfully", user, HttpStatus.OK);
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateMyProfile(@RequestBody UpdateProfileRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Update profile request for user: {}", username);
        UserDto updatedUser = userService.updateMyProfile(username, request);
        return ApiResponseUtil.success("Profile updated successfully", updatedUser, HttpStatus.OK);
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Object>> changePassword(@RequestBody ChangePasswordRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Change password request for user: {}", username);
        userService.changePassword(username, request);
        return ApiResponseUtil.success("Password changed successfully", null, HttpStatus.OK);
    }

    // ── Admin: Pending approval queue ────────────────────────────────

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<List<UserDto>>> getPendingUsers() {
        log.info("Get pending users request received");
        List<UserDto> pending = userService.getPendingUsers();
        if (!isAdmin() && isController()) {
            pending = pending.stream()
                    .filter(u -> net.javaguids.ems_backend.enums.Role.DRIVER.equals(u.getRole()))
                    .collect(Collectors.toList());
        }
        log.info("Returning {} pending users", pending.size());
        return ApiResponseUtil.success("Pending users fetched successfully", pending, HttpStatus.OK);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<UserDto>> approveUser(@PathVariable Long id) {
        log.info("Approve user request received for ID: {}", id);
        if (!isAdmin() && isController()) {
            UserDto existingUser = userService.getUserById(id);
            if (!net.javaguids.ems_backend.enums.Role.DRIVER.equals(existingUser.getRole())) {
                throw new RuntimeException("Controllers can only approve driver accounts");
            }
        }
        UserDto updated = userService.approveUser(id);
        log.info("User approved successfully with ID: {}", id);
        return ApiResponseUtil.success("User approved successfully", updated, HttpStatus.OK);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<UserDto>> rejectUser(@PathVariable Long id) {
        log.info("Reject user request received for ID: {}", id);
        if (!isAdmin() && isController()) {
            UserDto existingUser = userService.getUserById(id);
            if (!net.javaguids.ems_backend.enums.Role.DRIVER.equals(existingUser.getRole())) {
                throw new RuntimeException("Controllers can only reject driver accounts");
            }
        }
        UserDto updated = userService.rejectUser(id);
        log.info("User rejected successfully with ID: {}", id);
        return ApiResponseUtil.success("User rejected successfully", updated, HttpStatus.OK);
    }

    // ── Admin/Controller: Active drivers list (for assign-driver dropdown) ──

    @GetMapping("/drivers")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllDrivers() {
        log.info("Get all active drivers request received");
        List<UserDto> drivers = userService.getAllUsers().stream()
                .filter(u -> Role.DRIVER.equals(u.getRole())
                          && "ACTIVE".equals(String.valueOf(u.getAccountStatus())))
                .collect(Collectors.toList());
        log.info("Returning {} active drivers", drivers.size());
        return ApiResponseUtil.success("Drivers fetched successfully", drivers, HttpStatus.OK);
    }

    // ── Admin: Full user list ────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        log.info("Get all users request received");
        List<UserDto> users = userService.getAllUsers();
        log.info("Returning {} users", users.size());
        return ApiResponseUtil.success("Users fetched successfully", users, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> getUserById(@PathVariable Long id) {
        log.info("Get user by ID request received for ID: {}", id);
        User currentUser = getCurrentUser();
        if (!isAdmin() && !isController() && !currentUser.getId().equals(id)) {
            log.warn("Access denied: User {} attempted to access user {}", currentUser.getId(), id);
            return ApiResponseUtil.error("You don't have permission to access this resource", HttpStatus.FORBIDDEN);
        }
        UserDto user = userService.getUserById(id);
        return ApiResponseUtil.<Object>success("User fetched successfully", user, HttpStatus.OK);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<Object>> createUser(@RequestBody RegisterRequest request) {
        log.info("Create user request received for username: {}", request.getUserName());
        if (!isAdmin() && isController()) {
            if (!Role.DRIVER.equals(request.getRole())) {
                return ApiResponseUtil.error("Controllers can only create driver accounts", HttpStatus.FORBIDDEN);
            }
        }
        UserDto user = userService.createUser(request);
        log.info("User created successfully: {}", request.getUserName());
        return ApiResponseUtil.<Object>success("User created successfully", user, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        log.info("Update user request received for ID: {}", id);
        User currentUser = getCurrentUser();
        if (!isAdmin() && !isController() && !currentUser.getId().equals(id)) {
            log.warn("Access denied: User {} attempted to update user {}", currentUser.getId(), id);
            return ApiResponseUtil.error("You don't have permission to access this resource", HttpStatus.FORBIDDEN);
        }
        if (!isAdmin() && isController() && !currentUser.getId().equals(id)) {
            UserDto targetUser = userService.getUserById(id);
            if (!Role.DRIVER.equals(targetUser.getRole())) {
                return ApiResponseUtil.error("Controllers can only modify driver accounts", HttpStatus.FORBIDDEN);
            }
            if (!Role.DRIVER.equals(userDto.getRole())) {
                return ApiResponseUtil.error("Controllers cannot elevate privileges", HttpStatus.FORBIDDEN);
            }
        }
        UserDto updatedUser = userService.updateUser(id, userDto);
        log.info("User updated successfully with ID: {}", id);
        return ApiResponseUtil.<Object>success("User updated successfully", updatedUser, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTROLLER')")
    public ResponseEntity<ApiResponse<Object>> deleteUser(@PathVariable Long id) {
        log.info("Delete user request received for ID: {}", id);
        if (!isAdmin() && isController()) {
            UserDto targetUser = userService.getUserById(id);
            if (!Role.DRIVER.equals(targetUser.getRole())) {
                return ApiResponseUtil.error("Controllers can only delete driver accounts", HttpStatus.FORBIDDEN);
            }
        }
        userService.deleteUser(id);
        log.info("User deleted successfully with ID: {}", id);
        return ApiResponseUtil.success("User deleted successfully", null, HttpStatus.OK);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUserName(auth.getName())
                .orElseThrow(() -> new RuntimeException("Current user not found"));
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean isController() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CONTROLLER"));
    }
}
