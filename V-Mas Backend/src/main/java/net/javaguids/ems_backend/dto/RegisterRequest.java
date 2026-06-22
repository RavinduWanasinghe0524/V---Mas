package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import net.javaguids.ems_backend.enums.Role;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    private String userName;
    private String email;
    private String password;
    private Role role;
    private String profilePicture;
    private String phoneNumber;
    private String gender;
    private String nic;
    private java.time.LocalDate dateOfBirth;
    private String licenseNumber;
    private java.time.LocalDate licenseExpiryDate;
    private java.time.LocalDate dateJoined;
    private String experience;
}
