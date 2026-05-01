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
		};
	}
}
