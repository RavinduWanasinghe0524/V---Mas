package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Stores short-lived password-reset tokens.
 * One row is created per forgot-password request and deleted after use.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The opaque UUID token sent in the email link. */
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    /** The user this token belongs to. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** When this token expires (default: 30 minutes from creation). */
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    /** True once the token has been successfully used. */
    @Column(nullable = false)
    private boolean used = false;

    public PasswordResetToken(String token, User user, LocalDateTime expiresAt) {
        this.token = token;
        this.user = user;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
