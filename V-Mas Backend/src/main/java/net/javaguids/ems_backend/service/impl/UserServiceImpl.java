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
import net.javaguids.ems_backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private NotificationService notificationService;

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

        user.setPhoneNumber(request.getPhoneNumber());
        user.setGender(request.getGender());
        user.setNic(request.getNic());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setLicenseNumber(request.getLicenseNumber());
        user.setLicenseExpiryDate(request.getLicenseExpiryDate());
        user.setDateJoined(request.getDateJoined());
        user.setExperience(request.getExperience());

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

        User user = userRepository.findByUserNameOrEmail(request.getUserName(), request.getUserName())
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
                .stream().filter(u -> !u.isDeleted()).map(this::mapToDto).collect(Collectors.toList());
    }

    // ── GET PENDING USERS ────────────────────────────────────────────
    @Override
    public List<UserDto> getPendingUsers() {
        return userRepository.findByAccountStatus(AccountStatus.PENDING)
                .stream().filter(u -> !u.isDeleted()).map(this::mapToDto).collect(Collectors.toList());
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

        user.setPhoneNumber(request.getPhoneNumber());
        user.setGender(request.getGender());
        user.setNic(request.getNic());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setLicenseNumber(request.getLicenseNumber());
        user.setLicenseExpiryDate(request.getLicenseExpiryDate());
        user.setDateJoined(request.getDateJoined());
        user.setExperience(request.getExperience());

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

        user.setPhoneNumber(userDto.getPhoneNumber());
        user.setGender(userDto.getGender());
        user.setNic(userDto.getNic());
        user.setDateOfBirth(userDto.getDateOfBirth());
        user.setLicenseNumber(userDto.getLicenseNumber());
        user.setLicenseExpiryDate(userDto.getLicenseExpiryDate());
        user.setLicenseDocumentPath(userDto.getLicenseDocumentPath());
        user.setDateJoined(userDto.getDateJoined());
        user.setExperience(userDto.getExperience());

        User updatedUser = userRepository.save(Objects.requireNonNull(user));
        notificationService.createNotification(
                "USER-" + updatedUser.getUserName(),
                "User profile for " + updatedUser.getUserName() + " was updated.",
                "USER_UPDATE"
        );
        return mapToDto(updatedUser);
    }

    // ── DELETE USER ──────────────────────────────────────────────────
    @Override
    public void deleteUser(Long id) {
        Long requiredId = Objects.requireNonNull(id);
        User user = userRepository.findById(requiredId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        user.setDeleted(true);
        user.setDeletedBy(auth != null && auth.isAuthenticated() ? auth.getName() : "unknown");
        user.setDeletedAt(java.time.LocalDateTime.now());
        userRepository.save(user);
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

        user.setPhoneNumber(request.getPhoneNumber());
        user.setGender(request.getGender());
        user.setNic(request.getNic());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setLicenseNumber(request.getLicenseNumber());
        user.setLicenseExpiryDate(request.getLicenseExpiryDate());
        user.setDateJoined(request.getDateJoined());
        user.setExperience(request.getExperience());

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
        User savedUser = userRepository.save(user);
        notificationService.createNotification(
                "USER-" + savedUser.getUserName(),
                "User account for " + savedUser.getUserName() + " was approved.",
                "USER_APPROVAL"
        );
        return mapToDto(savedUser);
    }

    // ── REJECT USER (soft — sets to INACTIVE) ────────────────────────
    @Override
    public UserDto rejectUser(Long id) {
        User user = userRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setAccountStatus(AccountStatus.INACTIVE);
        User savedUser = userRepository.save(user);
        notificationService.createNotification(
                "USER-" + savedUser.getUserName(),
                "User account for " + savedUser.getUserName() + " was rejected/deactivated.",
                "USER_REJECTION"
        );
        return mapToDto(savedUser);
    }

    // ── MAPPER ───────────────────────────────────────────────────────
    private UserDto mapToDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUserName(),
                user.getEmail(),
                user.getRole(),
                user.getAccountStatus(),
                user.getProfilePicture(),
                user.isDeleted(),
                user.getDeletedBy(),
                user.getDeletedAt(),
                user.getPhoneNumber(),
                user.getGender(),
                user.getNic(),
                user.getDateOfBirth(),
                user.getLicenseNumber(),
                user.getLicenseExpiryDate(),
                user.getLicenseDocumentPath(),
                user.getDateJoined(),
                user.getExperience());
    }

    @Override
    public List<UserDto> getDeletedUsers() {
        return userRepository.findAll().stream()
                .filter(u -> u != null && u.isDeleted())
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserDto restoreUser(Long id) {
        Long requiredId = Objects.requireNonNull(id);
        User user = userRepository.findById(requiredId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        if (!user.isDeleted()) {
            throw new RuntimeException("User is not deleted.");
        }
        user.setDeleted(false);
        user.setDeletedBy(null);
        user.setDeletedAt(null);
        User restored = userRepository.save(user);
        return mapToDto(restored);
    }

    private java.nio.file.Path resolveUploadPath(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return null;
        }
        
        String cleanPath = relativePath;
        if (cleanPath.startsWith("uploads/")) {
            cleanPath = cleanPath.substring("uploads/".length());
        } else if (cleanPath.startsWith("uploads\\")) {
            cleanPath = cleanPath.substring("uploads\\".length());
        }

        java.nio.file.Path cwd = java.nio.file.Paths.get("").toAbsolutePath();
        java.nio.file.Path uploadsDir;
        
        if (cwd.getFileName() != null && cwd.getFileName().toString().equals("V-Mas Backend")) {
            uploadsDir = cwd.resolve("uploads");
        } else if (java.nio.file.Files.exists(cwd.resolve("V-Mas Backend"))) {
            uploadsDir = cwd.resolve("V-Mas Backend").resolve("uploads");
        } else if (java.nio.file.Files.exists(cwd.resolve("V---Mas").resolve("V-Mas Backend"))) {
            uploadsDir = cwd.resolve("V---Mas").resolve("V-Mas Backend").resolve("uploads");
        } else {
            uploadsDir = cwd.resolve("uploads");
        }

        return uploadsDir.resolve(cleanPath).normalize();
    }

    @Override
    @Transactional
    public UserDto uploadDocument(Long id, String docType, MultipartFile file, String expiryDateStr) {
        User user = userRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        try {
            // Target folder: uploads/user-documents/{id}
            String uploadDir = "uploads/user-documents/" + id;
            java.nio.file.Path uploadPath = resolveUploadPath(uploadDir);
            java.nio.file.Files.createDirectories(uploadPath);

            // Save filename using UUID prefix
            String filename = java.util.UUID.randomUUID() + "_" + file.getOriginalFilename();
            java.nio.file.Path filePath = uploadPath.resolve(filename);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            String savedPath = uploadDir + "/" + filename;

            if ("license".equalsIgnoreCase(docType)) {
                user.setLicenseDocumentPath(savedPath);
                if (expiryDateStr != null && !expiryDateStr.isEmpty()) {
                    user.setLicenseExpiryDate(java.time.LocalDate.parse(expiryDateStr));
                }
            } else {
                throw new RuntimeException("Invalid document type: " + docType);
            }

            User saved = userRepository.save(user);

            notificationService.createNotification(
                    "USER-" + saved.getUserName(),
                    "User document '" + docType + "' was updated for " + saved.getUserName() + ". Filename: " + file.getOriginalFilename(),
                    "USER_UPDATE"
            );

            return mapToDto(saved);

        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to store user document: " + e.getMessage(), e);
        }
    }

    @Override
    public org.springframework.core.io.Resource getDocument(Long id, String docType) {
        User user = userRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        String savedPath;
        if ("license".equalsIgnoreCase(docType)) {
            savedPath = user.getLicenseDocumentPath();
        } else {
            throw new RuntimeException("Invalid document type: " + docType);
        }

        if (savedPath == null || savedPath.isBlank()) {
            throw new ResourceNotFoundException("No " + docType + " document found for user with id: " + id);
        }

        try {
            java.nio.file.Path filePath = resolveUploadPath(savedPath);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Document file not found or not readable at: " + savedPath);
            }
        } catch (java.net.MalformedURLException e) {
            throw new RuntimeException("Error reading document file path: " + e.getMessage(), e);
        }
    }
}
