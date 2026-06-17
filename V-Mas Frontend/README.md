# 🚗 V-MAS: Smart Vehicle Service Management System

> A premium, modern, and feature-rich fleet management platform designed to streamline vehicle tracking, maintenance services, fuel analytics, and user administration.

***

## 🌐 Live Application

### 🔗 **[👉 CLICK HERE TO LAUNCH V-MAS LIVE SITE 👈](https://v-mas.vercel.app)**
*(Use credentials: **admin** / **admin123** to test)*

***

## 🌟 Key Modules & Features

| Module | Icon | Description | Key Capabilities |
| :--- | :---: | :--- | :--- |
| **Interactive Dashboard** | 📊 | Real-time system monitoring | Overview of fleet metrics, service statuses, fuel logs, and system health widgets. |
| **Fleet Management** | 🚗 | Comprehensive vehicle logging | Register, update, and manage vehicle details including model, status, and assignments. |
| **Service & Maintenance** | 🛠️ | Service lifecycle tracking | Track servicing records, schedule maintenance, and monitor status updates (Pending/In Progress/Completed). |
| **Fuel Management** | ⛽ | Consumption and analytics | Log fuel usage, analyze fuel efficiency (km/L metrics), and track monthly expenditures. |
| **Location Tracking** | 📍 | Route visualization | Real-time visual tracking of vehicles across registered service routes. |
| **User Administration** | 👥 | Role and permission management | Admin controls to view, register, edit, and control system access for users and drivers. |
| **Reports & Logs** | 📈 | Data export and summary | Generate historical data summaries, export logs, and compile fleet-wide analytics. |

***

## ⚙️ Technology Stack & Architecture

### 💻 Frontend
* **Core:** React (Vite-powered build tool)
* **Performance:** Eagerly & lazily code-split components for fast initial load times
* **Styling:** Custom Modern Vanilla CSS (tailored HSL colors, sleek dark mode, glassmorphism, responsive grid layouts)
* **Hosting:** [Vercel](https://v-mas.vercel.app)

### ⚙️ Backend & Database
* **Backend Framework:** Spring Boot (Java) running on Corretto 17
* **Database:** AWS RDS (MySQL)
* **Deployment:** AWS Elastic Beanstalk (Single-Instance Environment)

### 🔒 Secure Proxy Chain & Architecture
To ensure secure HTTPS communication, prevent CORS issues, and route traffic efficiently, requests follow this flow:

```
[ Browser / Client ]  ---(HTTPS)--->  [ Vercel (v-mas.vercel.app) ]
                                                   |
                                            (Server-side Proxy)
                                                   v
[ Spring Boot Backend ] <---(HTTP)--- [ AWS CloudFront (d3dqxbt72t73lz) ]
          |
     (JDBC Connection)
          v
[ AWS RDS MySQL Database ]
```

***

## 🛠️ Local Development & Setup

### Prerequisites
* **Node.js** v18 or later
* **npm** v9 or later

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RavinduWanasinghe0524/V---Mas.git
   cd V---Mas/V-Mas Frontend
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Launch the development server:**
   ```bash
   npm run dev
   ```
   *The local app will run at `http://localhost:5173`.*

4. **API Configuration:**
   * In local development, the Vite dev server proxies API requests to the backend.
   * In production, Vercel routes `/api/*` requests to the CloudFront distribution endpoint.

***

## 🌐 Production URL Summary
* **Live Web App:** [https://v-mas.vercel.app](https://v-mas.vercel.app)
* **Production API Gateway (CloudFront):** `https://d3dqxbt72t73lz.cloudfront.net`
* **Elastic Beanstalk Backend Instance:** `http://vmas-backend-env.eba-arpg3c5y.ap-southeast-1.elasticbeanstalk.com`
