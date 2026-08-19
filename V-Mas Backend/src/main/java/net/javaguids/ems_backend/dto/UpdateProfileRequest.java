package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    private String email;
    private String profilePicture;
    private String phoneNumber;
    private String gender;
    private String nic;
    private java.time.LocalDate dateOfBirth;
    private String licenseNumber;
    private java.time.LocalDate licenseExpiryDate;
    private java.time.LocalDate dateJoined;
    private String experience;
    private String address;
}
