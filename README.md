<div align="center">
<pre>
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║    ██   ██████  ████  ██████  ████          ████  ██  ██   ██   ██████   ║
║   ████  ██     ██       ██   ██            ██     ██  ██  ████    ██     ║
║  ██  ██ ████   ██ ███   ██    ████  ██████ ██     ██████ ██  ██   ██     ║
║  ██████ ██     ██  ██   ██       ██        ██     ██  ██ ██████   ██     ║
║  ██  ██ ██████  ████  ██████ █████          ████  ██  ██ ██  ██   ██     ║
║                                                                          ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
</pre>
</div>
<p align="center">
	<em>Fortify Your Chat with Aegis-Chat: Shielding Conversations, Empowering Connections!</em>
</p>

<p align="center">
	<img src="https://img.shields.io/github/license/ZAKARIA-ELOMARI/Aegis-Chat?style=default&logo=opensourceinitiative&logoColor=white&color=bb742d" alt="license">
	<img src="https://img.shields.io/github/last-commit/ZAKARIA-ELOMARI/Aegis-Chat?style=default&logo=git&logoColor=white&color=bb742d" alt="last-commit">
	<img src="https://img.shields.io/github/languages/top/ZAKARIA-ELOMARI/Aegis-Chat?style=default&color=bb742d" alt="repo-top-language">
	<img src="https://img.shields.io/github/languages/count/ZAKARIA-ELOMARI/Aegis-Chat?style=default&color=bb742d" alt="repo-language-count">
</p>

<br>

## 🔗 Table of Contents

- [📍 Overview](#-overview)
- [🛡️ Security Features](#-security-features)
- [⚙️ Technical Stack](#-technical-stack)
- [👾 Core Features](#-core-features)
- [🏗️ Architecture](#-architecture)
- [🚀 Getting Started](#-getting-started)
  - [☑️ Prerequisites](#-prerequisites)
  - [⚙️ Installation](#-installation)
  - [🤖 Usage](#🤖-usage)
- [📌 Project Roadmap](#-project-roadmap)
- [🔰 Contributing](#-contributing)
- [🎗 License](#-license)
- [🙌 Acknowledgments](#-acknowledgments)

---

## 📍 Overview

**Aegis-Chat** is a robust, full-stack, real-time chat application designed with a **security-first** approach. It is built to provide a highly secure and scalable platform for private and group communication, targeting developers who need a reliable, feature-rich, and privacy-focused foundation for their communication platforms.

The project utilizes a modern microservices-inspired architecture, containerized with Docker, ensuring seamless deployment and high maintainability. Key features include advanced security measures like end-to-end encryption for messages, two-factor authentication, file scanning for malware, and comprehensive security logging.

---

## 🛡️ Security Features

Aegis-Chat is engineered with multiple layers of security to protect user data and communication integrity.

| Feature | Technology/Implementation | Description |
| :--- | :--- | :--- |
| **End-to-End Encryption (E2EE)** | `tweetnacl` (Frontend), User Public Keys (Backend) | Messages are encrypted client-side using the **NaCl (Networking and Cryptography library)**, ensuring only the intended recipient can decrypt the content. The backend stores user public keys to facilitate secure key exchange. |
| **Two-Factor Authentication (2FA)** | `speakeasy`, `qrcode` | Users can enable time-based one-time password (TOTP) 2FA, significantly enhancing account security against unauthorized access. |
| **Malware Scanning** | `clamscan` (ClamAV Integration) | All uploaded files are automatically scanned for viruses and malware before being stored and made available to other users, preventing the spread of malicious content. |
| **Comprehensive Security Logging** | `winston`, `winston-mongodb`, Custom `SecurityLogger` | Critical security events (login attempts, session creation/termination, 2FA changes, file uploads) are logged with risk levels and stored in a dedicated MongoDB collection for auditing and monitoring. |
| **CSRF Protection** | `csurf`, `cookie-parser` | Implements token-based Cross-Site Request Forgery (CSRF) protection on all state-changing API routes to mitigate web-based attacks. |
| **Session Management** | JWT, Refresh Tokens, Session Cleanup | Uses secure, short-lived JSON Web Tokens (JWT) for authentication, paired with refresh tokens for seamless session renewal. A scheduled job cleans up old, inactive sessions. |
| **Ephemeral Data Handling** | MongoDB TTL, MinIO Cleanup Job | Messages and associated files are designed to be ephemeral. Messages are stored with a **Time-To-Live (TTL)** index in MongoDB, and a scheduled service proactively deletes corresponding files from MinIO before the message expires. |
| **Secure Headers** | `helmet` | Configures various HTTP headers (e.g., Content Security Policy, X-Content-Type-Options) to protect the application from common web vulnerabilities. |

---

## ⚙️ Technical Stack

Aegis-Chat is built using a modern, full-stack JavaScript ecosystem.

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Backend** | **Node.js, Express.js** | RESTful API and core application logic. |
| **Real-time** | **Socket.IO** | Bidirectional, low-latency communication for chat. |
| **Database** | **MongoDB (Mongoose)** | Flexible, scalable NoSQL data storage. |
| **Frontend** | **React, TypeScript, Vite** | Fast, type-safe, and modern user interface. |
| **Styling/UI** | **MUI (Material-UI)** | Comprehensive and accessible component library. |
| **State Management** | **Zustand** | Simple, fast, and scalable state management for React. |
| **File Storage** | **MinIO** | High-performance, S3-compatible object storage for file uploads. |
| **Containerization** | **Docker, Docker Compose** | Environment setup, orchestration, and deployment. |

---

## 👾 Core Features

Beyond security, Aegis-Chat provides a complete set of features for a modern chat application.

*   **Real-time Messaging:** Instantaneous delivery of private messages using Socket.IO.
*   **File Sharing:** Securely upload and share files, protected by integrated malware scanning.
*   **Message Status:** Includes "delivered" and "read" receipts for reliable communication.
*   **Typing Indicators:** Real-time feedback to users when their contact is typing.
*   **User Management:** Comprehensive user and role management system, including user activation/deactivation and role-based access control (RBAC).
*   **Admin Dashboard:** Dedicated administrative pages for managing users, roles, security logs, and broadcasting messages.
*   **Session Monitoring:** Ability to view and manage active user sessions.
*   **AI Integration:** Dedicated API routes (`/api/ai`) suggesting future integration with large language models or other AI services.

---

## 🏗️ Architecture

Aegis-Chat employs a modular, containerized architecture for high availability and ease of deployment.

The application is split into two main services: `backend` and `frontend`, orchestrated by `docker-compose.yml`.

### Backend Service

The backend is a Node.js/Express server that handles API requests, database interactions, and real-time communication.

*   **API Layer:** Handles authentication, user management, and file operations (protected by CSRF and rate limiting).
*   **Real-time Layer:** Managed by **Socket.IO**, which is integrated directly with the Express HTTP server. It enforces JWT authentication for all websocket connections.
*   **Data Layer:** Uses Mongoose models to interact with MongoDB. Key models include `User`, `Message`, `Role`, and `SecurityLog`.
*   **Services:** Dedicated services for complex operations like `ephemeralData.service.js` (data cleanup) and `malwareScanner.service.js` (ClamAV integration).

### Frontend Service

The frontend is a React application built with TypeScript and Vite, providing a responsive and type-safe user experience.

*   **Routing:** Uses `react-router-dom` with protected routes (`ProtectedRoute.tsx`, `AdminRoute.tsx`) to enforce access control based on user roles and authentication status.
*   **State Management:** Utilizes **Zustand** for global state, managing authentication (`authStore.ts`), user data (`userStore.ts`), and broadcast messages (`broadcastStore.ts`).
*   **Cryptography:** Implements client-side cryptographic utilities (`crypto.ts`, `keySetup.ts`) using `tweetnacl` for E2EE.

### Deployment Stack

The `docker-compose.yml` file defines the complete environment, including:

1.  **`backend`**: The Node.js/Express server.
2.  **`frontend`**: The React application.
3.  **`mongodb`**: The primary database.
4.  **`minio`**: The S3-compatible object storage for files.
5.  **`clamav`**: The anti-virus daemon for file scanning.

---

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### ☑️ Prerequisites

You will need the following software installed on your system:

*   **Git**
*   **Docker**
*   **Docker Compose** (usually bundled with Docker Desktop)

### ⚙️ Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ZAKARIA-ELOMARI/Aegis-Chat.git
    cd Aegis-Chat
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root of the `backend` directory (`Aegis-Chat/backend/.env`) and populate it with necessary configurations. A minimal setup requires:

    ```env
    # --- General ---
    PORT=8000
    NODE_ENV=development
    
    # --- MongoDB (Atlas) ---
    # Replace the placeholder with your MongoDB Atlas connection string.
    # Ensure you replace <password> and <dbname> with your actual credentials.
    MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
    
    # --- JWT/Security ---
    JWT_SECRET=YOUR_VERY_STRONG_JWT_SECRET
    JWT_REFRESH_SECRET=YOUR_VERY_STRONG_REFRESH_SECRET
    
    # --- MinIO (S3-compatible storage) ---
    MINIO_ENDPOINT=minio
    MINIO_PORT=9000
    MINIO_ACCESS_KEY=minioadmin
    MINIO_SECRET_KEY=minioadmin
    MINIO_BUCKET_NAME=aegis-files
    
    # --- ClamAV ---
    CLAMAV_HOST=clamav
    CLAMAV_PORT=3310
    
    # --- Frontend URL (for CORS) ---
    FRONTEND_URL=http://localhost:5173
    ```

3.  **Start the services with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will build the `backend` and `frontend` images, pull the `minio`, and `clamav` images, and start all services in detached mode. **Note:** The `mongodb` service is included in `docker-compose.yml` for local development, but for production or a persistent setup, you should use a managed service like MongoDB Atlas, as configured in the `.env` file.

4.  **Initialize Roles (Optional but Recommended):**
    The application uses role-based access control. You should seed the initial roles (e.g., Admin, User) into the database.
    ```bash
    docker exec -it aegis-chat-backend node seedRoles.js
    ```
    *(Note: The container name may vary, check with `docker ps`)*

### 🤖 Usage

Once all containers are running:

*   **Frontend (Web App):** Access the application at `http://localhost:5173`
*   **Backend (API):** The API is running on `http://localhost:8000`

You can now register a new user and begin testing the secure chat features.

---

## 🔰 Contributing

We welcome contributions! Please see the repository's issues for open tasks or submit a pull request with your improvements.

---

## 🎗 License

This project is licensed under the [MIT License](https://github.com/ZAKARIA-ELOMARI/Aegis-Chat/blob/master/LICENSE).

---

## 🙌 Acknowledgments

*   To the developers of the core technologies: Node.js, React, MongoDB, Socket.IO, MinIO, and ClamAV.
*   To the open-source community for providing the tools that make this project possible.
