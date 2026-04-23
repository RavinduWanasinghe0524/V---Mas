package net.javaguids.ems_backend.service.impl;

import net.javaguids.ems_backend.dto.AuthResponse;
import net.javaguids.ems_backend.dto.ChangePasswordRequest;
import net.javaguids.ems_backend.dto.LoginRequest;
import net.javaguids.ems_backend.dto.RegisterRequest;
import net.javaguids.ems_backend.dto.UpdateProfileRequest;
import net.javaguids.ems_backend.dto.UserDto;
import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.enums.AccountStatus;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.repository.UserRepository;
import net.javaguids.ems_backend.security.JwtUtil;
import net.javaguids.ems_backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    // ── REGISTER ────────────────────────────────────────────────────
    // Self-registered accounts start as PENDING — no JWT issued.
    // The AuthController returns a message-only response; the frontend
    // shows the "Pending Approval" screen instead of navigating to dashboard.
    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUserName(request.getUserName())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUserName(request.getUserName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setAccountStatus(AccountStatus.PENDING); // ← awaiting admin approval
        user.setProfilePicture(request.getProfilePicture());

        userRepository.save(user);

        // Return null token — the frontend checks for this and shows the pending screen
        return new AuthResponse(null, null);
    }

    // ── LOGIN ────────────────────────────────────────────────────────
    // Block login for accounts that are not ACTIVE.
    @Override
    public AuthResponse login(LoginRequest request) {
        // Spring Security authenticates credentials (throws if wrong password)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUserName(), request.getPassword()));

        User user = userRepository.findByUserName(request.getUserName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Status gate — checked AFTER credential validation so we don't leak info
        switch (user.getAccountStatus()) {
            case PENDING ->
                throw new RuntimeException("Your account is awaiting admin approval. Please wait for an administrator to activate your account.");
            case INACTIVE ->
                throw new RuntimeException("Your account has been deactivated. Please contact an administrator.");
            case SUSPENDED ->
                throw new RuntimeException("Your account has been suspended. Please contact an administrator.");
            default -> { /* ACTIVE — proceed */ }
        }

        String token = jwtUtil.generateToken(user.getUserName(), user.getRole().name());
        return new AuthResponse(token, mapToDto(user));
    }

    // ── GET ALL USERS ────────────────────────────────────────────────
    @Override
    public List<UserDto> getAllUsers() {
        return userRepository.findAll()
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    // ── GET PENDING USERS ────────────────────────────────────────────
    @Override
    public List<UserDto> getPendingUsers() {
        return userRepository.findByAccountStatus(AccountStatus.PENDING)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    // ── GET USER BY ID ───────────────────────────────────────────────
    @Override
    public UserDto getUserById(Long id) {
        Long requiredId = Objects.requireNonNull(id);
        User user = userRepository.findById(requiredId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToDto(user);
    }

    // ── CREATE USER (admin-initiated — immediately ACTIVE) ───────────
    @Override
    public UserDto createUser(RegisterRequest request) {
        if (userRepository.existsByUserName(request.getUserName())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUserName(request.getUserName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setAccountStatus(AccountStatus.ACTIVE); // admin creates → directly active
        user.setProfilePicture(request.getProfilePicture());

        User savedUser = userRepository.save(Objects.requireNonNull(user));
        return mapToDto(savedUser);
    }

    // ── UPDATE USER ──────────────────────────────────────────────────
    @Override
    public UserDto updateUser(Long id, UserDto userDto) {
        Long requiredId = Objects.requireNonNull(id);
        User user = userRepository.findById(requiredId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setUserName(userDto.getUserName());
        user.setEmail(userDto.getEmail());
        user.setRole(userDto.getRole());
        user.setAccountStatus(userDto.getAccountStatus());
        user.setProfilePicture(userDto.getProfilePicture());

        User updatedUser = userRepository.save(Objects.requireNonNull(user));
        return mapToDto(updatedUser);
    }

    // ── DELETE USER ──────────────────────────────────────────────────
    @Override
    public void deleteUser(Long id) {
        Long requiredId = Objects.requireNonNull(id);
        User user = userRepository.findById(requiredId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        userRepository.delete(Objects.requireNonNull(user));
    }

    // ── MY PROFILE ───────────────────────────────────────────────────
    @Override
    public UserDto getMyProfile(String username) {
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapToDto(user);
    }

    // ── UPDATE MY PROFILE ────────────────────────────────────────────
    @Override
    public UserDto updateMyProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already in use");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getProfilePicture() != null) {
            user.setProfilePicture(request.getProfilePicture());
        }

        User updatedUser = userRepository.save(java.util.Objects.requireNonNull(user));
        return mapToDto(updatedUser);
    }

    // ── CHANGE PASSWORD ──────────────────────────────────────────────
    @Override
    public void changePassword(String username, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New passwords do not match");
        }

        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // ── APPROVE USER ─────────────────────────────────────────────────
    @Override
    public UserDto approveUser(Long id) {
        User user = userRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setAccountStatus(AccountStatus.ACTIVE);
        return mapToDto(userRepository.save(user));
    }

    // ── REJECT USER (soft — sets to INACTIVE) ────────────────────────
    @Override
    public UserDto rejectUser(Long id) {
        User user = userRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setAccountStatus(AccountStatus.INACTIVE);
        return mapToDto(userRepository.save(user));
    }

    // ── MAPPER ───────────────────────────────────────────────────────
    private UserDto mapToDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUserName(),
                user.getEmail(),
                user.getRole(),
                user.getAccountStatus(),
                user.getProfilePicture());
    }
}
