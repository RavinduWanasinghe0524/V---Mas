package net.javaguids.ems_backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
public class EmsBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(EmsBackendApplication.class, args);
	}

	@Bean
	CommandLineRunner updateTableSchema(JdbcTemplate jdbcTemplate) {
		return args -> {
			try {
				// The ENUM definition causes DataTruncation errors for PENDING, so we force it to a generous VARCHAR.
				jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN account_status VARCHAR(50) NOT NULL;");
				System.out.println("✅ account_status column successfully updated to VARCHAR(50).");
			} catch (Exception e) {
				System.out.println("⚠️ Could not alter account_status column. The schema might already be fine. Error: " + e.getMessage());
			}

			try {
				String bCryptHash = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("admin123");
				System.out.println("ℹ️ Dynamically generated BCrypt hash for 'admin123': " + bCryptHash);
				
				// Seed admin if not present
				jdbcTemplate.update("INSERT INTO users (user_name, email, password, role, account_status, profile_picture) " +
						"SELECT 'admin', 'admin@vmas.com', ?, 'ADMIN', 'ACTIVE', NULL " +
						"WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'admin')",
						bCryptHash);
				
				// Seed controller if not present
				jdbcTemplate.update("INSERT INTO users (user_name, email, password, role, account_status, profile_picture) " +
						"SELECT 'controller1', 'controller@vmas.com', ?, 'CONTROLLER', 'ACTIVE', NULL " +
						"WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'controller1')",
						bCryptHash);
				
				// Seed driver if not present
				jdbcTemplate.update("INSERT INTO users (user_name, email, password, role, account_status, profile_picture) " +
						"SELECT 'driver1', 'driver@vmas.com', ?, 'DRIVER', 'ACTIVE', NULL " +
						"WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'driver1')",
						bCryptHash);

				// Force passwords to 'admin123' for these users
				jdbcTemplate.update("UPDATE users SET password = ? WHERE user_name IN ('admin', 'controller1', 'driver1')",
						bCryptHash);

				System.out.println("✅ Default users ('admin', 'controller1', 'driver1') successfully seeded/reset with password 'admin123'.");


				// Query and print all users
				jdbcTemplate.query("SELECT id, user_name, email, role, account_status, password FROM users", (rs, rowNum) -> {
					System.out.println(String.format("USER INFO: id=%d, userName=%s, email=%s, role=%s, status=%s, passwordHash=%s",
							rs.getLong("id"),
							rs.getString("user_name"),
							rs.getString("email"),
							rs.getString("role"),
							rs.getString("account_status"),
							rs.getString("password")));
					return null;
				});
			} catch (Exception e) {
				System.out.println("⚠️ Error seeding or updating users: " + e.getMessage());
			}

		};
	}

}
