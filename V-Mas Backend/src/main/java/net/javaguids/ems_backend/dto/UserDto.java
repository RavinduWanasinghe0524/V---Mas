package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import net.javaguids.ems_backend.enums.AccountStatus;
import net.javaguids.ems_backend.enums.Role;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String userName;
    private String email;
    private Role role;
    private AccountStatus accountStatus;
    private String profilePicture;
    private boolean deleted;
    private String deletedBy;
    private java.time.LocalDateTime deletedAt;

    private String phoneNumber;
    private String gender;
    private String nic;
    private java.time.LocalDate dateOfBirth;
    private String licenseNumber;
    private java.time.LocalDate licenseExpiryDate;
    private String licenseDocumentPath;
    private java.time.LocalDate dateJoined;
    private String experience;
}
