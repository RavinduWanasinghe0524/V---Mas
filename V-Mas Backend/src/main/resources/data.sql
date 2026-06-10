-- Default seed data for V-MAS
-- Runs once on startup via spring.sql.init.mode=always
-- All passwords are BCrypt hash of: admin123

-- Default ADMIN user
INSERT INTO users (user_name, email, password, role, account_status, profile_picture)
SELECT 'admin', 'admin@vmas.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ADMIN', 'ACTIVE', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'admin');

-- Default CONTROLLER user
INSERT INTO users (user_name, email, password, role, account_status, profile_picture)
SELECT 'controller1', 'controller@vmas.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'CONTROLLER', 'ACTIVE', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'controller1');

-- Default DRIVER user
INSERT INTO users (user_name, email, password, role, account_status, profile_picture)
SELECT 'driver1', 'driver@vmas.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'DRIVER', 'ACTIVE', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'driver1');

-- Force reset passwords for default users to 'admin123' (BCrypt hash)
UPDATE users SET password = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a' WHERE user_name IN ('admin', 'controller1', 'driver1');

