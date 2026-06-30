package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
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
@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String userName;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;
    
    @Column(columnDefinition = "LONGTEXT")
    private String profilePicture;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "gender")
    private String gender;

    @Column(name = "nic")
    private String nic;

    @Column(name = "date_of_birth")
    private java.time.LocalDate dateOfBirth;

    @Column(name = "license_number")
    private String licenseNumber;

    @Column(name = "license_expiry_date")
    private java.time.LocalDate licenseExpiryDate;

    @Column(name = "license_document_path")
    private String licenseDocumentPath;

    @Column(name = "date_joined")
    private java.time.LocalDate dateJoined;

    @Column(name = "experience")
    private String experience;

    // ── Soft-delete fields ────────────────────────────────────────────────

    /** True when the record has been soft-deleted (not physically removed). */
    @Column(name = "is_deleted", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean deleted = false;

    /** Username of the person who performed the soft-delete. */
    @Column(name = "deleted_by", length = 100)
    private String deletedBy;

    /** Timestamp of when the soft-delete was performed. */
    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;
}
