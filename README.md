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

> 🔐 **Authentication Required** — All endpoints except `/api/auth/register` and `/api/auth/login` require:
> ```
> Authorization: Bearer <your_jwt_token>
> ```
> Base URL: `http://localhost:8080`

---

### 🔑 Authentication — `/api/auth`

> No token required for `register` and `login`.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Register a new user (account starts as PENDING) |
| `POST` | `/api/auth/login` | Public | Login and get JWT token |
| `POST` | `/api/auth/logout` | Authenticated | Logout (clears server-side session) |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/auth/register**
```json
// Request Body
{
  "userName": "john_driver",
  "password": "password123",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "role": "DRIVER"
}

// Response (201 Created)
{
  "success": true,
  "message": "Registration successful. Your account is pending admin approval.",
  "data": null
}
```

**POST /api/auth/login**
```json
// Request Body
{
  "userName": "admin",
  "password": "admin123"
}

// Response (200 OK)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "userName": "admin",
    "role": "ADMIN"
  }
}
```
</details>

---

### 🚗 Vehicles — `/api/vehicles`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/vehicles` | ALL | Get all vehicles |
| `POST` | `/api/vehicles` | ADMIN, CONTROLLER | Create a new vehicle |
| `GET` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Get vehicle by ID |
| `PUT` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Update vehicle details |
| `DELETE` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Delete a vehicle |
| `PUT` | `/api/vehicles/{id}/assign/{driverId}` | ADMIN, CONTROLLER | Assign a driver to a vehicle |
| `DELETE` | `/api/vehicles/{id}/assign` | ADMIN, CONTROLLER | Remove driver from a vehicle |
| `POST` | `/api/vehicles/{id}/document/{docType}` | ADMIN, CONTROLLER | Upload a vehicle document (insurance, license, etc.) |
| `GET` | `/api/vehicles/{id}/document/{docType}` | ALL | Download/view a vehicle document |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/vehicles**
```json
// Request Body
{
  "registrationNumber": "ABC-1234",
  "make": "Toyota",
  "model": "Hilux",
  "year": 2022,
  "fuelType": "DIESEL",
  "currentMileageKm": 15000
}

// Response (201 Created)
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": 1,
    "registrationNumber": "ABC-1234",
    "make": "Toyota",
    "model": "Hilux",
    "status": "AVAILABLE"
  }
}
```

**PUT /api/vehicles/1/assign/3**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Driver assigned successfully",
  "data": { "id": 1, "assignedDriverId": 3 }
}
```
</details>

---

### ⛽ Fuel Logs — `/api/fuel`

#### Driver Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/fuel/add` | DRIVER | Log own fuel fill-up |
| `GET` | `/api/fuel/my-logs` | DRIVER | Get own fuel history |
| `GET` | `/api/fuel/my-logs/{id}` | DRIVER | Get one specific own log |
| `PUT` | `/api/fuel/my-logs/{id}` | DRIVER | Update own fuel log |

#### Controller / Admin Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/fuel/all` | ADMIN, CONTROLLER | Get all fleet fuel logs |
| `POST` | `/api/fuel/controller/add` | ADMIN, CONTROLLER | Add fuel log for any vehicle |
| `PUT` | `/api/fuel/controller/{id}` | ADMIN, CONTROLLER | Update any fuel log |
| `DELETE` | `/api/fuel/controller/{id}` | ADMIN, CONTROLLER | Soft-delete a fuel log |
| `GET` | `/api/fuel/controller/search/{id}` | ADMIN, CONTROLLER | Find a fuel log by ID |
| `GET` | `/api/fuel/controller/deleted` | ADMIN, CONTROLLER | View soft-deleted logs |
| `PATCH` | `/api/fuel/controller/restore/{id}` | ADMIN, CONTROLLER | Restore a deleted log |
| `GET` | `/api/fuel/efficiency` | ADMIN, CONTROLLER | Fuel efficiency report for all vehicles |

#### Analytics Endpoints (All Roles)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/fuel/summary` | ALL | Current month fuel summary |
| `GET` | `/api/fuel/chart` | ALL | Monthly chart data |
| `GET` | `/api/fuel/stats` | ALL | Per-vehicle fuel statistics |
| `GET` | `/api/fuel/log/{id}` | ALL | Get any fuel log by ID |
| `GET` | `/api/fuel/vehicle/{regNo}` | ALL | All logs for a specific vehicle |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/fuel/add**
```json
// Request Body
{
  "vehicleRegNumber": "ABC-1234",
  "liters": 45.5,
  "costPerLiter": 380.00,
  "currentMileageKm": 15800,
  "fuelDate": "2026-05-15"
}

// Response (201 Created)
{
  "success": true,
  "message": "Fuel log added successfully",
  "data": {
    "id": 12,
    "liters": 45.5,
    "totalCost": 17290.00,
    "efficiencyKmPerLiter": 8.2
  }
}
```

**GET /api/fuel/summary**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Monthly summary retrieved successfully",
  "data": {
    "totalLiters": 320.5,
    "totalCost": 121790.00,
    "avgEfficiency": 9.1,
    "month": "2026-05"
  }
}
```
</details>

---

### 🔧 Service Records — `/api/services`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/services` | ALL | Create a service record |
| `GET` | `/api/services` | ALL | Get all service records |
| `GET` | `/api/services/{id}` | ALL | Get one service record by ID |
| `PUT` | `/api/services/{id}` | ALL | Update a service record |
| `DELETE` | `/api/services/{id}` | ADMIN, CONTROLLER | Delete a service record (soft-delete) |
| `POST` | `/api/services/filter` | ALL | Filter records by vehicle, type, date range |
| `GET` | `/api/services/vehicle/{regNo}` | ALL | All services for a specific vehicle |
| `GET` | `/api/services/stats` | ALL | Service statistics (Driver gets own vehicle only) |
| `GET` | `/api/services/upcoming` | ALL | Services due within 30 days |
| `GET` | `/api/services/recent` | ALL | Last 5 service records |
| `POST` | `/api/services/{id}/attachment` | ALL | Upload a bill/receipt file |
| `GET` | `/api/services/{id}/attachment` | ALL | View/download the attached bill |
| `GET` | `/api/services/{id}/history` | ALL | Full edit audit trail for a record |
| `GET` | `/api/services/deleted` | ADMIN, CONTROLLER | View soft-deleted records |
| `PATCH` | `/api/services/{id}/restore` | ADMIN, CONTROLLER | Restore a deleted record |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/services**
```json
// Request Body
{
  "vehicleRegNumber": "ABC-1234",
  "serviceType": "OIL_CHANGE",
  "serviceDate": "2026-05-10",
  "currentMileageKm": 15000,
  "serviceCost": 4500.00,
  "technicianWorkshop": "City Auto Workshop",
  "nextServiceDue": "2026-08-10",
  "nextServiceMileageKm": 20000,
  "serviceClassification": "ROUTINE",
  "description": "Engine oil and filter replaced"
}

// Response (201 Created)
{
  "success": true,
  "message": "Service record created successfully",
  "data": {
    "id": 5,
    "serviceType": "OIL_CHANGE",
    "vehicleRegNumber": "ABC-1234",
    "serviceDate": "2026-05-10"
  }
}
```

**POST /api/services/filter**
```json
// Request Body
{
  "vehicleRegNumber": "ABC-1234",
  "serviceType": "OIL_CHANGE",
  "startDate": "2026-01-01",
  "endDate": "2026-06-30"
}
```

**GET /api/services/stats**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Service stats fetched successfully",
  "data": {
    "totalRecords": 24,
    "completed": 18,
    "scheduled": 6,
    "totalCost": 125000.00,
    "overdueCount": 2
  }
}
```
</details>

---

### 👤 Users — `/api/users`

#### Own Profile (Any Logged-in User)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users/me` | ALL | Get own profile |
| `PUT` | `/api/users/me` | ALL | Update own profile |
| `PUT` | `/api/users/me/password` | ALL | Change own password |

#### Admin / Controller Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users` | ADMIN, CONTROLLER | Get all users |
| `POST` | `/api/users` | ADMIN, CONTROLLER | Create a new user |
| `GET` | `/api/users/{id}` | ADMIN, CONTROLLER | Get user by ID |
| `PUT` | `/api/users/{id}` | ADMIN, CONTROLLER | Update a user |
| `DELETE` | `/api/users/{id}` | ADMIN, CONTROLLER | Delete a user |
| `GET` | `/api/users/drivers` | ADMIN, CONTROLLER | Get all active drivers |
| `GET` | `/api/users/pending` | ADMIN, CONTROLLER | Get users awaiting approval |
| `PATCH` | `/api/users/{id}/approve` | ADMIN, CONTROLLER | Approve a pending user |
| `PATCH` | `/api/users/{id}/reject` | ADMIN, CONTROLLER | Reject a pending user |

<details>
<summary>📋 Request / Response Examples</summary>

**GET /api/users/me**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "id": 3,
    "userName": "john_driver",
    "firstName": "John",
    "lastName": "Smith",
    "role": "DRIVER",
    "accountStatus": "ACTIVE"
  }
}
```

**PUT /api/users/me/password**
```json
// Request Body
{
  "currentPassword": "oldpass123",
  "newPassword": "newSecure456"
}
```
</details>

---

### 🔔 Notifications — `/api/notifications`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/notifications` | ALL | Get all notifications |
| `GET` | `/api/notifications/unread` | ALL | Get only unread notifications |
| `POST` | `/api/notifications` | ALL | Create a new notification |
| `PATCH` | `/api/notifications/{id}/read` | ALL | Mark one notification as read |
| `PATCH` | `/api/notifications/read-all` | ALL | Mark all notifications as read |

<details>
<summary>📋 Request / Response Examples</summary>

**GET /api/notifications/unread**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Unread notifications fetched successfully",
  "data": [
    {
      "id": 7,
      "message": "Vehicle ABC-1234 service is overdue",
      "type": "SERVICE_ALERT",
      "read": false,
      "createdAt": "2026-06-01T08:30:00"
    }
  ]
}
```
</details>

---

### 🚨 Alerts — `/api/alerts`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/alerts/dashboard` | ADMIN, CONTROLLER | Get service-due and document-expiry alerts for the dashboard |

<details>
<summary>📋 Response Example</summary>

**GET /api/alerts/dashboard**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Dashboard alerts retrieved successfully",
  "data": {
    "serviceDueAlerts": [
      { "vehicleRegNumber": "ABC-1234", "serviceType": "OIL_CHANGE", "status": "OVERDUE" }
    ],
    "documentExpiryAlerts": [
      { "vehicleRegNumber": "XYZ-5678", "docType": "insurance", "daysUntilExpiry": 12 }
    ]
  }
}
```
</details>

---

### 👥 Employees — `/api/employees`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/employees` | ALL | Create a new employee record |
| `GET` | `/api/employees` | ALL | Get all employees |
| `GET` | `/api/employees/{id}` | ALL | Get employee by ID |
| `PUT` | `/api/employees/{id}` | ALL | Update employee record |
| `DELETE` | `/api/employees/{id}` | ALL | Delete employee record |

---

### 📦 Postman Collections

Ready-to-import collections are included in `V-Mas Backend/`:

| File | Contents |
|------|----------|
| `VMAS_Postman_Collection.json` | Auth, Vehicle, User, Employee endpoints |
| `Fuel_Analysis_Complete_Postman_Collection.json` | Full fuel management and analytics suite |
| `Service_API_Postman_Collection.json` | Service record endpoints |
| `VMAS_Local_Environment.postman_environment.json` | Pre-configured `baseUrl` and `token` variables |

**How to import:**
1. Open Postman → **Import** → select the `.json` files above
2. Set `baseUrl` = `http://localhost:8080` in the environment
3. Run **POST /api/auth/login** first and copy the token into the `token` environment variable
4. All other requests will use `Bearer {{token}}` automatically

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
