# 🚗 V-MAS – Smart Vehicle Management & Authentication System

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.6-brightgreen?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Java](https://img.shields.io/badge/Java-17%2B%20%2F%2022-ED8B00?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![AWS](https://img.shields.io/badge/AWS-S3%20%7C%20RDS%20%7C%20CloudFront-232F3E?logo=amazonwebservices&logoColor=white)](https://aws.amazon.com/)
[![SendGrid](https://img.shields.io/badge/SendGrid-4.10.2-0085FF?logo=sendgrid&logoColor=white)](https://sendgrid.com/)
[![Twilio](https://img.shields.io/badge/Twilio-10.6.1-F22F46?logo=twilio&logoColor=white)](https://www.twilio.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel&logoColor=white)](https://v-mas.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, full-stack fleet operations, logistics dispatching, and driver telemetry platform. Built with **Spring Boot 3** on the backend and **React 19 + Vite 8** on the frontend, featuring role-based access control, real-time dispatching with SMS/Email notifications, multi-storage document management (AWS S3 & Local), predictive maintenance scheduling, fuel efficiency analytics, client-side PDF/Excel reporting, and a dark-mode-first glassmorphism UI.

---

## 🌐 Live Application & Credentials

### 🔗 **[👉 CLICK HERE TO LAUNCH V-MAS 👈](https://v-mas.vercel.app)**

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **ADMIN** | `admin` | `admin123` | Full system access — all fleet records, user administration & approvals, reports, intervals, and settings |
| **CONTROLLER** | `controller1` | `controller123` | Fleet logistics — vehicle management, trip dispatching, driver approvals, fleet fuel & service records |
| **DRIVER** | `driver1` | `driver123` | Driver portal — assigned vehicle dashboard, personal trip actions (accept/decline/complete), personal fuel logging & service history |

> ⚠️ **Note:** For production deployments, change default passwords immediately upon initial configuration.

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features & Modules](#-key-features--modules)
- [System Architecture & Cloud Topology](#-system-architecture--cloud-topology)
- [Security & Authentication Architecture](#-security--authentication-architecture)
- [Technology Stack](#-technology-stack)
- [Storage Architecture (AWS S3 & Local)](#-storage-architecture-aws-s3--local)
- [Core Algorithms & Telemetry Processing](#-core-algorithms--telemetry-processing)
- [Database Schema & PostConstruct Migrations](#-database-schema--postconstruct-migrations)
- [Prerequisites](#-prerequisites)
- [Getting Started & Local Development](#-getting-started--local-development)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend Setup (Spring Boot)](#2-backend-setup-spring-boot)
  - [3. Frontend Setup (React + Vite)](#3-frontend-setup-react--vite)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [Complete REST API Reference](#-complete-rest-api-reference)
  - [🔑 Authentication & Password Reset (`/api/auth`)](#-authentication--password-reset-apiauth)
  - [👤 User & Driver Management (`/api/users`)](#-user--driver-management-apiusers)
  - [🚗 Vehicle Fleet Management (`/api/vehicles`)](#-vehicle-fleet-management-apivehicles)
  - [🗺️ Trips & Dispatch Logistics (`/api/trips`)](#️-trips--dispatch-logistics-apitrips)
  - [⛽ Fuel Logging & Analytics (`/api/fuel`)](#-fuel-logging--analytics-apifuel)
  - [🔧 Service Records & Intervals (`/api/services`)](#-service-records--intervals-apiservices)
  - [🚨 Dashboard Alerts (`/api/alerts`)](#-dashboard-alerts-apialerts)
  - [🔔 System Notifications (`/api/notifications`)](#-system-notifications-apinotifications)
  - [👥 Employee Directory (`/api/employees`)](#-employee-directory-apiemployees)
- [Postman API Collections](#-postman-api-collections)
- [Project Directory Structure](#-project-directory-structure)
- [Deployment Guide](#-deployment-guide)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License & Authors](#-license--authors)

---

## 🌟 Project Overview

**V-MAS** (Vehicle Management & Authentication System) is designed to streamline corporate fleet operations, bridge communication between controllers and drivers, and automate maintenance and compliance.

### Core Value Propositions:
- **Operational Efficiency**: Role-specific dashboards presenting immediate operational summaries for Admins, Controllers, and Drivers.
- **Logistics Dispatch**: Real-time dispatching with automated SMS notifications sent to drivers via Twilio, tracking trips through `ASSIGNED` → `STARTED` → `COMPLETED` / `DECLINED`.
- **Cost Reduction**: Analytical tracking of fuel efficiency (km/L) and maintenance expenses to highlight fleet inefficiencies.
- **Predictive Safety & Compliance**: Dynamic service intervals by vehicle type, automatic threshold alerts (`DUE_SOON` / `OVERDUE`), and document expiry tracking (Insurance, Revenue License).
- **Data Portability**: Highly styled, client-side branded PDF and Excel exports (7 report types) representing fleet utilization and historical trends.

---

## 🚀 Key Features & Modules

### 🔐 1. Authentication & Role-Based Access Control (RBAC)
- **Unified Auth Portal** – Single `/login` and `/signup` route handled by `AuthPage.jsx` with animated tab transitions.
- **Stateless JWT Security** – Secure JWT authentication filter with 24-hour token lifecycles.
- **Multi-Stage User Approvals** – Self-registered accounts start in `PENDING` status. Controllers can approve/reject Drivers and Controllers; Admins retain exclusive approval over Admin accounts.
- **Cryptographic Password Reset** – Single-use, time-limited token flow via SendGrid transactional emails with direct link to `ResetPasswordPage.jsx`.
- **User Profile Hub** – Detailed profile view with avatar uploads, password change dialogs, and driver license uploads.

### 🚗 2. Vehicle Fleet Management & 360° Profile Hub
- **Complete Registry** – Track Make, Model, Year, Fuel Type, Registration Number, Current Mileage, and Tank Capacity.
- **Dynamic Driver Assignment** – Assign or unassign drivers with historical audit logs (`/api/vehicles/{id}/assign-driver`).
- **Dedicated Vehicle Profile (`/vehicle/:regNo`)** – 360-degree inspection page displaying specifications, live odometer, assignment status, maintenance timeline, fuel efficiency graph, attached documents, and direct quick actions.
- **Bulk Mileage Updates** – Bulk odometer synchronizer endpoint (`/api/vehicles/bulk-mileage`) for fleet-wide mileage maintenance.
- **Document Management** – Upload and stream insurance certificates and revenue licenses with expiry monitoring.
- **Soft-Delete & Restore** – Safe deletion mechanics with complete restoration capabilities.

### 🗺️ 3. Trips & Dispatch Logistics (Jobs Management)
- **Job Dispatching** – Controllers and Admins dispatch trips specifying origin, destination, cargo/purpose, scheduled date, vehicle, and driver.
- **Twilio SMS Alerts** – Automated SMS sent to the assigned driver upon trip assignment.
- **Driver Trip Workflow** – Drivers view assigned jobs in `TripsPage.jsx`, accept and start trips (`STARTED`), decline with a stated reason (`DECLINED`), or mark completed (`COMPLETED`).
- **Audit & Soft-Delete** – Cancel, soft-delete, and restore trip records with comprehensive audit history.

### ⛽ 4. Fuel Logging & Efficiency Analytics
- **Consecutive Odometer Validation** – Current mileage must be $\ge$ the previous reading. Live "km driven" indicator pre-calculates fuel efficiency upon entry.
- **Baseline Mileage Fallback** – First fuel entry calculates efficiency based on vehicle registration baseline mileage.
- **Controller Oversight** – View, edit, soft-delete, restore, approve, or reject fleet fuel entries.
- **Analytics Dashboard** – Monthly charts, per-vehicle statistics, cost trends, and efficiency classification (Excellent / Good / Average / Poor).

### 🔧 5. Service Records & Dynamic Maintenance Intervals
- **Categorized Maintenance** – Service classification: *Routine*, *Preventive*, *Corrective*, *Emergency*.
- **Configurable Intervals by Vehicle Type** – Set odometer and month thresholds for `CAR`, `VAN`, `LORRY`, and `BUS` (`/api/services/intervals`).
- **Predictive Service Alerts** – Flags vehicles as `DUE_SOON` when within 200 km or 7 days of threshold, and `OVERDUE` when exceeded.
- **Bill Attachments** – Upload invoices and receipts stored on AWS S3 or local filesystem with dynamic MIME streaming.
- **Approval Lifecycle & Audit Trail** – Track all edits in `ServiceRecordAudit` and enforce approval/rejection workflows.

### 📊 6. Enterprise Reporting Engine
- **Branded Excel Reports (`ExcelJS`)** – 7 structured workbooks:
  1. *Vehicle Summary Report*
  2. *Fuel Consumption Report*
  3. *Service & Maintenance Report*
  4. *User Directory Report*
  5. *Fuel Efficiency Report*
  6. *Cost Analysis Report*
  7. *Comprehensive Master Report*
  - Includes KPI summary cards, brand header palettes, currency formatting, and dynamic auto-fit column widths.
- **Formatted PDF Reports (`jsPDF + jspdf-autotable`)** – Vector PDF exports with clean grid tables, cost totals, and status indicators.

### 📍 7. Real-Time Telemetry & Interactive Visualizations
- **Location & Fleet Status Mockup (`LocationPage.jsx`)** – Interactive dark-themed SVG map with live vehicle position indicators, speed badges (`MOVING`, `IDLE`, `PARKED`), and inspection cards.
- **Fleet Utilization Area Chart** – Pulsing SVG area chart with animated gradient overlays and hover tooltip tracking.
- **Status Breakdown Donut Chart** – Custom-calculated SVG donut chart representing active, maintenance, and available fleet splits.
- **Monthly Cost Trend Chart** – Interactive SVG grouped bar chart comparing fuel expenses and maintenance costs month-by-month.
- **User Distribution Donut Chart** – Interactive breakdown switching between User Roles and Account Statuses.

### 🔔 8. Alerts & Notification Center
- **Dashboard Alerts Aggregation** – Real-time aggregation of service-due and document-expiry milestones (`/api/alerts/dashboard`).
- **In-App Notification Center** – Topbar bell counter with unread badges, mark-as-read, and clear-all capabilities.

---

## 🏗️ System Architecture & Cloud Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT BROWSER (SPA)                             │
│       React 19 + Vite 8  │  React Router DOM v7  │  AuthContext / Theme     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE NETWORK (HOSTING)                       │
│  SPA Static Assets  │  vercel.json Rewrites: /api/* ──► CloudFront CDN     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS Proxy
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AWS CLOUDFRONT API GATEWAY / CDN                      │
│                SSL Termination & Reverse Proxy to Backend                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / HTTPS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SPRING BOOT 3.5.6 (AWS / DOCKER)                        │
│                                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Security & Filters      │  │ REST Controllers (/api/*)                │  │
│  │ • JwtAuthentication     │  │ • AuthController     • VehicleController │  │
│  │ • CustomUserDetailsService│ • TripController     • FuelController    │  │
│  │ • Role Access Security  │  │ • ServiceController  • UserController    │  │
│  └────────────┬────────────┘  │ • AlertController    • NotificationCtrl │  │
│               │               └────────────────────┬─────────────────────┘  │
│               ▼                                    ▼                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Service & Business Logic Layer                                        │  │
│  │ • VehicleService  • TripService  • FuelService  • ServiceRecordService│  │
│  │ • PasswordResetService (SendGrid) • StorageService (S3 / Local Disk)  │  │
│  │ • TwilioSmsService                • ServiceIntervalService            │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ JPA / Hibernate                      │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  AWS RDS MySQL   │          │  AWS S3 BUCKET   │          │ THIRD-PARTY APIs │
│  (ap-southeast-1)│          │  (Document / Bill│          │ • SendGrid Email │
│  vmas_db Schema  │          │   Attachments)   │          │ • Twilio SMS API │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

---

## 🔒 Security & Authentication Architecture

### 🛡️ Backend Security (`SecurityConfig.java`)
- **Stateless JWT Filter (`JwtAuthenticationFilter.java`)**: Intercepts requests, validates `Authorization: Bearer <token>`, and populates Spring Security context.
- **Account State Gatekeeper (`CustomUserDetailsService.java`)**: Soft-deleted users are denied lookup. Users with status other than `ACTIVE` fail with `DisabledException`.
- **Method-Level Security (`@PreAuthorize`)**: Strict role constraints (`ADMIN`, `CONTROLLER`, `DRIVER`).
- **REST Exception Handlers**:
  - `RestAuthenticationEntryPoint` returns structured JSON on `401 Unauthorized`.
  - `RestAccessDeniedHandler` returns structured JSON on `403 Forbidden`.
- **Role Isolation Policy**:
  - **Controllers** cannot modify Admin accounts, elevate user roles to `ADMIN`, or delete Admin/Controller accounts.
  - In the approval queue, Controllers are constrained to approving only `DRIVER` and `CONTROLLER` accounts.
  - **Drivers** are restricted to their assigned vehicles, personal trips, personal fuel logs, and personal service records.

### 🛡️ Frontend Security (`api.js` & `AuthContext.jsx`)
- **Axios Request Interceptor**: Automatically attaches the JWT token from `localStorage` to outbound HTTP headers.
- **Axios Response Interceptor**: Detects global `401 Unauthorized` responses (excluding login/registration endpoints), invalidates cached sessions, and redirects to `/login`.
- **Protected Route Guards (`PrivateRoute.jsx`)**: Enforces authentication and authorization boundaries before rendering view components.

---

## 💻 Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Java** | 17 LTS / 22 | Core Programming Language |
| **Spring Boot** | 3.5.6 | Enterprise Application Framework |
| **Spring Security** | 6.x | Authentication & Method-Level Authorization |
| **JJWT** | 0.11.5 | JSON Web Token Generation & Validation |
| **Spring Data JPA / Hibernate** | 6.x | Object-Relational Mapping (ORM) & Persistence |
| **MySQL Connector/J** | 8.x / 9.x | JDBC Driver |
| **AWS SDK for Java (v2) - S3** | 2.29.35 | Cloud Document & File Attachment Storage |
| **SendGrid Java SDK** | 4.10.2 | Transactional Emails & Password Reset Tokens |
| **Twilio Java SDK** | 10.6.1 | SMS Dispatch Notifications |
| **springdoc-openapi** | 2.8.6 | OpenAPI 3.0 / Swagger UI Documentation |
| **Flyway** | 10.x | Database Migrations & Versioning |
| **Lombok** | 1.18.x | Boilerplate Code Reduction |
| **Maven** | 3.9+ | Dependency Management & Build Automation |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2.4 | Modern Component-Driven SPA Framework |
| **Vite** | 8.0.1 | Next-Generation Build Tool & Dev Server |
| **React Router DOM** | 7.13.1 | Declarative Client-Side Routing |
| **Axios** | 1.13.6 | Promise-Based HTTP Client with Interceptors |
| **Lucide React** | 1.7.0 | UI Icon System |
| **ExcelJS** | 3.4.0 | Client-Side Styled Excel (.xlsx) Report Builder |
| **jsPDF** | 4.2.1 | Client-Side Vector PDF Generator |
| **jspdf-autotable** | 5.0.7 | Tabular PDF Layout Engine |
| **Vanilla CSS** | Modern CSS | Design Tokens, Glassmorphism, Dark-Mode First UI |

---

## 💾 Storage Architecture (AWS S3 & Local)

V-MAS uses an interface-driven storage strategy (`StorageService.java`):

```
                     ┌──────────────────────────┐
                     │   StorageService (API)   │
                     └─────────────┬────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
┌──────────────────────────┐               ┌──────────────────────────┐
│  LocalStorageService     │               │     S3StorageService     │
│  • Local disk storage    │               │  • AWS SDK v2 (S3Client) │
│  • uploads/ directory    │               │  • AWS S3 Bucket         │
│  • Default dev fallback  │               │  • Production scalable   │
└──────────────────────────┘               └──────────────────────────┘
```

- **Dynamic Activation**: If `AWS_S3_BUCKET` is configured, `S3StorageService` handles all document uploads; otherwise, it falls back seamlessly to `LocalStorageService`.
- **Dynamic Content-Type Streaming**: Server probes file extensions (`.pdf`, `.png`, `.jpg`, `.webp`, `.svg`, `.avif`) to stream files inline or with attachment headers.

---

## 🧮 Core Algorithms & Telemetry Processing

### 1. Sequential Fuel Efficiency Progression (`fuelUtils.js` & `FuelServiceImpl.java`)
$$\text{Efficiency (km/L)} = \frac{\text{Current Mileage} - \text{Previous Mileage}}{\text{Liters}}$$
- Fuel logs are sorted chronologically per vehicle.
- If an entry is the vehicle's first log, the vehicle's initial baseline registration odometer is used as the predecessor to ensure efficiency data is available from entry #1.
- Validates that consecutive odometer entries never decrement.

### 2. Predictive Maintenance Alert Thresholds (`serviceAlertUtils.js` & `AlertServiceImpl.java`)
- **Distance Alert**: $\Delta d = \text{Target Mileage} - \text{Current Mileage}$. If $\Delta d \le 200\text{ km} \rightarrow \text{DUE\_SOON}$; if $\text{Current} > \text{Target} \rightarrow \text{OVERDUE}$.
- **Date Alert**: If scheduled date is within $7\text{ days} \rightarrow \text{DUE\_SOON}$; if $\text{Scheduled Date} < \text{Today} \rightarrow \text{OVERDUE}$.
- **Precedence Hierarchy**: $\text{OVERDUE} > \text{DUE\_SOON} > \text{OK}$.

### 3. Styled Excel Workbook Generator (`excelExport.js`)
- Dynamically renders 7 report types with brand color palettes, summary KPI card blocks, auto-fit column width algorithms ($12 \le \text{width} \le 40$), and localized currency formats (`Rs. #,##0.00`).

---

## ⚙️ Database Schema & PostConstruct Migrations

V-MAS uses a dual-layer strategy to handle schema consistency safely:

1. **Idempotent Post-Initialization Migrations (`SchemaMigrationConfig.java`)**:
   - Executes dynamic schema adjustments at startup via `JdbcTemplate`.
   - Cleans up deprecated foreign keys, legacy columns, and alters nullability for controller-uploaded logs.
2. **Flyway Migrations (`db/migration/`)**:
   - `V002__Expand_Profile_Picture_Column.sql` – Expands avatars to `LONGTEXT` for high-resolution base64 encoding.
   - `V003__Add_Audit_Columns_To_Vehicles.sql` – Adds vehicle audit columns.
   - `V004__Fix_Fuel_Log_Mileage_Column.sql` – Standardizes fuel log odometer schema.

### Core Database Entities:
- **`users`** – User profiles, hashed passwords (BCrypt), roles (`ADMIN`, `CONTROLLER`, `DRIVER`), account status, license documents.
- **`vehicles`** – Vehicle specifications, license plate, status (`AVAILABLE`, `ASSIGNED`, `UNDER_MAINTENANCE`), assigned driver ID, document URLs.
- **`trips`** – Dispatch logistics records, origin, destination, driver, scheduled date, trip status (`ASSIGNED`, `STARTED`, `DECLINED`, `COMPLETED`, `CANCELLED`).
- **`fuel_logs`** – Fuel volume, cost per liter, current mileage, calculated efficiency, driver association, approval status, soft-delete flags.
- **`service_records`** – Maintenance history, service type, cost, garage, target mileage/date, invoice attachments, approval status.
- **`service_record_audits`** – Historical diff audit log for every change made to a service record.
- **`service_intervals`** – Threshold configurations by vehicle type (`CAR`, `VAN`, `LORRY`, `BUS`).
- **`password_reset_tokens`** – Single-use cryptographic reset tokens with expiration timestamps.
- **`notifications`** – System-wide in-app notifications and read statuses.
- **`employees`** – Employee directory records.

---

## 📋 Prerequisites

- **Java Development Kit (JDK)**: Java 17+ (Tested on Java 17 LTS and Java 22)
- **Maven**: 3.6+ (or use the included `./mvnw` / `mvnw.cmd` wrapper)
- **Node.js**: 18.x or 20.x+ & **npm** 9.x+
- **MySQL / MariaDB**: 8.0+ / 10.4+ (Optional for local override; backend connects to AWS RDS by default)

---

## 🛠️ Getting Started & Local Development

### 1. Database Setup

The backend connects to a **shared AWS RDS MySQL instance** by default. No local database configuration is required out of the box.

> **Optional (Local Database Override):**
> If you prefer running a local database instance:
> ```bash
> mysql -u root -p < "V-Mas Backend/setup-database.sql"
> ```

### 2. Backend Setup (Spring Boot)

```bash
# Navigate to backend directory
cd "V-Mas Backend"

# Run backend with Maven wrapper
# Windows:
.\mvnw.cmd spring-boot:run

# macOS / Linux:
./mvnw spring-boot:run
```

- **REST API Base URL**: `http://localhost:8080`
- **Interactive Swagger UI**: `http://localhost:8080/swagger-ui/index.html`
- **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`

To build an executable production JAR:
```bash
./mvnw clean package -DskipTests
java -jar target/vmas-backend-0.0.1-SNAPSHOT.jar
```

### 3. Frontend Setup (React + Vite)

```bash
# Navigate to frontend directory
cd "V-Mas Frontend"

# 1. Create local .env file from template
# Windows:
copy .env.example .env
# macOS / Linux:
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start Vite development server
npm run dev
```

- **Frontend App URL**: `http://localhost:3000` (port configured in `vite.config.js`)
- The Vite dev server automatically proxies all `/api/*` requests to `http://localhost:8080`.

---

## ⚙️ Configuration & Environment Variables

### Backend Configuration (`application.properties` / Environment Variables)

| Property / Environment Variable | Default Value | Description |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `local` | Active Spring profile (`local`, `prod`) |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://18.136.227.181:3306/vmas_db...` | MySQL JDBC connection string |
| `SPRING_DATASOURCE_USERNAME` | `admin` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | `Vmas2026` | Database password |
| `jwt.secret` | `5367566B59703373367639792F...` | HMAC-SHA secret key for JWT signing |
| `jwt.expiration` | `86400000` (24 Hours) | JWT token lifespan in milliseconds |
| `AWS_S3_BUCKET` | *(Optional)* | AWS S3 bucket name for uploads |
| `AWS_REGION` | *(Optional)* | AWS Region (e.g. `ap-southeast-1`) |
| `AWS_ACCESS_KEY_ID` | *(Optional)* | AWS IAM Access Key |
| `AWS_SECRET_ACCESS_KEY` | *(Optional)* | AWS IAM Secret Key |
| `SENDGRID_API_KEY` | *(Optional)* | SendGrid API Key for password reset emails |
| `MAIL_FROM_EMAIL` | `noreply@yourdomain.com` | Verified SendGrid sender email address |
| `MAIL_FROM_NAME` | `V-MAS` | Sender display name |
| `APP_FRONTEND_URL` | `https://v-mas.vercel.app` | Frontend base URL for email reset links |
| `TWILIO_ACCOUNT_SID` | *(Optional)* | Twilio Account SID for SMS dispatch |
| `TWILIO_AUTH_TOKEN` | *(Optional)* | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | *(Optional)* | Twilio verified phone number |

### Frontend Configuration (`V-Mas Frontend/.env`)

```env
# Local development base URL (or leave blank to use Vite proxy)
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## 📡 Complete REST API Reference

> 🔐 **Authorization Policy**: All endpoints (except `/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`) require the header:
> ```http
> Authorization: Bearer <your_jwt_token>
> ```

---

### 🔑 Authentication & Password Reset (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account (starts as `PENDING`) |
| `POST` | `/api/auth/login` | Public | Authenticate with credentials and receive JWT |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate current user session |
| `POST` | `/api/auth/forgot-password` | Public | Send password reset link to user's registered email |
| `POST` | `/api/auth/reset-password` | Public | Validate token and set new password |

<details>
<summary>📋 View Auth Payloads</summary>

**POST `/api/auth/login` Request:**
```json
{
  "userName": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
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

**POST `/api/auth/forgot-password` Request:**
```json
{
  "email": "driver@example.com"
}
```
</details>

---

### 👤 User & Driver Management (`/api/users`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | ALL | Retrieve logged-in user profile |
| `PUT` | `/api/users/me` | ALL | Update personal profile details / avatar |
| `PUT` | `/api/users/me/password` | ALL | Change personal account password |
| `GET` | `/api/users` | ADMIN, CONTROLLER | Fetch all user accounts |
| `POST` | `/api/users` | ADMIN, CONTROLLER | Create a new user account |
| `GET` | `/api/users/{id}` | ALL (Self/Admin/Ctrl) | Fetch user details by ID |
| `PUT` | `/api/users/{id}` | ADMIN, CONTROLLER | Update user details and role |
| `DELETE` | `/api/users/{id}` | ADMIN, CONTROLLER | Soft-delete a user account |
| `GET` | `/api/users/pending` | ADMIN, CONTROLLER | Fetch users awaiting registration approval |
| `PATCH` | `/api/users/{id}/approve` | ADMIN, CONTROLLER | Approve pending account registration |
| `PATCH` | `/api/users/{id}/reject` | ADMIN, CONTROLLER | Reject pending account registration |
| `GET` | `/api/users/drivers` | ADMIN, CONTROLLER | Fetch active drivers list |
| `GET` | `/api/users/deleted` | ADMIN, CONTROLLER | Fetch soft-deleted users |
| `PATCH` | `/api/users/{id}/restore` | ADMIN, CONTROLLER | Restore soft-deleted user |
| `POST` | `/api/users/{id}/document/{docType}` | ALL (Self/Admin/Ctrl) | Upload user document (e.g. `license`) |
| `GET` | `/api/users/{id}/document/{docType}` | ALL (Self/Admin/Ctrl) | Download / stream user document |

---

### 🚗 Vehicle Fleet Management (`/api/vehicles`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/vehicles` | ALL | Get all active fleet vehicles |
| `POST` | `/api/vehicles` | ADMIN, CONTROLLER | Register a new vehicle |
| `GET` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Get vehicle details by ID |
| `GET` | `/api/vehicles/registration/{regNo}` | ALL | Fetch vehicle by registration number |
| `GET` | `/api/vehicles/my-vehicle` | DRIVER, ADMIN, CTRL | Get vehicle currently assigned to logged-in driver |
| `PUT` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Update vehicle specifications and mileage |
| `DELETE` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Soft-delete a vehicle |
| `PATCH` | `/api/vehicles/{id}/restore` | ADMIN, CONTROLLER | Restore soft-deleted vehicle |
| `PATCH` | `/api/vehicles/{id}/assign-driver` | ADMIN, CONTROLLER | Assign or unassign driver to vehicle |
| `POST` | `/api/vehicles/bulk-mileage` | ADMIN, CONTROLLER | Bulk update mileages across multiple vehicles |
| `GET` | `/api/vehicles/deleted` | ADMIN, CONTROLLER | Fetch all soft-deleted vehicles |
| `POST` | `/api/vehicles/{id}/document/{docType}` | ADMIN, CONTROLLER | Upload vehicle document (e.g. `insurance`, `revenue_license`) |
| `GET` | `/api/vehicles/{id}/document/{docType}` | ALL | Download / stream vehicle document |

---

### 🗺️ Trips & Dispatch Logistics (`/api/trips`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/trips` | ADMIN, CONTROLLER | Dispatch / assign a new trip to a driver |
| `GET` | `/api/trips` | ADMIN, CONTROLLER | Get all trip assignments across fleet |
| `GET` | `/api/trips/{id}` | ALL | Get single trip details |
| `PUT` | `/api/trips/{id}` | ADMIN, CONTROLLER | Update trip details |
| `DELETE` | `/api/trips/{id}` | ADMIN, CONTROLLER | Cancel a trip |
| `DELETE` | `/api/trips/{id}/delete` | ADMIN, CONTROLLER | Soft-delete trip record |
| `PATCH` | `/api/trips/{id}/restore` | ADMIN, CONTROLLER | Restore soft-deleted trip |
| `GET` | `/api/trips/deleted` | ADMIN, CONTROLLER | Fetch soft-deleted trips |
| `GET` | `/api/trips/my` | DRIVER | Get trips assigned to logged-in driver |
| `PATCH` | `/api/trips/{id}/start` | DRIVER | Driver accepts and starts trip (`STARTED`) |
| `PATCH` | `/api/trips/{id}/decline` | DRIVER | Driver declines trip with reason (`DECLINED`) |
| `PATCH` | `/api/trips/{id}/complete` | DRIVER | Driver marks trip as finished (`COMPLETED`) |

<details>
<summary>📋 View Trip Payload Examples</summary>

**POST `/api/trips` Request:**
```json
{
  "driverUsername": "driver1",
  "vehicleRegNumber": "CAB-4521",
  "origin": "Colombo Central Depot",
  "destination": "Kandy Distribution Hub",
  "purpose": "Emergency parts delivery",
  "scheduledDate": "2026-08-25"
}
```

**PATCH `/api/trips/1/decline` Request:**
```json
{
  "reason": "Scheduled maintenance conflict on assigned vehicle"
}
```
</details>

---

### ⛽ Fuel Logging & Analytics (`/api/fuel`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/fuel/add` | DRIVER | Driver logs personal fill-up |
| `GET` | `/api/fuel/my-logs` | DRIVER | Driver fetches personal fuel history |
| `GET` | `/api/fuel/my-logs/{id}` | DRIVER | Driver fetches single personal log |
| `PUT` | `/api/fuel/my-logs/{id}` | DRIVER | Driver updates personal log |
| `GET` | `/api/fuel/all` | ADMIN, CONTROLLER | Controller fetches all fleet fuel logs |
| `POST` | `/api/fuel/controller/add` | ADMIN, CONTROLLER | Controller adds fuel log for any vehicle |
| `PUT` | `/api/fuel/controller/{id}` | ADMIN, CONTROLLER | Controller updates any fuel log |
| `DELETE` | `/api/fuel/controller/{id}` | ADMIN, CONTROLLER | Controller soft-deletes a fuel log |
| `GET` | `/api/fuel/controller/deleted` | ADMIN, CONTROLLER | Controller views soft-deleted logs |
| `PATCH` | `/api/fuel/controller/restore/{id}` | ADMIN, CONTROLLER | Controller restores soft-deleted log |
| `PATCH` | `/api/fuel/controller/{id}/approve` | ADMIN, CONTROLLER | Controller approves pending fuel log |
| `PATCH` | `/api/fuel/controller/{id}/reject` | ADMIN, CONTROLLER | Controller rejects pending fuel log |
| `GET` | `/api/fuel/efficiency` | ADMIN, CONTROLLER | Full fleet fuel efficiency report |
| `GET` | `/api/fuel/summary` | ALL | Current month consumption summary |
| `GET` | `/api/fuel/chart` | ALL | Monthly aggregated chart data |
| `GET` | `/api/fuel/stats` | ALL | Per-vehicle fuel statistics |
| `GET` | `/api/fuel/vehicle/{regNo}` | ALL | All fuel logs for a specific vehicle |

---

### 🔧 Service Records & Intervals (`/api/services`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/services` | ALL (Driver/Ctrl/Admin)| Create a maintenance record |
| `GET` | `/api/services` | ALL | Get all service records |
| `GET` | `/api/services/{id}` | ALL | Get service record by ID |
| `PUT` | `/api/services/{id}` | ALL | Update service record |
| `DELETE` | `/api/services/{id}` | ADMIN, CONTROLLER | Soft-delete service record |
| `PATCH` | `/api/services/{id}/restore` | ADMIN, CONTROLLER | Restore soft-deleted record |
| `PATCH` | `/api/services/{id}/approve` | ADMIN, CONTROLLER | Approve pending service record |
| `PATCH` | `/api/services/{id}/reject` | ADMIN, CONTROLLER | Reject pending service record |
| `POST` | `/api/services/filter` | ALL | Filter records by vehicle, type, or date |
| `GET` | `/api/services/vehicle/{regNo}` | ALL | Get service records for specific vehicle |
| `GET` | `/api/services/stats` | ALL | Service KPI statistics |
| `GET` | `/api/services/upcoming` | ALL | Services due within 30 days |
| `GET` | `/api/services/recent` | ALL | Last 5 service records |
| `POST` | `/api/services/{id}/attachment` | ALL | Upload service invoice / receipt file |
| `GET` | `/api/services/{id}/attachment` | ALL | Download / view service invoice |
| `GET` | `/api/services/{id}/history` | ALL | Fetch audit history trail for a record |
| `GET` | `/api/services/intervals` | ALL | Get service intervals for all vehicle types |
| `GET` | `/api/services/intervals/vehicle-type/{type}`| ALL | Get intervals for specific vehicle type |
| `PUT` | `/api/services/intervals/{id}` | ADMIN, CONTROLLER | Update specific service interval |
| `PUT` | `/api/services/intervals` | ADMIN, CONTROLLER | Bulk update service intervals |

---

### 🚨 Dashboard Alerts (`/api/alerts`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/alerts/dashboard` | ADMIN, CONTROLLER | Service-due and document-expiry alerts |

---

### 🔔 System Notifications (`/api/notifications`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | ALL | Fetch all notifications |
| `GET` | `/api/notifications/unread` | ALL | Fetch unread notifications only |
| `POST` | `/api/notifications` | ALL | Create a new notification |
| `PATCH` | `/api/notifications/{id}/read` | ALL | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | ALL | Mark all notifications as read |

---

### 👥 Employee Directory (`/api/employees`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/employees` | ALL | Get all employees |
| `POST` | `/api/employees` | ALL | Register new employee |
| `GET` | `/api/employees/{id}` | ALL | Get employee by ID |
| `PUT` | `/api/employees/{id}` | ALL | Update employee |
| `DELETE` | `/api/employees/{id}` | ALL | Delete employee |

---

## 📦 Postman API Collections

Pre-configured Postman collections and environments are provided in the repository:

| Collection File | Location | Coverage |
|---|---|---|
| `V-MAS.postman_collection.json` | Root Directory | Complete unified system test suite |
| `VMAS_Postman_Collection.json` | `V-Mas Backend/` | Auth, User, Vehicle, Employee APIs |
| `Fuel_Analysis_Complete_Postman_Collection.json` | `V-Mas Backend/` | Complete fuel management & analytics APIs |
| `Service_API_Postman_Collection.json` | `V-Mas Backend/` | Service records, intervals, and attachments |
| `VMAS_Local_Environment.postman_environment.json`| `V-Mas Backend/` | Pre-configured `baseUrl` and `token` variables |

### Import Instructions:
1. Open Postman $\rightarrow$ Click **Import** $\rightarrow$ Select the `.json` files.
2. Select the **VMAS Local Environment**.
3. Execute **POST `/api/auth/login`**; the environment token will update automatically for subsequent calls.

---

## 📁 Project Directory Structure

```
V---Mas/
├── V-Mas Backend/
│   ├── src/main/java/net/javaguids/ems_backend/
│   │   ├── config/                      # SecurityConfig, CorsConfig, OpenApiConfig, SchemaMigrationConfig
│   │   ├── controller/                  # REST Controllers (Auth, Vehicle, Trip, Fuel, Service, User, Alert, Notification)
│   │   ├── dto/                         # Request / Response Transfer Objects
│   │   ├── entity/                      # JPA Entities (User, Vehicle, Trip, FuelLog, ServiceRecord, Audit, Interval)
│   │   ├── enums/                       # Role, AccountStatus, TripStatus, VehicleType, FuelTypes, ServiceType
│   │   ├── exception/                   # ResourceNotFoundException, GlobalExceptionHandler
│   │   ├── mapper/                      # Entity <-> DTO Mappers
│   │   ├── repository/                  # Spring Data JPA Repositories
│   │   ├── security/                    # JwtAuthenticationFilter, JwtTokenProvider, CustomUserDetailsService
│   │   ├── service/                     # Service Interfaces (EmailService, SmsService, StorageService, TripService, etc.)
│   │   │   └── impl/                    # Service Implementations (SendGridEmail, TwilioSms, S3Storage, LocalStorage, etc.)
│   │   └── util/                        # ApiResponseUtil, SecurityUtils
│   ├── src/main/resources/
│   │   ├── db/migration/                # Flyway SQL schema migration scripts
│   │   └── application.properties       # Core Spring Boot application properties
│   ├── setup-database.sql               # Base database schema & initial seed data
│   ├── Dockerfile                       # Multi-stage Docker build (Maven 3.9 -> JRE 17 Alpine)
│   ├── test-fuel-api-complete.ps1       # PowerShell fuel API smoke test script
│   ├── pom.xml                          # Maven build dependencies & configuration
│   └── mvnw / mvnw.cmd                  # Maven wrappers
│
├── V-Mas Frontend/
│   ├── src/
│   │   ├── assets/                      # Brand logos & vector illustrations
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Minimal top brand navigation
│   │   │   ├── PrivateRoute.jsx         # Role-based route guard
│   │   │   ├── Sidebar.jsx              # Collapsible role-aware navigation sidebar
│   │   │   ├── Topbar.jsx               # Header with notification dropdown & profile menu
│   │   │   └── TripActionModal.jsx      # Modal for starting/declining/completing trips
│   │   ├── context/
│   │   │   ├── AuthContext.jsx / AuthProvider.jsx   # Global JWT auth session state
│   │   │   └── ThemeContext.jsx / ThemeProvider.jsx # Theme token provider (dark-mode first)
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx / .css      # Unified Tabbed Login & Signup screen
│   │   │   ├── ResetPasswordPage.jsx    # Cryptographic Password Reset page
│   │   │   ├── DashboardPage.jsx        # Role-based interactive metric dashboards
│   │   │   ├── VehiclesPage.jsx         # Vehicle registry, filters & document uploads
│   │   │   ├── VehicleProfilePage.jsx   # 360-degree vehicle inspection hub
│   │   │   ├── TripsPage.jsx            # Job dispatching & driver trip action cards
│   │   │   ├── FuelLogPage.jsx          # Driver fuel fill-up logging
│   │   │   ├── FuelManagementPage.jsx   # Fleet fuel log administration & approvals
│   │   │   ├── FuelAnalysisPage.jsx     # Fuel efficiency charts & KPI statistics
│   │   │   ├── ServicePage.jsx          # Service record registry & upcoming alerts
│   │   │   ├── AddServicePage.jsx       # Maintenance scheduling & attachment upload
│   │   │   ├── UsersPage.jsx            # User management & pending registration approvals
│   │   │   ├── ProfilePage.jsx          # Profile self-management & license upload
│   │   │   ├── ReportsPage.jsx          # Client-side Excel & PDF report generation
│   │   │   └── LocationPage.jsx         # Fleet telemetry & interactive SVG map
│   │   ├── services/
│   │   │   └── api.js                   # Axios client instance & centralized API handlers
│   │   ├── utils/
│   │   │   ├── excelExport.js           # ExcelJS 7-workbook report generator
│   │   │   ├── fuelUtils.js             # Fuel efficiency calculation formulas
│   │   │   ├── serviceAlertUtils.js     # Maintenance due-date & mileage alert formulas
│   │   │   └── driverUtils.js           # Driver safety rating & assignment helpers
│   │   ├── App.jsx                      # Router configuration, lazy loading, ErrorBoundary
│   │   ├── index.css                    # Design system tokens, utilities & animations
│   │   └── main.jsx                     # React DOM entry point
│   ├── .env.example                     # Frontend environment template
│   ├── vercel.json                      # Vercel SPA routing and CloudFront proxy rewrites
│   ├── vite.config.js                   # Vite configuration & dev proxy
│   └── package.json                     # Frontend dependencies & scripts
│
├── V-MAS.postman_collection.json        # Root Postman Collection
├── README.md                            # Comprehensive System Documentation
└── LICENSE                              # MIT License
```

---

## 🚀 Deployment Guide

### 1. Frontend Deployment (Vercel)

The frontend is configured for deployment on **Vercel** via `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://d3dqxbt72t73lz.cloudfront.net/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

1. Connect the Git repository to Vercel.
2. Set Framework Preset to **Vite** and Root Directory to `V-Mas Frontend`.
3. Deploy. Vercel automatically builds and routes API calls to the CloudFront CDN.

### 2. Backend Deployment (Docker Container)

A production-optimized multi-stage `Dockerfile` is included in `V-Mas Backend/`:

```bash
# Build the Docker image
docker build -t vmas-backend "V-Mas Backend/"

# Run container locally with AWS RDS connection
docker run -d -p 8080:8080 --name vmas-api vmas-backend

# Run container with custom environment variables
docker run -d -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://your-db-host:3306/vmas_db" \
  -e SPRING_DATASOURCE_USERNAME="your_username" \
  -e SPRING_DATASOURCE_PASSWORD="your_password" \
  -e AWS_S3_BUCKET="your-s3-bucket" \
  -e AWS_REGION="ap-southeast-1" \
  -e SENDGRID_API_KEY="your-sendgrid-key" \
  -e TWILIO_ACCOUNT_SID="your-twilio-sid" \
  -e TWILIO_AUTH_TOKEN="your-twilio-token" \
  -e TWILIO_PHONE_NUMBER="+1234567890" \
  --name vmas-api vmas-backend
```

- **Base Image**: `eclipse-temurin:17-jre-alpine`
- **Memory Tuning**: `-Xmx300m -Xms100m -XX:+UseContainerSupport -XX:MaxRAMPercentage=60`

---

## 🧪 Testing & Quality Assurance

### PowerShell Automated Smoke Test (Fuel APIs)
```powershell
cd "V-Mas Backend"
.\test-fuel-api-complete.ps1
```

### Frontend Code Quality & Linting
```bash
cd "V-Mas Frontend"
npm run lint
```

### Production Build Validation
```bash
# Verify frontend bundle
cd "V-Mas Frontend"
npm run build

# Verify backend build
cd "V-Mas Backend"
./mvnw clean package -DskipTests
```

---

## 📄 License & Authors

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by **Capstone Group 13**  
Copyright © 2026 V-MAS Fleet Operations Platform. All rights reserved.
