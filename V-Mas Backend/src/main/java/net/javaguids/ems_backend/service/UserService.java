package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.AuthResponse;
import net.javaguids.ems_backend.dto.ChangePasswordRequest;
import net.javaguids.ems_backend.dto.LoginRequest;
import net.javaguids.ems_backend.dto.RegisterRequest;
import net.javaguids.ems_backend.dto.UpdateProfileRequest;
import net.javaguids.ems_backend.dto.UserDto;

import java.util.List;

public interface UserService {
    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    List<UserDto> getAllUsers();

    List<UserDto> getPendingUsers();

    UserDto getUserById(Long id);

    UserDto createUser(RegisterRequest request);

    UserDto updateUser(Long id, UserDto userDto);

    void deleteUser(Long id);

    UserDto getMyProfile(String username);

    UserDto updateMyProfile(String username, UpdateProfileRequest request);

    void changePassword(String username, ChangePasswordRequest request);

    UserDto approveUser(Long id);

    UserDto rejectUser(Long id);

    List<UserDto> getDeletedUsers();

    UserDto restoreUser(Long id);

    UserDto uploadDocument(Long id, String docType, org.springframework.web.multipart.MultipartFile file, String expiryDateStr);
    org.springframework.core.io.Resource getDocument(Long id, String docType);
}
