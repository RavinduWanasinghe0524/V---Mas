# VMAS – Vehicle Management & Authentication System

A full-stack web application for managing vehicle fleets with role-based access control, real-time fuel tracking, service scheduling, and PDF reporting. Built with **Spring Boot 3** on the backend and **React (Vite)** on the frontend.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend (Spring Boot)](#2-backend-spring-boot)
  - [3. Frontend (React + Vite)](#3-frontend-react--vite)
- [Configuration](#configuration)
- [User Roles](#user-roles)
- [Default Credentials](#default-credentials)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [License](#license)

---

## Features

### 🔐 Authentication & Security
- **JWT Authentication** – Stateless login/logout with 24-hour token expiration
- **Role-Based Access Control** – ADMIN, CONTROLLER, and DRIVER roles with distinct permissions
- **Profile Management** – Update profile details and upload a profile picture

### 🚗 Vehicle Management
- Register, view, update, and delete fleet vehicles
- Track make, model, year, fuel type, registration number, and current mileage
- Assign drivers to vehicles; view assignment history
- Vehicle availability status tracking

### ⛽ Fuel Logging & Analytics
- **Drivers** log fuel fill-ups (liters, cost per liter, current mileage, date)
- **Mileage validation** – Current mileage must be ≥ the previous recorded reading; auto pre-filled from last entry with live "km driven" indicator
- **Controllers** manage all fleet fuel logs (add, edit, soft-delete)
- Automatic fuel efficiency calculation (km/L) per entry using consecutive mileage readings
- **Fuel Analysis Dashboard** – Monthly charts, per-vehicle statistics, cost trends, efficiency ratings (Excellent / Good / Average / Poor)
- Soft-delete audit trail for deleted fuel logs

### 🔧 Service Records
- Schedule and track vehicle maintenance (oil change, tyre rotation, full service, etc.)
- Upcoming service alerts (within the next 30 days)
- Service history per vehicle with mileage at time of service
- Filter by vehicle, service type, or date range

### 📊 Reports
- Generate and download **PDF reports** covering:
  - Fleet vehicle summary
  - Fuel log history
  - Service record history
  - Total costs and efficiency statistics

### 👥 User & Employee Management
- Admin panel to create, update, activate/deactivate, and delete users
- Employee directory management

### 🔔 Notifications
- System-wide notifications for key events (vehicle updates, fuel log changes, service records)
- Real-time badge count and dismissible notification dropdown in the Topbar (Admin)

### 🎨 UI/UX
- Dark-mode-first design with glassmorphism accents
- Responsive sidebar navigation with role-aware menu items
- Animated stat cards, hover effects, and toast notifications
- Theme context with consistent design tokens across all pages

---

## Tech Stack

### Backend
| Technology | Version |
|---|---|
| Java | 17+ |
| Spring Boot | 3.5.6 |
| Spring Security + JWT (JJWT) | 0.11.5 |
| Spring Data JPA / Hibernate | – |
| Flyway (DB migrations) | – |
| MySQL / MariaDB | 8.x / 10.4+ |
| Lombok | – |
| springdoc-openapi (Swagger UI) | 2.8.6 |
| Maven | 3.6+ |

### Frontend
| Technology | Version |
|---|---|
| React | 19.x |
| Vite | 6.x |
| React Router DOM | 7.x |
| Axios | 1.x |
| Lucide React (icons) | – |
| jsPDF + jspdf-autotable | – |

---

## Architecture Overview

```
┌──────────────────────────┐          ┌──────────────────────────┐
│  React + Vite            │  HTTP/   │  Spring Boot REST API    │
│  (port 5173 / 3000)      │◄────────►│  (port 8080)             │
│                          │  JSON    │                          │
│  • AuthContext           │          │  • JWT Security Filter   │
│  • ThemeContext          │          │  • REST Controllers      │
│  • React Router          │          │  • Service Layer         │
│  • Axios (api service)   │          │  • JPA Repositories      │
│  • jsPDF reports         │          │  • Flyway migrations     │
└──────────────────────────┘          └──────────┬───────────────┘
                                                 │ JDBC
                                      ┌──────────▼───────────────┐
                                      │  MySQL / MariaDB         │
                                      │  (vmas_db)               │
                                      └──────────────────────────┘
```

---

## Prerequisites

- **Java 17+** (tested with Java 22)
- **Maven 3.6+** (or use the included `mvnw` / `mvnw.cmd` wrapper)
- **Node.js 18+** and **npm**
- **MySQL 8.x** or **MariaDB 10.4+** running locally (XAMPP works fine)

---

## Getting Started

### 1. Database Setup

Make sure MySQL/MariaDB is running, then create the database and seed initial users:

```bash
mysql -u root < "V-Mas Backend/setup-database.sql"
```

> **XAMPP users:** Start MySQL from the XAMPP Control Panel before running the backend.

Optional schema migrations (apply when upgrading an existing installation):

```bash
mysql -u root < "V-Mas Backend/service-migration.sql"
mysql -u root < "V-Mas Backend/fix-database-column.sql"
mysql -u root < "V-Mas Backend/fix-fuel-table.sql"
mysql -u root < "V-Mas Backend/add-fuel-audit-columns.sql"
```

### 2. Backend (Spring Boot)

Navigate to the `V-Mas Backend` directory, confirm your database credentials in `application.properties` (see [Configuration](#configuration)), then run:

```bash
# Windows
cd "V-Mas Backend"
.\mvnw.cmd spring-boot:run

# macOS / Linux
cd "V-Mas Backend"
./mvnw spring-boot:run
```

The REST API will be available at **`http://localhost:8080`**.  
Swagger UI (API docs): **`http://localhost:8080/swagger-ui/index.html`**

To build an executable JAR:

```bash
./mvnw clean package
java -jar target/vmas-backend-0.0.1-SNAPSHOT.jar
```

### 3. Frontend (React + Vite)

```bash
cd "V-Mas Frontend"
npm install
npm run dev
```

The application will be available at **`http://localhost:5173`**.  
The Vite dev server proxies `/api` requests to `http://localhost:8080`.

To build for production:

```bash
npm run build      # output written to V-Mas Frontend/dist/
npm run preview    # locally preview the production build
```

---

## Configuration

### Backend – `V-Mas Backend/src/main/resources/application.properties`

```properties
# Database (auto-creates vmas_db if it doesn't exist)
spring.datasource.url=jdbc:mysql://localhost:3306/vmas_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# Flyway migrations
spring.flyway.enabled=true
spring.flyway.baselineOnMigrate=true

# JWT (replace with a secure 256-bit hex string in production)
jwt.secret=<your-256-bit-hex-secret>
jwt.expiration=86400000   # 24 hours in milliseconds
```

### Frontend – `V-Mas Frontend/vite.config.js`

The Vite dev server proxies `/api` to `http://localhost:8080` by default. Update the `proxy` section if your backend runs on a different host/port.

---

## User Roles

| Role | Permissions |
|---|---|
| **ADMIN** | Full access – manage users, vehicles, service records, fuel logs, notifications |
| **CONTROLLER** | Manage all fuel logs (add / edit / delete); view vehicles and analytics |
| **DRIVER** | Add and view their own fuel logs; view their assigned vehicle |

---

## Default Credentials

Created automatically by `setup-database.sql`:

| Role | Username | Password |
|---|---|---|
| ADMIN | `admin` | `admin123` |
| CONTROLLER | `controller1` | `controller123` |
| DRIVER | `driver1` | `driver123` |

> ⚠️ **Change these passwords before deploying to a production environment.**

---

## API Endpoints

All endpoints (except `/api/auth/**`) require an `Authorization: Bearer <token>` header.

### Authentication – `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT token |
| POST | `/api/auth/logout` | Logout |

### Vehicles – `/api/vehicles`
| Method | Path | Description |
|---|---|---|
| GET | `/api/vehicles` | List all vehicles |
| POST | `/api/vehicles` | Create a vehicle (ADMIN) |
| GET | `/api/vehicles/{id}` | Get vehicle by ID |
| PUT | `/api/vehicles/{id}` | Update vehicle (ADMIN) |
| DELETE | `/api/vehicles/{id}` | Delete vehicle (ADMIN) |
| GET | `/api/vehicles/assigned` | Get vehicle assigned to the current driver |

### Fuel Logs – `/api/fuel`
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/fuel/add` | DRIVER | Add own fuel log |
| GET | `/api/fuel/my-logs` | DRIVER | List own fuel logs |
| GET | `/api/fuel/all` | ADMIN / CONTROLLER | List all fleet fuel logs |
| POST | `/api/fuel/controller/add` | CONTROLLER | Add fuel log for any vehicle |
| PUT | `/api/fuel/controller/{id}` | CONTROLLER | Update any fuel log |
| DELETE | `/api/fuel/controller/{id}` | CONTROLLER | Soft-delete a fuel log |
| GET | `/api/fuel/summary` | All | Monthly fuel summary |
| GET | `/api/fuel/chart` | All | Monthly chart data |
| GET | `/api/fuel/vehicle/{regNo}` | All | All logs for a vehicle |

### Service Records – `/api/services`
| Method | Path | Description |
|---|---|---|
| POST | `/api/services` | Create service record |
| GET | `/api/services` | List all service records |
| GET | `/api/services/{id}` | Get service record |
| PUT | `/api/services/{id}` | Update service record |
| DELETE | `/api/services/{id}` | Delete service record |
| POST | `/api/services/filter` | Filter service records |
| GET | `/api/services/vehicle/{vehicleId}` | Services for a vehicle |
| GET | `/api/services/stats` | Service statistics |
| GET | `/api/services/upcoming` | Upcoming services (next 30 days) |
| GET | `/api/services/recent` | Last 5 service records |

### Users – `/api/users`
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/users` | ADMIN | List all users |
| POST | `/api/users` | ADMIN | Create user |
| PUT | `/api/users/{id}` | ADMIN | Update user |
| DELETE | `/api/users/{id}` | ADMIN | Delete user |
| GET | `/api/users/drivers` | ADMIN / CONTROLLER | List all drivers |

### Notifications – `/api/notifications`
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/notifications` | ADMIN | List all notifications |
| POST | `/api/notifications/{id}/read` | ADMIN | Mark notification as read |
| DELETE | `/api/notifications` | ADMIN | Clear all notifications |

### Employees – `/api/employees`
CRUD operations for employee management.

> 📦 A full Postman collection is included in `V-Mas Backend/`:
> - `VMAS_Postman_Collection.json`
> - `Fuel_Analysis_Complete_Postman_Collection.json`
> - `Service_API_Postman_Collection.json`
> - `VMAS_Local_Environment.postman_environment.json`

---

## Project Structure

```
V---Mas/
├── V-Mas Backend/
│   ├── src/main/java/net/javaguids/ems_backend/
│   │   ├── controller/          # REST controllers (Auth, Vehicle, Fuel, Service, User, Notification, Employee)
│   │   ├── service/impl/        # Business logic implementations
│   │   ├── repository/          # Spring Data JPA repositories
│   │   ├── entity/              # JPA entities (User, Vehicle, FuelLog, ServiceRecord, Notification, Employee)
│   │   ├── dto/                 # Request / response DTOs
│   │   ├── mapper/              # Entity ↔ DTO mappers
│   │   ├── security/            # JWT filter, utilities, UserDetailsService
│   │   ├── config/              # SecurityConfig, CORS, OpenAPI config
│   │   ├── enums/               # Role, AccountStatus, ServiceType
│   │   ├── exception/           # Global exception handler
│   │   ├── util/                # Utility classes
│   │   └── EmsBackendApplication.java
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/        # Flyway SQL migration scripts
│   ├── setup-database.sql       # Initial DB + seed data
│   ├── service-migration.sql
│   ├── fix-*.sql                # Schema patch scripts
│   ├── VMAS_Postman_Collection.json
│   ├── Fuel_Analysis_Complete_Postman_Collection.json
│   ├── Service_API_Postman_Collection.json
│   ├── VMAS_Local_Environment.postman_environment.json
│   ├── mvnw / mvnw.cmd
│   └── pom.xml
│
├── V-Mas Frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx          # Login screen
│   │   │   ├── RegisterPage.jsx       # New user registration
│   │   │   ├── DashboardPage.jsx      # Role-based dashboard (Admin / Controller / Driver)
│   │   │   ├── VehiclesPage.jsx       # Fleet vehicle management
│   │   │   ├── FuelLogPage.jsx        # Driver fuel log (with mileage validation)
│   │   │   ├── FuelManagementPage.jsx # Controller fleet fuel management
│   │   │   ├── FuelAnalysisPage.jsx   # Analytics charts and stats
│   │   │   ├── ServicePage.jsx        # Service record management
│   │   │   ├── AddServicePage.jsx     # Create / edit service record
│   │   │   ├── UsersPage.jsx          # User management (Admin)
│   │   │   ├── ProfilePage.jsx        # User profile & settings
│   │   │   ├── ReportsPage.jsx        # PDF report generation
│   │   │   └── LocationPage.jsx       # Vehicle location view
│   │   ├── components/
│   │   │   ├── Sidebar.jsx            # Role-aware navigation sidebar
│   │   │   ├── Topbar.jsx             # Header with notifications & user menu
│   │   │   └── PrivateRoute.jsx       # Auth guard for protected routes
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # JWT auth state & helpers
│   │   │   └── ThemeContext.jsx       # Dark-mode design tokens
│   │   ├── services/
│   │   │   └── api.js                 # Axios instance + all API service functions
│   │   ├── App.jsx                    # Router & route definitions
│   │   └── index.css                  # Global styles & design system
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── LICENSE
```

---

## Testing

### Postman

Import the included collections from `V-Mas Backend/` into Postman:

1. **`VMAS_Postman_Collection.json`** – core auth, vehicle, user, and employee endpoints
2. **`Fuel_Analysis_Complete_Postman_Collection.json`** – full fuel analysis endpoint suite
3. **`Service_API_Postman_Collection.json`** – service record endpoints
4. **`VMAS_Local_Environment.postman_environment.json`** – pre-configured base URL and auth token variables

### PowerShell (Fuel API quick-test)

```powershell
cd "V-Mas Backend"
.\test-fuel-api-complete.ps1
```

### Frontend Linting

```bash
cd "V-Mas Frontend"
npm run lint
```

---

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

Copyright © 2026 Capstone-group-13
